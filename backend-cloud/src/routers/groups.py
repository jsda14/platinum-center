import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from src.infrastructure.supabase.client import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["groups"])

@router.get("/group-pricing")
@router.get("/plans/group-pricing", include_in_schema=False)
async def get_group_pricing():
    """
    Devuelve los precios grupales activos. Público.
    """
    try:
        logger.info("[ROUTER] Consultando precios grupales activos")
        res = (
            supabase_client.table("plan_group_pricing")
            .select("min_members, max_members, price_per_person")
            .eq("active", True)
            .order("min_members", desc=False)
            .execute()
        )
        return {"pricing": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ROUTER] Error al obtener precios grupales: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener precios grupales: {str(e)}"
        )
