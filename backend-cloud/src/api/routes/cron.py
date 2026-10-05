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


from src.api.routes.webhooks import invoke_send_notification

@router.post("/admin/send-expiration-reminders")
async def send_expiration_reminders(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret")
):
    """
    Job diario: envía recordatorios de vencimiento (2-3 días antes, día de vencimiento,
    y días de plan 15_days por agotarse).
    """
    cron_secret = os.getenv("CRON_SECRET_REMINDING")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="Configuración incompleta")
    if not x_cron_secret or x_cron_secret != cron_secret:
        raise HTTPException(status_code=401, detail="No autorizado")

    bogota_tz = timezone(timedelta(hours=-5))
    today = datetime.now(bogota_tz).date()
    in_2_days = (today + timedelta(days=2)).isoformat()
    in_3_days = (today + timedelta(days=3)).isoformat()
    today_str = today.isoformat()

    results = {"reminder_2_3_days": 0, "expiration_today": 0, "day_pass_low": 0}

    # 1. Recordatorio 2-3 días antes
    res = supabase_client.table("members")\
        .select("id, profile_id, end_date")\
        .eq("status", "active")\
        .eq("renewal_reminder_sent", False)\
        .gte("end_date", in_2_days)\
        .lte("end_date", in_3_days)\
        .execute()

    for m in (res.data or []):
        profile_res = supabase_client.table("profiles").select("email, full_name").eq("id", m["profile_id"]).execute()
        if profile_res.data and profile_res.data[0].get("email"):
            p = profile_res.data[0]
            days_remaining = (datetime.fromisoformat(m["end_date"]).date() - today).days
            try:
                await invoke_send_notification({
                    'type': 'EXPIRATION_WARNING',
                    'member_email': p["email"],
                    'member_name': p.get("full_name") or "Miembro",
                    'days_remaining': days_remaining,
                    'end_date': m["end_date"]
                })
                supabase_client.table("members").update({"renewal_reminder_sent": True}).eq("id", m["id"]).execute()
                results["reminder_2_3_days"] += 1
            except Exception as e:
                logger.error(f"[EXPIRATION_REMINDERS] Error enviando recordatorio a {p['email']}: {e}")

    # 2. Aviso el día que vence
    res = supabase_client.table("members")\
        .select("id, profile_id, end_date")\
        .eq("status", "active")\
        .eq("expiration_day_notified", False)\
        .eq("end_date", today_str)\
        .execute()

    for m in (res.data or []):
        profile_res = supabase_client.table("profiles").select("email, full_name").eq("id", m["profile_id"]).execute()
        if profile_res.data and profile_res.data[0].get("email"):
            p = profile_res.data[0]
            try:
                await invoke_send_notification({
                    'type': 'EXPIRATION_TODAY',
                    'member_email': p["email"],
                    'member_name': p.get("full_name") or "Miembro",
                    'end_date': m["end_date"]
                })
                supabase_client.table("members").update({"expiration_day_notified": True}).eq("id", m["id"]).execute()
                results["expiration_today"] += 1
            except Exception as e:
                logger.error(f"[EXPIRATION_REMINDERS] Error enviando aviso del día a {p['email']}: {e}")

    # 3. Plan 15_days con 2 días o menos de uso restante
    res = supabase_client.table("member_day_passes")\
        .select("id, member_id, days_total, days_used")\
        .eq("status", "active")\
        .eq("low_days_warning_sent", False)\
        .execute()

    for dp in (res.data or []):
        remaining = dp["days_total"] - dp["days_used"]
        if remaining <= 2:
            member_res = supabase_client.table("members").select("profile_id").eq("id", dp["member_id"]).execute()
            if not member_res.data:
                continue
            profile_id = member_res.data[0]["profile_id"]
            profile_res = supabase_client.table("profiles").select("email, full_name").eq("id", profile_id).execute()
            if profile_res.data and profile_res.data[0].get("email"):
                p = profile_res.data[0]
                try:
                    await invoke_send_notification({
                        'type': 'DAY_PASS_LOW_WARNING',
                        'member_email': p["email"],
                        'member_name': p.get("full_name") or "Miembro",
                        'days_remaining': remaining,
                        'days_used': dp["days_used"],
                        'days_total': dp["days_total"]
                    })
                    supabase_client.table("member_day_passes").update({"low_days_warning_sent": True}).eq("id", dp["id"]).execute()
                    results["day_pass_low"] += 1
                except Exception as e:
                    logger.error(f"[EXPIRATION_REMINDERS] Error enviando aviso de días bajos: {e}")

    logger.info(f"[EXPIRATION_REMINDERS] Resultado: {results}")
    return results

