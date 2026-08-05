from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class RewardTransactionOut(BaseModel):
    id: UUID
    user_id: UUID
    points: int
    description: str
    order_id: UUID | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class RewardsOut(BaseModel):
    balance: int
    history: list[RewardTransactionOut]
