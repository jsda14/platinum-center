import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from src.infrastructure.supabase import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["cron"])

@router.post("/admin/expire-members")
async def expire_members(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret")
):
    """
    Job diario para expirar membresías cuya end_date sea menor a la fecha actual.
    """
    cron_secret = os.getenv("CRON_SECRET")
    
    if not cron_secret:
        logger.error("[EXPIRE_JOB] CRON_SECRET no está configurado en las variables de entorno.")
        raise HTTPException(status_code=500, detail="Configuración incompleta")
        
    if not x_cron_secret or x_cron_secret != cron_secret:
        logger.warning("[EXPIRE_JOB] Intento de acceso no autorizado (secret incorrecto).")
        raise HTTPException(status_code=401, detail="No autorizado")

    # Fecha actual ajustada a Bogotá (UTC-5)
    bogota_tz = timezone(timedelta(hours=-5))
    today_str = datetime.now(bogota_tz).date().isoformat()
    
    logger.info(f"[EXPIRE_JOB] Buscando membresías activas vencidas (end_date < {today_str})")

    try:
        # 1. Buscar los que cumplen el criterio
        res = supabase_client.table("members")\
            .select("id")\
            .eq("status", "active")\
            .lt("end_date", today_str)\
            .execute()
            
        members_to_expire = res.data or []
        
        if not members_to_expire:
            logger.info("[EXPIRE_JOB] No hay membresías para expirar hoy.")
            return {"expired_count": 0, "member_ids": []}
            
        member_ids = [m["id"] for m in members_to_expire]
        logger.info(f"[EXPIRE_JOB] Encontradas {len(member_ids)} membresías a expirar: {member_ids}")
        
        # 2. Actualizar status a 'expired' de forma masiva
        update_res = supabase_client.table("members")\
            .update({"status": "expired"})\
            .in_("id", member_ids)\
            .execute()
            
        expired_count = len(update_res.data) if update_res.data else 0
        logger.info(f"[EXPIRE_JOB] Éxito. {expired_count} membresías expiradas.")
        
        return {
            "expired_count": expired_count,
            "member_ids": member_ids
        }
        
    except Exception as e:
        logger.error(f"[EXPIRE_JOB] Error en job de expiración: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno ejecutando expiración")
