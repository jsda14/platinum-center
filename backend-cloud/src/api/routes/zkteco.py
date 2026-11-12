import os
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client
from src.infrastructure.zkteco.tunnel_client import deactivate_member, activate_member

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


def _check_tunnel_secret(authorization: Optional[str]) -> None:
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


@router.get("/member-by-card/{card_no}")
async def member_by_card(card_no: str, authorization: Optional[str] = Header(None)):
    """
    Usado por el Bridge para la auto-sanación en tiempo real: cuando el
    dispositivo marca una tarjeta como "Usuario no registrado" pese a que
    el miembro sigue activo, el Bridge consulta acá si vale la pena
    reactivar el chip en caliente.
    """
    _check_tunnel_secret(authorization)

    normalized_card = card_no.lstrip("0") or "0"
    member_res = supabase_client.table("members")\
        .select("id, profile_id, zkteco_user_id, card_no, status")\
        .or_(f"card_no.eq.{card_no},card_no.eq.{normalized_card}")\
        .execute()

    if not member_res.data:
        return {"found": False}

    member = member_res.data[0]
    if member.get("status") != "active":
        return {"found": True, "active": False}

    full_name = "Miembro"
    profile_id = member.get("profile_id")
    if profile_id:
        profile_res = supabase_client.table("profiles")\
            .select("full_name")\
            .eq("id", profile_id)\
            .execute()
        if profile_res.data:
            full_name = profile_res.data[0].get("full_name", "Miembro")

    return {
        "found": True,
        "active": True,
        "member_id": member["id"],
        "zkteco_user_id": member.get("zkteco_user_id"),
        "card_no": member.get("card_no"),
        "full_name": full_name,
    }


async def _apply_pending_scheduled_payment(member_id: str) -> bool:
    """
    Si el miembro tiene un pago con activación programada esperando
    (payments.activation_applied = False) — por ejemplo, pagó un plan
    distinto (o el mismo) mientras todavía tenía vigencia/días del plan
    actual — lo aplica de inmediato: actualiza members (plan, fechas,
    status), cierra cualquier member_day_passes activo del plan viejo,
    crea uno nuevo si el plan entrante es "15_days", reactiva el chip si
    hay card_no, y marca el pago como aplicado.

    Esto es lo que permite que, cuando el plan actual se agota ANTES de
    que llegue la fecha que calculó el cron diario (ej. se acaban los 15
    días consumibles antes de que se cumpla el mes), el plan programado
    entre en vigencia en el momento mismo, en vez de bloquear el acceso
    a la espera de que corra el cron (que solo revisa por fecha).

    Retorna True si aplicó un pago programado, False si no había ninguno.
    """
    pending_res = supabase_client.table("payments")\
        .select("id, plan, plan_start_date, plan_end_date")\
        .eq("member_id", member_id)\
        .eq("activation_applied", False)\
        .order("plan_start_date")\
        .limit(1)\
        .execute()

    if not pending_res.data:
        return False

    pending = pending_res.data[0]
    now = datetime.now(BOGOTA_TZ)

    member_res = supabase_client.table("members")\
        .select("card_no, zkteco_user_id, profile_id")\
        .eq("id", member_id)\
        .execute()
    if not member_res.data:
        return False
    m = member_res.data[0]

    supabase_client.table("members").update({
        "status": "active",
        "plan": pending["plan"],
        "start_date": pending["plan_start_date"],
        "end_date": pending["plan_end_date"],
        "updated_at": now.isoformat(),
        "renewal_reminder_sent": False,
        "expiration_day_notified": False
    }).eq("id", member_id).execute()

    # Cerrar cualquier day_pass activo que quede del plan anterior, sea
    # cual sea el plan entrante (si entra otro 15_days, igual se cierra
    # el viejo y se crea uno limpio más abajo).
    supabase_client.table("member_day_passes")\
        .update({"status": "exhausted"})\
        .eq("member_id", member_id)\
        .eq("status", "active")\
        .execute()

    if pending["plan"] == "15_days":
        supabase_client.table("member_day_passes").insert({
            "member_id": member_id,
            "payment_id": pending["id"],
            "days_total": 15,
            "days_used": 0,
            "valid_from": pending["plan_start_date"],
            "valid_until": pending["plan_end_date"],
            "status": "active"
        }).execute()

    supabase_client.table("payments")\
        .update({"activation_applied": True})\
        .eq("id", pending["id"])\
        .execute()

    if m.get("card_no"):
        full_name = "Miembro"
        profile_id = m.get("profile_id")
        if profile_id:
            profile_res = supabase_client.table("profiles").select("full_name").eq("id", profile_id).execute()
            if profile_res.data:
                full_name = profile_res.data[0].get("full_name", "Miembro")
        try:
            await activate_member(
                member_id=member_id,
                card_no=m["card_no"],
                zkteco_user_id=m.get("zkteco_user_id") or "",
                full_name=full_name
            )
        except Exception:
            # No bloqueante: si falla la reactivación del chip, el swap en
            # base de datos ya quedó aplicado y el chip sigue como estaba
            # (activo, porque nunca se desactivó en este flujo).
            pass

    return True


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
    _check_tunnel_secret(authorization)

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
                # No tiene pase activo. Antes de bloquear, revisar si hay un
                # pago con activación programada esperando (ej. pagó un plan
                # distinto mientras todavía tenía días/vigencia del 15_days
                # actual) — si lo hay, se aplica ahora mismo y se le deja
                # entrar ya bajo el plan nuevo, en vez de bloquearlo.
                applied = await _apply_pending_scheduled_payment(member_id)
                if applied:
                    refreshed = supabase_client.table("members")\
                        .select("id, profile_id, zkteco_user_id, plan, card_no")\
                        .eq("id", member_id)\
                        .execute()
                    if refreshed.data:
                        member = refreshed.data[0]
                else:
                    # No tiene pase activo ni pago programado — bloquear y
                    # registrar como denied
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
                    # Se agotaron los días del pase. Antes de bloquear, revisar
                    # si hay un pago con activación programada esperando a que
                    # esto pasara (ej. pagó un plan de 1 año mientras todavía
                    # tenía días del 15_days) — si lo hay, se aplica de una vez
                    # para que el próximo ingreso ya entre con el plan nuevo,
                    # sin bloquear ni un solo día de por medio.
                    applied = await _apply_pending_scheduled_payment(member_id)
                    if not applied:
                        # No había nada programado — marcar la membresía como
                        # expirada: sin esto, el portal/admin sigue mostrando
                        # "activo" aunque el chip ya quedó bloqueado.
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
