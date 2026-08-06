from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class CouponBase(BaseModel):
    code: str
    description: str = ""
    percent_off: float | None = None
    fixed_amount: float | None = None
    min_subtotal: float = 0.0
    max_uses: int | None = None
    max_uses_per_user: int | None = None
    active: bool = True
    starts_at: datetime | None = None
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def _check_discount_type(self):
        if (self.percent_off is None) == (self.fixed_amount is None):
            raise ValueError("Set either percent_off or fixed_amount, not both")
        return self


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    """All fields optional so a partial update can touch a single column.

    ``None`` means "leave unchanged" — only set the fields being edited.
    """

    code: str | None = None
    description: str | None = None
    percent_off: float | None = None
    fixed_amount: float | None = None
    min_subtotal: float | None = None
    max_uses: int | None = None
    max_uses_per_user: int | None = None
    active: bool | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def _check_discount_type(self):
        if self.percent_off is not None and self.fixed_amount is not None:
            raise ValueError("Set either percent_off or fixed_amount, not both")
        return self


class CouponOut(BaseModel):
    id: UUID
    code: str
    description: str
    percent_off: float | None
    fixed_amount: float | None
    min_subtotal: float
    max_uses: int | None
    used_count: int
    max_uses_per_user: int | None
    active: bool
    starts_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
