from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    """Base API schema that can serialize finance dataclass results directly."""

    model_config = ConfigDict(from_attributes=True)


class CreditTermsRequest(APIModel):
    principal: Decimal = Field(..., gt=0)
    months: int = Field(..., gt=0, le=600)
    annual_rate_initial: Decimal = Field(..., ge=0, le=1)
    annual_rate_after: Decimal | None = Field(None, ge=0, le=1)
    revision_month: int | None = Field(None, gt=0)
    monthly_fee: Decimal = Decimal("0")
    grace_months: int = Field(0, ge=0)
