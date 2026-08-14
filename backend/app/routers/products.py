from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Product, ProductReview, User, Category, Brand
from app.schemas.products import ProductCreate, ProductUpdate, ProductOut, ProductListOut, ProductListItem, ReviewCreate, ReviewOut
from app.security import get_current_user, get_current_admin
from app.audit import record as audit

router = APIRouter()


@router.get("", response_model=ProductListOut)
async def list_products(
    db: AsyncSession = Depends(get_db),
    category: str | None = Query(None),
    brand: str | None = Query(None),
    search: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    featured: bool | None = Query(None),
    in_stock: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    conditions = []
    if category:
        cat = (await db.execute(select(Category).where(Category.slug == category))).scalar_one_or_none()
        if cat:
            conditions.append(Product.category_id == cat.id)
    if brand:
        b = (await db.execute(select(Brand).where(Brand.slug == brand))).scalar_one_or_none()
        if b:
            conditions.append(Product.brand_id == b.id)
    if search:
        conditions.append(or_(
            Product.search_vector.op("@@")(func.plainto_tsquery("english", search)),
            Product.name.ilike(f"%{search}%"),
            Product.description.ilike(f"%{search}%"),
        ))
    if min_price is not None:
        conditions.append(Product.price >= min_price)
    if max_price is not None:
        conditions.append(Product.price <= max_price)
    if featured is not None:
        conditions.append(Product.featured == featured)
    if in_stock is not None:
        conditions.append(Product.in_stock == in_stock)

    base_q = select(Product).where(*conditions)
    total = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()

    q = (base_q.options(selectinload(Product.category), selectinload(Product.brand))
         .order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
    products = (await db.execute(q)).scalars().all()
    return ProductListOut(items=[ProductListItem.model_validate(p) for p in products], total=total, page=page, page_size=page_size)


@router.get("/id/{id}", response_model=ProductOut)
async def get_product_by_id(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.brand), selectinload(Product.reviews))
        .where(Product.id == id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.model_validate(product)


@router.get("/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.brand), selectinload(Product.reviews))
        .where(Product.slug == slug)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.model_validate(product)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    if (await db.execute(select(Product).where(Product.slug == body.slug))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    product = Product(**body.model_dump())
    db.add(product)
    await db.flush()
    product.search_vector = func.to_tsvector(
        "english",
        product.name + " " + (product.short_description or "") + " " + (product.description or "") + " " + " ".join(product.tags or []),
    )
    await audit(db, admin, "product.create", "product", product.id, product.slug)
    # Re-fetch with all relationships eagerly loaded
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.brand), selectinload(Product.reviews))
        .where(Product.id == product.id)
    )
    product = result.scalar_one()
    return ProductOut.model_validate(product)


@router.put("/{id}", response_model=ProductOut)
async def update_product(id: str, body: ProductUpdate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    product = (await db.execute(select(Product).where(Product.id == id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.flush()
    product.search_vector = func.to_tsvector(
        "english",
        product.name + " " + (product.short_description or "") + " " + (product.description or "") + " " + " ".join(product.tags or []),
    )
    await audit(db, admin, "product.update", "product", product.id, product.slug)
    # Re-fetch with all relationships eagerly loaded
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.category), selectinload(Product.brand), selectinload(Product.reviews))
        .where(Product.id == product.id)
    )
    product = result.scalar_one()
    return ProductOut.model_validate(product)


@router.delete("/{id}", status_code=204)
async def delete_product(id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    product = (await db.execute(select(Product).where(Product.id == id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await audit(db, admin, "product.delete", "product", product.id, product.slug)
    await db.delete(product)


@router.post("/{id}/reviews", response_model=ReviewOut, status_code=201)
async def add_review(id: str, body: ReviewCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    product = (await db.execute(select(Product).where(Product.id == id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = (await db.execute(
        select(ProductReview).where(
            ProductReview.user_id == current.id,
            ProductReview.product_id == id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You have already reviewed this product.")
    review = ProductReview(product_id=id, user_id=current.id, user_name=current.name,
                           user_avatar=current.avatar, **body.model_dump())
    db.add(review)
    await db.flush()
    product.review_count = (product.review_count or 0) + 1
    ratings = [(r[0]) for r in (await db.execute(select(ProductReview.rating).where(ProductReview.product_id == id))).all()]
    product.rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    return ReviewOut.model_validate(review)
