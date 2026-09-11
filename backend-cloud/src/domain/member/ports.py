from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class MemberRepository(ABC):
    """Puerto de repositorio para la gestión de miembros y sus datos asociados."""

    @abstractmethod
    def get_member_by_profile_id(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Busca el miembro y su perfil correspondiente por profile_id."""
        pass

    @abstractmethod
    def get_or_create_member_by_profile_id(self, profile_id: str) -> Dict[str, Any]:
        """Obtiene o crea un registro de miembro para el profile_id."""
        pass

    @abstractmethod
    def get_active_day_passes(self, member_id: str) -> List[Dict[str, Any]]:
        """Obtiene los pases diarios activos de un miembro."""
        pass

    @abstractmethod
    def get_payments(self, member_id: str) -> List[Dict[str, Any]]:
        """Obtiene el historial de pagos de un miembro."""
        pass

    @abstractmethod
    def create_suggestion(self, member_id: str, message: str) -> Dict[str, Any]:
        """Registra una nueva sugerencia para el miembro."""
        pass

    @abstractmethod
    def get_suggestions(self, member_id: str) -> List[Dict[str, Any]]:
        """Obtiene las sugerencias enviadas por el miembro."""
        pass
