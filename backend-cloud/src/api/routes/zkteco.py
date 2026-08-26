import os
import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client
from src.infrastructure.zkteco.tunnel_client import deactivate_member

router = APIRouter(prefix="/zkteco", tags=["zkteco"])

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

    # Busca en Supabase el miembro por card_no
    normalized_card = data.card_no.lstrip("0") or "0"

    member_res = supabase_client.table("members")\
        .select("id, profile_id, zkteco_user_id, plan")\
        .or_(f"card_no.eq.{data.card_no},card_no.eq.{normalized_card}")\
        .execute()

    if member_res.data:
        member = member_res.data[0]
        member_id = member["id"]
        event_type = "granted"

        # Extraer fecha (YYYY-MM-DD) y verificar si ya existe una entrada granted hoy
        day_str = data.timestamp[:10]
        existing_logs = supabase_client.table("access_logs")\
            .select("id")\
            .eq("member_id", member_id)\
            .eq("event_type", "granted")\
            .gte("timestamp", f"{day_str}T00:00:00")\
            .lte("timestamp", f"{day_str}T23:59:59")\
            .execute()

        already_entered_today = bool(existing_logs.data)

        # Registra en access_logs: event_type='granted' (se hace siempre para mantener el historial)
        supabase_client.table("access_logs").insert({
            "member_id": member_id,
            "card_no": data.card_no,
            "event_type": "granted",
            "timestamp": data.timestamp,
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
                        sn=data.sn
                    )
    else:
        event_type = "unknown"
        # Registra en access_logs: event_type='unknown', member_id=null
        supabase_client.table("access_logs").insert({
            "member_id": None,
            "card_no": data.card_no,
            "event_type": "unknown",
            "timestamp": data.timestamp,
            "raw_payload": json.dumps(data.dict())
        }).execute()

    return {"status": "ok", "event_type": event_type}
