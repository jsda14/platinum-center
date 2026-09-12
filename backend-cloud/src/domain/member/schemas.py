from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ProfileSummary(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None

class MemberResponse(BaseModel):
    id: str
    profile_id: Optional[str] = None
    zkteco_user_id: Optional[str] = None
    card_no: Optional[str] = None
    status: str
    plan: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    profiles: Optional[ProfileSummary] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MemberDayPassResponse(BaseModel):
    id: str
    member_id: Optional[str] = None
    payment_id: Optional[str] = None
    days_total: int = 15
    days_used: int = 0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    member_id: Optional[str] = None
    amount: float
    method: Optional[str] = None
    plan: Optional[str] = None
    transaction_id: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[str] = None
    plan_start_date: Optional[str] = None
    plan_end_date: Optional[str] = None
    created_at: Optional[str] = None

class CreateSuggestionRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Texto de la sugerencia")

class SuggestionResponse(BaseModel):
    id: str
    member_id: Optional[str] = None
    message: str
    status: str = "pending"
    response: Optional[str] = None
    created_at: Optional[str] = None

class GetOrCreateMemberRequest(BaseModel):
    profile_id: str

class CreateGroupRequest(BaseModel):
    name: Optional[str] = None
    emails: List[str]

class GroupPaymentIntentRequest(BaseModel):
    order_id: str
    plan_slug: str
    amount: float
    member_ids: List[str]

class GroupPaymentAdminRequest(BaseModel):
    member_ids: List[str]
    plan_slug: str
    method: str  # cash, nequi, daviplata

