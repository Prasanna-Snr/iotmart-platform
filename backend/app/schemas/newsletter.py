from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class NewsletterSubscribeIn(BaseModel):
    email: EmailStr


class NewsletterSubscriberOut(BaseModel):
    id: UUID
    email: str
    subscribed: bool
    created_at: datetime
    model_config = {"from_attributes": True}
