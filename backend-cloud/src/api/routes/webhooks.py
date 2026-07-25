import os
from fastapi import APIRouter, Header, HTTPException, Request, status
from src.infrastructure.supabase import supabase_client
from datetime import datetime, date
import httpx

async def invoke_send_notification(payload: dict):
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SECRET_KEY")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_url}/functions/v1/send-notification",
                headers={
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=10.0
            )
            print(f"[EDGE FUNCTION] Response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[EDGE FUNCTION] Error: {str(e)}")

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/member-status")
async def member_status_webhook(
    request: Request,
    x_supabase_webhook_secret: str = Header(None)
):
    # Verify secret header
    expected_secret = os.getenv("SUPABASE_WEBHOOK_SECRET")
    if expected_secret and x_supabase_webhook_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado: Firma o secreto inválido"
        )
        
    payload = await request.json()
    record = payload.get("record") or {}
    
    status_val = record.get("status")
    end_date_str = record.get("end_date")
    profile_id = record.get("profile_id")
    
    if not status_val or not profile_id:
        return {"status": "skipped", "reason": "Faltan datos requeridos en el registro"}
        
    # Calculate days remaining
    days_remaining = 0
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str[:10], "%Y-%m-%d").date()
            days_remaining = (end_date - date.today()).days
        except Exception:
            pass
            
    print(f"[WEBHOOK] status_val: {status_val}")
    print(f"[WEBHOOK] days_remaining: {days_remaining}")
    print(f"[WEBHOOK] end_date_str: {end_date_str}")
    print(f"[WEBHOOK] profile_id: {profile_id}")
    print(f"[WEBHOOK] Condición email: {status_val == 'active' and 0 < days_remaining <= 3}")

    if status_val == "active" and 0 < days_remaining <= 3:
        # Fetch profile info
        profile_res = supabase_client.table("profiles").select("*").eq("id", profile_id).execute()
        if not profile_res.data:
            return {"status": "skipped", "reason": "No se encontró el perfil correspondiente"}
            
        profile = profile_res.data[0]
        email = profile.get("email")
        full_name = profile.get("full_name") or "Miembro"
        
        if email:
            try:
                await invoke_send_notification({
                    'type': 'EXPIRATION_WARNING',
                    'member_email': email,
                    'member_name': full_name,
                    'days_remaining': days_remaining,
                    'end_date': end_date_str
                })
                print("[SUPABASE FUNCTIONS] Email de advertencia de vencimiento enviado exitosamente")
            except Exception as e:
                print(f"[SUPABASE FUNCTIONS] Error al enviar email de vencimiento: {str(e)}")
            return {"status": "email_sent"}
            
    return {"status": "ok", "message": "Procesado sin envío de email"}
