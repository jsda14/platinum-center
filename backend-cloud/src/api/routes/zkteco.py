import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client
from src.infrastructure.zkteco.tunnel_client import deactivate_member

router = APIRouter(prefix="/zkteco", tags=["zkteco"])

BOGOTA_TZ = timezone(timedelta(hours=-5))


def parse_device_timestamp_to_utc_iso(raw: str) -> str:
    """
    El inBio manda la hora como texto plano sin zona horaria, ej.
    "2026-10-22 13:17:00" — es la hora local de Bogotá tal cual el
    reloj del dispositivo. Si se inserta así en una columna timestamptz,
    Postgres la interpreta como UTC (no hay offset en el string), lo
    que corre todo 5 horas hacia atrás al mostrarla convertida a hora
    local. Acá se interpreta explícitamente como Bogotá y se convierte
    a UTC antes de guardar, para que quede correcta de origen.
    """
    try:
        naive = datetime.strptime(raw.strip(), "%Y-%m-%d %H:%M:%S")
        bogota_aware = naive.replace(tzinfo=BOGOTA_TZ)
        return bogota_aware.astimezone(timezone.utc).isoformat()
    except Exception:
        # Si el formato no calza, se guarda tal cual llegó en vez de
        # reventar el request — mejor un dato sin convertir que perderlo.
        return raw


class AccessEventRequest(BaseModel):
    card_no: str
    user_id: Optional[str] = None
    timestamp: str
    sn: Optional[str] = None
    source: Optional[str] = None

@router.post("/access-event")
async def access_event(
    data: AccessEventRequest,
    authorization: Optional[str] = Header(None)
):
    # Validar el TUNNEL_SECRET
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta token de autorización o formato inválido"
        )
    token = authorization.split(" ")[1]
    if token != tunnel_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado"
        )

    # Convertir la hora del dispositivo (naive, hora Bogotá) a UTC real antes de usarla
    utc_timestamp = parse_device_timestamp_to_utc_iso(data.timestamp)

    # Busca en Supabase el miembro por card_no
    normalized_card = data.card_no.lstrip("0") or "0"
    member_res = supabase_client.table("members")\
        .select("id, profile_id, zkteco_user_id, plan, card_no")\
        .or_(f"card_no.eq.{data.card_no},card_no.eq.{normalized_card}")\
        .execute()

    if member_res.data:
        member = member_res.data[0]
        member_id = member["id"]

        # Verificar si el miembro está bloqueado
        if member.get("plan") == "15_days":
            active_pass = supabase_client.table("member_day_passes")\
                .select("id, days_used, days_total, status")\
                .eq("member_id", member_id)\
                .eq("status", "active")\
                .execute()

            if not active_pass.data:
                # No tiene pase activo — bloquear y registrar como denied
                supabase_client.table("access_logs").insert({
                    "member_id": member_id,
                    "card_no": data.card_no,
                    "event_type": "denied",
                    "timestamp": utc_timestamp,
                    "raw_payload": json.dumps(data.dict())
                }).execute()

                # Actualizar members.status a expired
                supabase_client.table("members")\
                    .update({"status": "expired"})\
                    .eq("id", member_id)\
                    .execute()

                # Llamar deactivate_member para bloquear en ZKBioSecurity
                await deactivate_member(
                    member_id=member_id,
                    zkteco_user_id=member.get("zkteco_user_id"),
                    full_name="Miembro",
                    sn=data.sn,
                    card_no=member.get("card_no", "")
                )

                return {"status": "ok", "event_type": "denied"}

        event_type = "granted"

        # Día calendario en Bogotá (del timestamp crudo del dispositivo, que ya
        # viene en hora local) y su rango equivalente en UTC, para comparar
        # contra access_logs.timestamp que ahora se guarda en UTC real.
        day_str = data.timestamp[:10]
        try:
            day_start_bogota = datetime.strptime(day_str, "%Y-%m-%d").replace(tzinfo=BOGOTA_TZ)
        except Exception:
            day_start_bogota = datetime.now(BOGOTA_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end_bogota = day_start_bogota + timedelta(days=1) - timedelta(seconds=1)
        day_start_utc = day_start_bogota.astimezone(timezone.utc).isoformat()
        day_end_utc = day_end_bogota.astimezone(timezone.utc).isoformat()

        existing_logs = supabase_client.table("access_logs")\
            .select("id")\
            .eq("member_id", member_id)\
            .eq("event_type", "granted")\
            .gte("timestamp", day_start_utc)\
            .lte("timestamp", day_end_utc)\
            .execute()

        already_entered_today = bool(existing_logs.data)

        # Registra en access_logs: event_type='granted' (se hace siempre para mantener el historial)
        supabase_client.table("access_logs").insert({
            "member_id": member_id,
            "card_no": data.card_no,
            "event_type": "granted",
            "timestamp": utc_timestamp,
            "raw_payload": json.dumps(data.dict())
        }).execute()

        # Si plan es '15_days' y es la primera entrada del día: incrementa days_used en member_day_passes
        if member.get("plan") == "15_days" and not already_entered_today:
            passes_res = supabase_client.table("member_day_passes")\
                .select("id, days_used, days_total")\
                .eq("member_id", member_id)\
                .eq("status", "active")\
                .execute()

            if passes_res.data:
                day_pass = passes_res.data[0]
                days_used = day_pass.get("days_used", 0) + 1
                days_total = day_pass.get("days_total", 15)

                update_payload = {"days_used": days_used}
                if days_used >= days_total:
                    update_payload["status"] = "exhausted"

                supabase_client.table("member_day_passes")\
                    .update(update_payload)\
                    .eq("id", day_pass["id"])\
                    .execute()

                if days_used >= days_total:
                    # Marcar la membresía como expirada: sin esto, el portal/admin
                    # sigue mostrando "activo" aunque el chip ya quedó bloqueado.
                    supabase_client.table("members")\
                        .update({"status": "expired"})\
                        .eq("id", member_id)\
                        .execute()

                    profile_id = member.get("profile_id")
                    full_name = "Miembro"
                    if profile_id:
                        profile_res = supabase_client.table("profiles")\
                            .select("full_name")\
                            .eq("id", profile_id)\
                            .execute()
                        if profile_res.data:
                            full_name = profile_res.data[0].get("full_name", "Miembro")

                    await deactivate_member(
                        member_id=member_id,
                        zkteco_user_id=member.get("zkteco_user_id"),
                        full_name=full_name,
                        sn=data.sn,
                        card_no=member.get("card_no", "")
                    )
    else:
        event_type = "unknown"
        # Registra en access_logs: event_type='unknown', member_id=null
        supabase_client.table("access_logs").insert({
            "member_id": None,
            "card_no": data.card_no,
            "event_type": "unknown",
            "timestamp": utc_timestamp,
            "raw_payload": json.dumps(data.dict())
        }).execute()

    return {"status": "ok", "event_type": event_type}
