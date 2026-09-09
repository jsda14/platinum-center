from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple
from src.domain.gym.types import DaySchedule
from src.domain.gym.schemas import GymStatusResponse

def get_bogota_timezone():
    """
    Retorna la zona horaria de Bogotá (UTC-5).
    Soporta pytz, zoneinfo o fallback nativo a timezone(timedelta(hours=-5)),
    garantizando 100% de robustez en Windows sin tzdata y en cualquier entorno.
    """
    try:
        import pytz
        return pytz.timezone("America/Bogota")
    except Exception:
        pass
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("America/Bogota")
    except Exception:
        pass
    return timezone(timedelta(hours=-5))

BOGOTA_TZ = get_bogota_timezone()

DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

DAYS_SPANISH = {
    "monday": "el lunes",
    "tuesday": "el martes",
    "wednesday": "el miércoles",
    "thursday": "el jueves",
    "friday": "el viernes",
    "saturday": "el sábado",
    "sunday": "el domingo",
}

def format_time_12h(time_str: str) -> str:
    """Convierte una hora en formato HH:MM (24h) a formato 12h con AM/PM."""
    if not time_str:
        return ""
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1])
        suffix = "AM" if h < 12 else "PM"
        h12 = h % 12
        if h12 == 0:
            h12 = 12
        return f"{h12}:{m:02d} {suffix}"
    except (ValueError, IndexError):
        return time_str

def parse_time_parts(time_str: str) -> Tuple[int, int]:
    """Extrae (hora, minuto) de un string HH:MM o HH:MM:SS."""
    parts = time_str.strip().split(":")
    return int(parts[0]), int(parts[1])

def find_next_opening_info(
    schedule: Dict[str, DaySchedule],
    current_day_idx: int,
    start_offset: int = 1
) -> Optional[dict]:
    """Encuentra el próximo día activo y hora de apertura a partir de un offset de días."""
    for offset in range(start_offset, 8):
        next_idx = (current_day_idx + offset) % 7
        next_day_name = DAYS_ORDER[next_idx]
        day_schedule = schedule.get(next_day_name)
        if day_schedule and day_schedule.active and day_schedule.open:
            time_12h = format_time_12h(day_schedule.open)
            day_label = "mañana" if offset == 1 else DAYS_SPANISH.get(next_day_name, next_day_name)
            return {
                "day": next_day_name,
                "time": day_schedule.open,
                "time_12h": time_12h,
                "text": f"Abrimos {day_label} a las {time_12h}",
            }
    return None

def calculate_gym_status(
    schedule: Optional[Dict[str, DaySchedule]],
    current_time: Optional[datetime] = None
) -> GymStatusResponse:
    """
    Función de dominio pura que evalúa el estado del gym dado un horario y una fecha/hora de referencia.
    Sin dependencias de frameworks web, bases de datos o HTTP.
    """
    if current_time is None:
        current_time = datetime.now(BOGOTA_TZ)

    if not schedule:
        return GymStatusResponse(
            is_open=False,
            message="Sin horario configurado"
        )

    weekday = current_time.strftime("%A").lower()
    today_schedule = schedule.get(weekday)
    current_day_idx = current_time.weekday()  # 0 = Monday ... 6 = Sunday

    # Si hoy no está activo o no tiene horario definido
    if not today_schedule or not today_schedule.active or not today_schedule.open or not today_schedule.close:
        next_open = find_next_opening_info(schedule, current_day_idx, start_offset=1)
        next_msg = next_open["text"] if next_open else None
        return GymStatusResponse(
            is_open=False,
            message="Hoy el gym está cerrado",
            next_open=next_open,
            next_open_message=next_msg
        )

    opens_at = today_schedule.open
    closes_at = today_schedule.close

    open_h, open_m = parse_time_parts(opens_at)
    close_h, close_m = parse_time_parts(closes_at)

    open_datetime = current_time.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
    close_datetime = current_time.replace(hour=close_h, minute=close_m, second=0, microsecond=0)

    is_open = open_datetime <= current_time <= close_datetime
    minutes_to_close = int((close_datetime - current_time).total_seconds() / 60) if is_open else None

    next_open = None
    if not is_open:
        if current_time < open_datetime:
            # Aún no abre hoy
            time_12h = format_time_12h(opens_at)
            next_open = {
                "day": "today",
                "time": opens_at,
                "time_12h": time_12h,
                "text": f"Abrimos hoy a las {time_12h}",
            }
        else:
            # Ya cerró hoy
            next_open = find_next_opening_info(schedule, current_day_idx, start_offset=1)

    next_msg = next_open["text"] if next_open else None

    return GymStatusResponse(
        is_open=is_open,
        opens_at=opens_at,
        closes_at=closes_at,
        minutes_to_close=minutes_to_close,
        message=None if is_open else (next_msg or "Cerrado"),
        next_open=next_open,
        next_open_message=next_msg
    )
