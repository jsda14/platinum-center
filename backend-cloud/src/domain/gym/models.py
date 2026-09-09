# Backwards-compatible alias for types
from src.domain.gym.types import DaySchedule, GymStatusData
from src.domain.gym.schemas import GymStatusResponse as GymStatus

__all__ = ["DaySchedule", "GymStatusData", "GymStatus"]
