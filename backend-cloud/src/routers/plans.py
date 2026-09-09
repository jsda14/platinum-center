import logging
from fastapi import APIRouter, HTTPException, status
from src.infrastructure.supabase.client import supabase_client
from src.domain.plan.schemas import ActivePlansResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=ActivePlansResponse)
@router.get("/", response_model=ActivePlansResponse, include_in_schema=False)
async def get_active_plans():
    """Devuelve todos los planes activos ordenados por precio ascendente."""
    try:
        logger.info("[ROUTER] Consultando planes activos")
        res = (
            supabase_client.table("plans")
            .select("id, name, slug, duration_days, price, active, created_at")
            .eq("active", True)
            .order("price", desc=False)
            .execute()
        )

        plans = []
        for p in (res.data or []):
            item = dict(p)
            item["is_active"] = item.get("active", True)
            item["duration"] = item.get("duration_days")
            item["description"] = None
            plans.append(item)

        return {"plans": plans}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al obtener planes: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener planes: {str(e)}",
        )
