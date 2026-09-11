import logging
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from src.domain.member.ports import MemberRepository

logger = logging.getLogger(__name__)

class MemberService:
    """
    Servicio de aplicación para operaciones de miembros.
    Orquesta las consultas al repositorio y aplica validaciones de negocio con early returns.
    """

    def __init__(self, repository: MemberRepository):
        self._repository = repository

    def get_my_member(self, profile_id: str) -> Dict[str, Any]:
        logger.info("[USECASE] Obteniendo información de miembro para profile_id=%s", profile_id)
        member = self._repository.get_member_by_profile_id(profile_id)
        if not member:
            logger.warning("[USECASE] Miembro no encontrado para profile_id=%s", profile_id)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Miembro no encontrado"
            )
        return member

    def get_my_day_passes(self, profile_id: str) -> List[Dict[str, Any]]:
        logger.info("[USECASE] Obteniendo day_passes para profile_id=%s", profile_id)
        member = self.get_my_member(profile_id)
        return self._repository.get_active_day_passes(member["id"])

    def get_my_payments(self, profile_id: str) -> List[Dict[str, Any]]:
        logger.info("[USECASE] Obteniendo pagos para profile_id=%s", profile_id)
        member = self.get_my_member(profile_id)
        return self._repository.get_payments(member["id"])

    def create_my_suggestion(self, profile_id: str, message: str) -> Dict[str, Any]:
        logger.info("[USECASE] Registrando sugerencia para profile_id=%s", profile_id)
        if not message or not message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El mensaje de la sugerencia no puede estar vacío"
            )
        member = self.get_my_member(profile_id)
        return self._repository.create_suggestion(member["id"], message.strip())

    def get_my_suggestions(self, profile_id: str) -> List[Dict[str, Any]]:
        logger.info("[USECASE] Obteniendo sugerencias para profile_id=%s", profile_id)
        member = self.get_my_member(profile_id)
        return self._repository.get_suggestions(member["id"])

    def get_or_create_member(self, profile_id: str) -> Dict[str, Any]:
        logger.info("[USECASE] Obteniendo o creando miembro para profile_id=%s", profile_id)
        return self._repository.get_or_create_member_by_profile_id(profile_id)
