import logging
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from src.infrastructure.supabase.client import supabase_client
from src.infrastructure.supabase.auth import get_current_user, get_current_user_role
from src.domain.profile.schemas import (
    UpdateProfileRequest,
    UpdateRoleRequest,
    ProfileResponse,
    AllUsersResponse,
    StatusOkResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["profiles"])


@router.get("/profiles/me", response_model=ProfileResponse)
async def get_my_profile(authorization: Optional[str] = Header(None)):
    """Devuelve el perfil del usuario autenticado."""
    try:
        user = get_current_user(authorization)
        if not user or not user.get("id"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")

        logger.info("[ROUTER] Consultando perfil de usuario %s", user["id"])
        res = (
            supabase_client.table("profiles")
            .select("id, full_name, phone, email, role")
            .eq("id", user["id"])
            .limit(1)
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al consultar perfil propio: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}",
        )


@router.put("/profiles/me", response_model=StatusOkResponse)
async def update_my_profile(
    data: UpdateProfileRequest,
    authorization: Optional[str] = Header(None),
):
    """Actualiza nombre y teléfono del usuario autenticado."""
    try:
        user = get_current_user(authorization)
        if not user or not user.get("id"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")

        updates = {}
        if data.full_name is not None:
            updates["full_name"] = data.full_name
        if data.phone is not None:
            updates["phone"] = data.phone

        if not updates:
            return {"status": "ok"}

        logger.info("[ROUTER] Actualizando perfil propio de usuario %s", user["id"])
        supabase_client.table("profiles").update(updates).eq("id", user["id"]).execute()

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al actualizar perfil propio: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}",
        )


@router.put("/admin/profiles/{profile_id}", response_model=StatusOkResponse)
async def update_member_profile(
    profile_id: str,
    data: UpdateProfileRequest,
    authorization: Optional[str] = Header(None),
):
    """Admin o recepcionista actualiza perfil de un miembro."""
    try:
        role = get_current_user_role(authorization)
        if role not in ["super_admin", "receptionist"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")

        updates = {}
        if data.full_name is not None:
            updates["full_name"] = data.full_name
        if data.phone is not None:
            updates["phone"] = data.phone
        if data.email is not None:
            updates["email"] = data.email

        if not updates:
            return {"status": "ok"}

        logger.info("[ROUTER] Actualizando perfil de miembro %s por admin/recepcionista", profile_id)
        supabase_client.table("profiles").update(updates).eq("id", profile_id).execute()

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al actualizar perfil de miembro: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}",
        )


@router.put("/admin/profiles/{profile_id}/role", response_model=StatusOkResponse)
async def update_user_role(
    profile_id: str,
    data: UpdateRoleRequest,
    authorization: Optional[str] = Header(None),
):
    """Solo super_admin cambia el rol de un usuario."""
    try:
        role = get_current_user_role(authorization)
        if role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo super_admin puede cambiar roles",
            )

        logger.info("[ROUTER] Actualizando rol de usuario %s a %s", profile_id, data.role)
        supabase_client.table("profiles").update({"role": data.role}).eq("id", profile_id).execute()

        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al actualizar rol de usuario: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}",
        )


@router.get("/admin/users", response_model=AllUsersResponse)
async def get_all_users(authorization: Optional[str] = Header(None)):
    """Admin o recepcionista lista todos los usuarios."""
    try:
        role = get_current_user_role(authorization)
        if role not in ["super_admin", "receptionist"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")

        logger.info("[ROUTER] Consultando todos los usuarios (profiles)")
        res = (
            supabase_client.table("profiles")
            .select("id, full_name, email, phone, role")
            .order("full_name", desc=False)
            .execute()
        )

        return {"users": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al consultar todos los usuarios: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}",
        )
