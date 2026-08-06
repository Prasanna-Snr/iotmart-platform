from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.models import User, RewardTransaction
from app.schemas.rewards import RewardsOut, RewardTransactionOut
from app.security import get_current_user

router = APIRouter()

POINTS_PER_RS = 100


def points_for_total(total: float) -> int:
    """1 point per Rs. 100 spent, rounded down."""
    return int(total // POINTS_PER_RS)


@router.get("", response_model=RewardsOut)
async def get_rewards(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    result = await db.execute(
        select(RewardTransaction).where(RewardTransaction.user_id == current.id)
        .order_by(RewardTransaction.created_at.desc())
    )
    history = [RewardTransactionOut.model_validate(t) for t in result.scalars().all()]
    balance = sum(t.points for t in history)
    return RewardsOut(balance=balance, history=history)
