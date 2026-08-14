from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CMSPageListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    block_count: int = 0
    updated_at: datetime
    model_config = {"from_attributes": True}
