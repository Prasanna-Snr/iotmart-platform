from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class OrderItemIn(BaseModel):
    """Only product identity + quantity are accepted. Prices are always
    read from the database server-side, never trusted from the client."""

    product_id: str
    product_name: str = ""
    product_image: str = ""
    quantity: int


class ShippingAddressIn(BaseModel):
    first_name: str
    last_name: str
    phone: str
    address_line1: str
    address_line2: str = ""
    city: str
    state: str
    zip_code: str = ""
    country: str = ""


class OrderCreate(BaseModel):
    items: list[OrderItemIn]
    shipping_address: ShippingAddressIn
    payment_method: str = "cod"
    notes: str | None = None


class OrderStatusUpdate(BaseModel):
    status: str


class OrderOut(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID | None = None
    customer_email: str | None = None
    items: list
    shipping_address: dict
    status: str
    subtotal: float
    shipping_cost: float
    total: float
    payment_method: str
    payment_status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
