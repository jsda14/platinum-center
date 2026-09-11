import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from src.domain.gym.schemas import GymStatusResponse
from src.application.gym.get_gym_status_usecase import GetGymStatusUseCase
from src.infrastructure.supabase.gym_repository import SupabaseGymConfigRepository
from src.infrastructure.supabase.client import supabase_client
from src.infrastructure.supabase.auth import get_current_user_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gym", tags=["gym"])

def get_gym_status_usecase() -> GetGymStatusUseCase:
    """Inyección de dependencias para el caso de uso (DIP)."""
    repository = SupabaseGymConfigRepository()
    return GetGymStatusUseCase(repository=repository)

@router.get("/status", response_model=GymStatusResponse)
async def get_gym_status(
    use_case: GetGymStatusUseCase = Depends(get_gym_status_usecase)
):
    """
    Devuelve si el gym está abierto o cerrado según horario configurado.
    Incluye hora de apertura y cierre del día actual y minutos para cerrar.
    """
    try:
        logger.info("[ROUTER] Consultando estado del gimnasio")
        return use_case.execute()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error inesperado en get_gym_status: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}"
        )


class GymConfigRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    schedule: Optional[Dict[str, Any]] = None
    capacity: Optional[int] = None
    opening_days: Optional[List[str]] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None


@router.get("/config")
async def get_gym_config():
    """Obtiene la configuración actual del gimnasio (público)."""
    try:
        res = supabase_client.table("gym_config").select("*").limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuración no encontrada")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al consultar configuración: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener configuración: {str(e)}"
        )


@router.put("/config")
async def update_gym_config(data: GymConfigRequest, authorization: Optional[str] = Header(None)):
    """Actualiza la configuración del gimnasio (solo super_admin)."""
    role = get_current_user_role(authorization)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        existing = supabase_client.table("gym_config").select("id").limit(1).execute()
        if existing.data:
            res = supabase_client.table("gym_config")\
                .update(update_data)\
                .eq("id", existing.data[0]["id"])\
                .execute()
        else:
            res = supabase_client.table("gym_config").insert(update_data).execute()
        
        return {"status": "ok", "config": res.data[0] if res.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al actualizar configuración: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar configuración: {str(e)}"
        )

