import os
from fastapi import APIRouter, Header, HTTPException, Request, status
from src.infrastructure.supabase import supabase_client
from src.infrastructure.brevo.email_service import send_expiration_warning_email
from datetime import datetime, date

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
                result = send_expiration_warning_email(
                    to_email=email,
                    full_name=full_name,
                    days_remaining=days_remaining,
                    end_date=end_date_str[:10] if end_date_str else "N/A"
                )
                print(f"[BREVO] Email enviado exitosamente: {result}")
            except Exception as e:
                print(f"[BREVO] Error al enviar email: {str(e)}")
            return {"status": "email_sent"}
            
    return {"status": "ok", "message": "Procesado sin envío de email"}
