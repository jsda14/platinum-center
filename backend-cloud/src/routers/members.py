import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from src.domain.member.schemas import (
    MemberResponse,
    MemberDayPassResponse,
    PaymentResponse,
    CreateSuggestionRequest,
    SuggestionResponse,
    GetOrCreateMemberRequest,
)
from src.application.member.member_service import MemberService
from src.infrastructure.supabase.member_repository import SupabaseMemberRepository
from src.api.dependencies import get_authenticated_profile_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/members", tags=["members"])

def get_member_service() -> MemberService:
    """Inyección de dependencias para MemberService (DIP)."""
    repository = SupabaseMemberRepository()
    return MemberService(repository=repository)

@router.get("/me", response_model=MemberResponse)
async def get_my_member(
    profile_id: str = Depends(get_authenticated_profile_id),
    service: MemberService = Depends(get_member_service)
):
    """Devuelve el miembro y su perfil asociado al usuario autenticado."""
    try:
        logger.info("[ROUTER] GET /members/me para profile_id=%s", profile_id)
        return service.get_my_member(profile_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/me: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener datos del miembro: {str(e)}"
        )

@router.get("/me/day-passes", response_model=List[MemberDayPassResponse])
async def get_my_day_passes(
    profile_id: str = Depends(get_authenticated_profile_id),
    service: MemberService = Depends(get_member_service)
):
    """Devuelve los day_passes activos del miembro autenticado."""
    try:
        logger.info("[ROUTER] GET /members/me/day-passes para profile_id=%s", profile_id)
        return service.get_my_day_passes(profile_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/me/day-passes: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pases diarios: {str(e)}"
        )

@router.get("/me/payments", response_model=List[PaymentResponse])
async def get_my_payments(
    profile_id: str = Depends(get_authenticated_profile_id),
    service: MemberService = Depends(get_member_service)
):
    """Devuelve el historial de pagos del miembro autenticado."""
    try:
        logger.info("[ROUTER] GET /members/me/payments para profile_id=%s", profile_id)
        return service.get_my_payments(profile_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/me/payments: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial de pagos: {str(e)}"
        )

@router.post("/me/suggestions", response_model=SuggestionResponse, status_code=status.HTTP_201_CREATED)
async def create_my_suggestion(
    data: CreateSuggestionRequest,
    profile_id: str = Depends(get_authenticated_profile_id),
    service: MemberService = Depends(get_member_service)
):
    """Registra una sugerencia del miembro autenticado."""
    try:
        logger.info("[ROUTER] POST /members/me/suggestions para profile_id=%s", profile_id)
        return service.create_my_suggestion(profile_id, data.message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en POST /members/me/suggestions: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar sugerencia: {str(e)}"
        )

@router.get("/me/suggestions", response_model=List[SuggestionResponse])
async def get_my_suggestions(
    profile_id: str = Depends(get_authenticated_profile_id),
    service: MemberService = Depends(get_member_service)
):
    """Devuelve las sugerencias del miembro autenticado."""
    try:
        logger.info("[ROUTER] GET /members/me/suggestions para profile_id=%s", profile_id)
        return service.get_my_suggestions(profile_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/me/suggestions: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener sugerencias: {str(e)}"
        )

@router.post("/get-or-create")
async def get_or_create_member(
    data: GetOrCreateMemberRequest,
    service: MemberService = Depends(get_member_service)
):
    """Endpoint legado para obtener o crear el miembro por profile_id."""
    try:
        logger.info("[ROUTER] POST /members/get-or-create para profile_id=%s", data.profile_id)
        return service.get_or_create_member(data.profile_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en POST /members/get-or-create: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar miembro: {str(e)}"
        )
