from abc import ABC, abstractmethod
from typing import Dict, Optional
from src.domain.gym.types import DaySchedule

class GymConfigRepository(ABC):
    """Puerto de repositorio para la configuración del gimnasio."""

    @abstractmethod
    def get_schedule(self) -> Optional[Dict[str, DaySchedule]]:
        """Obtiene el horario semanal del gimnasio mapeado por día en minúsculas."""
        pass
