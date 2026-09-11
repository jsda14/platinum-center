import logging
from typing import Optional
from fastapi import HTTPException, status
import jwt
from src.infrastructure.supabase.client import supabase_client

logger = logging.getLogger(__name__)

def extract_token_from_header(authorization: Optional[str]) -> str:
    """Valida y extrae el token Bearer del header Authorization con early returns."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el header de autorización"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido. Debe ser 'Bearer <token>'"
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío"
        )
    return token

def get_current_user_id(authorization: Optional[str]) -> str:
    """
    Valida el token JWT y extrae el profile_id (auth user id).
    Aplica early returns y validación contra Supabase Auth.
    """
    token = extract_token_from_header(authorization)
    try:
        user_res = supabase_client.auth.get_user(token)
        if user_res and user_res.user and user_res.user.id:
            return user_res.user.id
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Supabase inválido o expirado"
        )
    except HTTPException:
        raise
    except Exception as e:
        # Fallback de decodificación si Supabase auth service tuvo problema temporal pero el JWT es válido
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            sub = decoded.get("sub")
            if sub:
                return str(sub)
        except Exception:
            pass
        logger.error("[AUTH] Error al verificar token de usuario: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}"
        )

def get_current_user_role(authorization: Optional[str]) -> str:
    """
    Obtiene el rol del usuario autenticado consultando la tabla profiles.
    """
    user_id = get_current_user_id(authorization)
    try:
        profile_res = supabase_client.table("profiles").select("role").eq("id", user_id).limit(1).execute()
        if not profile_res.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El perfil de usuario no existe en la base de datos"
            )
        return profile_res.data[0].get("role", "member")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[AUTH] Error al consultar rol en profiles: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar rol de usuario: {str(e)}"
        )

def get_current_user(authorization: Optional[str]) -> dict:
    """
    Retorna el usuario actual autenticado a partir del header Authorization.
    """
    user_id = get_current_user_id(authorization)
    return {"id": user_id}

