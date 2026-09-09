from typing import List, Optional
from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    duration_days: Optional[int] = None
    duration: Optional[int] = None
    price: float
    description: Optional[str] = None
    active: Optional[bool] = True
    is_active: Optional[bool] = True
    created_at: Optional[str] = None


class ActivePlansResponse(BaseModel):
    plans: List[PlanResponse]
