from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.schemas.products import ProductOut


class WishlistItemOut(BaseModel):
    id: UUID
    product_id: UUID
    created_at: datetime
    product: ProductOut
    model_config = {"from_attributes": True}
