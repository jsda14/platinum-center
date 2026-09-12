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
    CreateGroupRequest,
)
from src.application.member.member_service import MemberService
from src.infrastructure.supabase.member_repository import SupabaseMemberRepository
from src.infrastructure.supabase.client import supabase_client
from src.infrastructure.supabase.auth import get_current_user, get_current_member
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

@router.get("/validate-email")
async def validate_member_email(email: str, authorization: Optional[str] = Header(None)):
    """Valida si un correo corresponde a un socio registrado en la plataforma."""
    try:
        get_current_user(authorization)
        email_clean = email.strip().lower()
        if not email_clean:
            return {"valid": False}

        profile_res = (
            supabase_client.table("profiles")
            .select("id, full_name, email")
            .ilike("email", email_clean)
            .execute()
        )

        if not profile_res.data:
            return {"valid": False}

        profile = profile_res.data[0]
        member_res = (
            supabase_client.table("members")
            .select("id")
            .eq("profile_id", profile["id"])
            .execute()
        )

        if not member_res.data:
            return {"valid": False}

        return {
            "valid": True,
            "full_name": profile.get("full_name") or "Miembro",
            "member_id": member_res.data[0]["id"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/validate-email: %s", str(e))
        return {"valid": False}

@router.get("/me/groups")
async def get_my_groups(authorization: Optional[str] = Header(None)):
    """Devuelve los grupos guardados del miembro autenticado."""
    try:
        member = get_current_member(authorization)
        groups_res = (
            supabase_client.table("member_groups")
            .select("id, name, created_at, member_group_members(id, member_id, members(id, profiles:profile_id(full_name, email)))")
            .eq("created_by", member["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return {"groups": groups_res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en GET /members/me/groups: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener grupos del miembro: {str(e)}"
        )

@router.post("/me/groups")
async def create_group(data: CreateGroupRequest, authorization: Optional[str] = Header(None)):
    """Crea un grupo para membresía compartida asociado al miembro autenticado."""
    try:
        member = get_current_member(authorization)

        invalid_emails = []
        member_ids = [member["id"]]

        for email in data.emails:
            email_clean = email.strip().lower()
            if not email_clean:
                continue

            profile_res = (
                supabase_client.table("profiles")
                .select("id")
                .ilike("email", email_clean)
                .execute()
            )

            if not profile_res.data:
                invalid_emails.append(email)
                continue

            profile_id = profile_res.data[0]["id"]
            member_res = (
                supabase_client.table("members")
                .select("id")
                .eq("profile_id", profile_id)
                .execute()
            )

            if not member_res.data:
                invalid_emails.append(email)
                continue

            mid = member_res.data[0]["id"]
            if mid not in member_ids:
                member_ids.append(mid)

        if invalid_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Los siguientes correos no están registrados o no tienen membresía: {', '.join(invalid_emails)}"
            )

        if len(member_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un grupo debe tener al menos 2 personas registradas."
            )

        group_name = data.name.strip() if data.name and data.name.strip() else f"Grupo de {len(member_ids)} personas"
        group_res = (
            supabase_client.table("member_groups")
            .insert({
                "name": group_name,
                "created_by": member["id"]
            })
            .execute()
        )

        if not group_res.data:
            raise HTTPException(status_code=500, detail="Error al crear el grupo")

        group_id = group_res.data[0]["id"]

        for mid in member_ids:
            supabase_client.table("member_group_members").insert({
                "grupo_id": group_id,
                "member_id": mid
            }).execute()

        return {"group_id": group_id, "total_members": len(member_ids)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error en POST /members/me/groups: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear grupo: {str(e)}"
        )
