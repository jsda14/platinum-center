import logging
from typing import Dict, Optional
from src.domain.gym.types import DaySchedule
from src.domain.gym.ports import GymConfigRepository
from src.infrastructure.supabase.client import supabase_client

logger = logging.getLogger(__name__)

class SupabaseGymConfigRepository(GymConfigRepository):
    """Implementación de GymConfigRepository usando Supabase."""

    def __init__(self, client=None):
        self._client = client or supabase_client

    def get_schedule(self) -> Optional[Dict[str, DaySchedule]]:
        try:
            logger.info("[REPO] Consultando schedule de gym_config en Supabase")
            res = self._client.table("gym_config")\
                .select("schedule")\
                .limit(1)\
                .execute()

            if not res.data:
                logger.warning("[REPO] No se encontraron registros en gym_config")
                return None

            raw_schedule = res.data[0].get("schedule")
            if not raw_schedule or not isinstance(raw_schedule, dict):
                logger.warning("[REPO] La columna schedule no contiene un diccionario válido")
                return None

            result: Dict[str, DaySchedule] = {}
            for day_key, day_data in raw_schedule.items():
                if not isinstance(day_data, dict):
                    continue

                active = False
                if "active" in day_data:
                    active = bool(day_data.get("active"))
                elif "is_open" in day_data:
                    active = bool(day_data.get("is_open"))

                open_time = str(day_data.get("open") or "")
                close_time = str(day_data.get("close") or "")

                result[day_key.lower()] = DaySchedule(
                    open=open_time,
                    close=close_time,
                    active=active,
                )

            return result

        except Exception as e:
            logger.error("[REPO] Error inesperado al consultar gym_config: %s", str(e), exc_info=True)
            return None
