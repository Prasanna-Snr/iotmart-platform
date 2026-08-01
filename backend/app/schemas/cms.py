from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CMSPageCreate(BaseModel):
    title: str
    slug: str
    status: str = "draft"
    blocks: list = []


class CMSPageUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    status: str | None = None
    blocks: list | None = None


class CMSPageOut(BaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    blocks: list
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class CMSPageListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    block_count: int = 0
    updated_at: datetime
    model_config = {"from_attributes": True}
