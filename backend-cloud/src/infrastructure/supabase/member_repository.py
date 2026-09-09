import logging
from typing import Optional, List, Dict, Any
from src.domain.member.ports import MemberRepository
from src.infrastructure.supabase.client import supabase_client

logger = logging.getLogger(__name__)

class SupabaseMemberRepository(MemberRepository):
    """Implementación de MemberRepository usando Supabase."""

    def __init__(self, client=None):
        self._client = client or supabase_client

    def get_member_by_profile_id(self, profile_id: str) -> Optional[Dict[str, Any]]:
        try:
            logger.info("[REPO] Consultando miembro para profile_id=%s", profile_id)
            res = self._client.table("members")\
                .select("id, profile_id, zkteco_user_id, card_no, status, plan, start_date, end_date, created_at, updated_at, profiles:profile_id(id, full_name, email, phone, avatar_url, role)")\
                .eq("profile_id", profile_id)\
                .limit(1)\
                .execute()

            if not res.data:
                logger.info("[REPO] No se encontró miembro para profile_id=%s", profile_id)
                return None

            return res.data[0]
        except Exception as e:
            logger.error("[REPO] Error al consultar miembro: %s", str(e), exc_info=True)
            raise

    def get_or_create_member_by_profile_id(self, profile_id: str) -> Dict[str, Any]:
        try:
            logger.info("[REPO] Buscando o creando miembro para profile_id=%s", profile_id)
            res = self._client.table("members")\
                .select("id, profile_id, zkteco_user_id, card_no, status, plan, start_date, end_date, created_at, updated_at")\
                .eq("profile_id", profile_id)\
                .limit(1)\
                .execute()

            if res.data:
                return res.data[0]

            logger.info("[REPO] Insertando nuevo miembro suspendido para profile_id=%s", profile_id)
            insert_res = self._client.table("members").insert({
                "profile_id": profile_id,
                "status": "suspended"
            }).execute()

            if not insert_res.data:
                raise RuntimeError("No se pudo crear el miembro en la base de datos")

            return insert_res.data[0]
        except Exception as e:
            logger.error("[REPO] Error en get_or_create_member: %s", str(e), exc_info=True)
            raise

    def get_active_day_passes(self, member_id: str) -> List[Dict[str, Any]]:
        try:
            logger.info("[REPO] Consultando pases diarios activos para member_id=%s", member_id)
            res = self._client.table("member_day_passes")\
                .select("id, member_id, payment_id, days_total, days_used, valid_from, valid_until, status, created_at, updated_at")\
                .eq("member_id", member_id)\
                .eq("status", "active")\
                .order("created_at", desc=True)\
                .execute()

            return res.data or []
        except Exception as e:
            logger.error("[REPO] Error al consultar day_passes: %s", str(e), exc_info=True)
            raise

    def get_payments(self, member_id: str) -> List[Dict[str, Any]]:
        try:
            logger.info("[REPO] Consultando historial de pagos para member_id=%s", member_id)
            res = self._client.table("payments")\
                .select("id, member_id, amount, method, plan, transaction_id, status, payment_date, plan_start_date, plan_end_date, created_at")\
                .eq("member_id", member_id)\
                .order("payment_date", desc=True)\
                .execute()

            return res.data or []
        except Exception as e:
            logger.error("[REPO] Error al consultar payments: %s", str(e), exc_info=True)
            raise

    def create_suggestion(self, member_id: str, message: str) -> Dict[str, Any]:
        try:
            logger.info("[REPO] Creando sugerencia para member_id=%s", member_id)
            res = self._client.table("suggestions").insert({
                "member_id": member_id,
                "message": message,
                "status": "pending"
            }).execute()

            if not res.data:
                raise RuntimeError("No se pudo registrar la sugerencia en la base de datos")

            return res.data[0]
        except Exception as e:
            logger.error("[REPO] Error al crear sugerencia: %s", str(e), exc_info=True)
            raise

    def get_suggestions(self, member_id: str) -> List[Dict[str, Any]]:
        try:
            logger.info("[REPO] Consultando sugerencias para member_id=%s", member_id)
            res = self._client.table("suggestions")\
                .select("id, member_id, message, status, response, created_at")\
                .eq("member_id", member_id)\
                .order("created_at", desc=True)\
                .execute()

            return res.data or []
        except Exception as e:
            logger.error("[REPO] Error al consultar sugerencias: %s", str(e), exc_info=True)
            raise
