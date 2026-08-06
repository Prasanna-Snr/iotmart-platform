from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.models import User, SavedAddress
from app.schemas.addresses import AddressCreate, AddressUpdate, AddressOut
from app.security import get_current_user

router = APIRouter()


async def _clear_default(db: AsyncSession, user_id, except_id=None) -> None:
    query = update(SavedAddress).where(SavedAddress.user_id == user_id).values(is_default=False)
    if except_id:
        query = query.where(SavedAddress.id != except_id)
    await db.execute(query)


async def _get_owned(db: AsyncSession, user_id, address_id) -> SavedAddress:
    row = (await db.execute(select(SavedAddress).where(
        SavedAddress.id == address_id,
        SavedAddress.user_id == user_id,
    ))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    return row


@router.get("", response_model=list[AddressOut])
async def list_addresses(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(
        select(SavedAddress).where(SavedAddress.user_id == current.id)
        .order_by(SavedAddress.is_default.desc(), SavedAddress.created_at.desc())
    )
    return [AddressOut.model_validate(a) for a in result.scalars().all()]


@router.post("", response_model=AddressOut, status_code=201)
async def create_address(body: AddressCreate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    if body.is_default:
        await _clear_default(db, current.id)
    address = SavedAddress(user_id=current.id, **body.model_dump())
    db.add(address)
    await db.flush()
    return AddressOut.model_validate(address)


@router.put("/{id}", response_model=AddressOut)
async def update_address(id: str, body: AddressUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    address = await _get_owned(db, current.id, id)
    data = body.model_dump(exclude_none=True)
    if data.get("is_default"):
        await _clear_default(db, current.id, except_id=address.id)
    for field, value in data.items():
        setattr(address, field, value)
    return AddressOut.model_validate(address)


@router.delete("/{id}", status_code=204)
async def delete_address(id: str, db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    address = await _get_owned(db, current.id, id)
    await db.delete(address)
