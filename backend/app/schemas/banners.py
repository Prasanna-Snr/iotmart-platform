from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class BannerCreate(BaseModel):
    title: str
    subtitle: str = ""
    cta_text: str = ""
    cta_link: str = ""
    image: str = ""
    active: bool = True
    order: int = 0


class BannerUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    cta_text: str | None = None
    cta_link: str | None = None
    image: str | None = None
    active: bool | None = None
    order: int | None = None


class BannerOut(BaseModel):
    id: UUID
    title: str
    subtitle: str
    cta_text: str
    cta_link: str
    image: str
    active: bool
    order: int
    created_at: datetime
    model_config = {"from_attributes": True}
