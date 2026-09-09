from typing import List, Optional
from pydantic import BaseModel


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    role: str  # super_admin, receptionist, member


class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class AllUsersResponse(BaseModel):
    users: List[ProfileResponse]


class StatusOkResponse(BaseModel):
    status: str = "ok"
