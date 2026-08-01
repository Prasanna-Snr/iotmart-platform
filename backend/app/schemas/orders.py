from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class OrderItemIn(BaseModel):
    product_id: str
    product_name: str
    product_image: str = ""
    price: float
    quantity: int
    subtotal: float


class ShippingAddressIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    zip_code: str
    country: str


class OrderCreate(BaseModel):
    items: list[OrderItemIn]
    shipping_address: ShippingAddressIn
    payment_method: str = "card"
    notes: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderOut(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID | None = None
    items: list
    shipping_address: dict
    status: str
    subtotal: float
    shipping_cost: float
    tax: float
    total: float
    payment_method: str
    payment_status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
