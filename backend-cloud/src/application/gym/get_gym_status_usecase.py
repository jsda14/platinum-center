import logging
from datetime import datetime
from typing import Optional
from src.domain.gym.schemas import GymStatusResponse
from src.domain.gym.ports import GymConfigRepository
from src.domain.gym.services import calculate_gym_status

logger = logging.getLogger(__name__)

class GetGymStatusUseCase:
    """
    Caso de uso: Consulta el estado del gimnasio (abierto/cerrado, minutos para cierre).
    Orquesta la obtención del horario desde el repositorio y aplica las reglas de dominio.
    No conoce detalles de FastAPI ni llamadas HTTP.
    """

    def __init__(self, repository: GymConfigRepository):
        self._repository = repository

    def execute(self, current_time: Optional[datetime] = None) -> GymStatusResponse:
        logger.info("[USECASE] Ejecutando GetGymStatusUseCase")
        schedule = self._repository.get_schedule()
        return calculate_gym_status(schedule=schedule, current_time=current_time)
