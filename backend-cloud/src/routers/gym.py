import logging
from fastapi import APIRouter, Depends, HTTPException, status
from src.domain.gym.schemas import GymStatusResponse
from src.application.gym.get_gym_status_usecase import GetGymStatusUseCase
from src.infrastructure.supabase.gym_repository import SupabaseGymConfigRepository

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
