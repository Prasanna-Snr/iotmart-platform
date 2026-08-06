from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AddressCreate(BaseModel):
    label: str = "Home"
    full_name: str
    phone: str
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    zip_code: str = ""
    country: str = ""
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = None
    full_name: str | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    is_default: bool | None = None


class AddressOut(BaseModel):
    id: UUID
    user_id: UUID
    label: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: str
    city: str
    state: str
    zip_code: str
    country: str
    is_default: bool
    created_at: datetime
    model_config = {"from_attributes": True}
