from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    image: str = ""


class CategoryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    image: str | None = None


class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str
    image: str
    product_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class BrandCreate(BaseModel):
    name: str
    slug: str
    logo: str | None = None


class BrandUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    logo: str | None = None


class BrandOut(BaseModel):
    id: UUID
    name: str
    slug: str
    logo: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
