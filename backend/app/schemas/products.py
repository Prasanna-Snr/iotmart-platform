from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.schemas.catalog import CategoryOut, BrandOut


class ReviewCreate(BaseModel):
    rating: int
    title: str
    body: str = ""


class ReviewOut(BaseModel):
    id: UUID
    product_id: UUID
    user_id: UUID
    user_name: str
    user_avatar: str | None = None
    rating: int
    title: str
    body: str
    verified: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    slug: str
    sku: str
    description: str = ""
    short_description: str = ""
    price: float
    original_price: float | None = None
    currency: str = "USD"
    images: list[str] = []
    tags: list[str] = []
    specs: list[dict] = []
    stock: int = 0
    featured: bool = False
    new_arrival: bool = False
    best_seller: bool = False
    in_stock: bool = True
    weight: str | None = None
    dimensions: str | None = None
    related_product_ids: list[str] = []
    category_id: UUID
    brand_id: UUID | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    short_description: str | None = None
    price: float | None = None
    original_price: float | None = None
    images: list[str] | None = None
    tags: list[str] | None = None
    specs: list[dict] | None = None
    stock: int | None = None
    featured: bool | None = None
    new_arrival: bool | None = None
    best_seller: bool | None = None
    in_stock: bool | None = None
    category_id: UUID | None = None
    brand_id: UUID | None = None


class ProductOut(BaseModel):
    id: UUID
    name: str
    slug: str
    sku: str
    description: str
    short_description: str
    price: float
    original_price: float | None = None
    currency: str
    images: list
    tags: list
    specs: list
    stock: int
    rating: float
    review_count: int
    featured: bool
    new_arrival: bool
    best_seller: bool
    in_stock: bool
    weight: str | None = None
    dimensions: str | None = None
    related_product_ids: list
    category: CategoryOut | None = None
    brand: BrandOut | None = None
    reviews: list[ReviewOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
