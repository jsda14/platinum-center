from typing import Optional
from fastapi import Header
from src.infrastructure.supabase.auth import get_current_user_id, get_current_user_role

async def get_authenticated_profile_id(authorization: Optional[str] = Header(None)) -> str:
    """Extrae el profile_id del usuario autenticado."""
    return get_current_user_id(authorization)

async def get_authenticated_user_role(authorization: Optional[str] = Header(None)) -> str:
    """Extrae el rol del usuario autenticado."""
    return get_current_user_role(authorization)
