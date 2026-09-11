from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass(frozen=True)
class DaySchedule:
    open: str
    close: str
    active: bool

@dataclass(frozen=True)
class GymStatusData:
    is_open: bool
    opens_at: Optional[str] = None
    closes_at: Optional[str] = None
    minutes_to_close: Optional[int] = None
    message: Optional[str] = None
    next_open: Optional[Dict[str, Any]] = None
    next_open_message: Optional[str] = None
