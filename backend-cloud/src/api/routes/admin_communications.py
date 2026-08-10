import os
import asyncio
import httpx
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client

router = APIRouter(tags=["admin_communications"])

class SendCommunicationRequest(BaseModel):
    subject: str
    body: str
    recipient_type: str  # 'all' | 'active' | 'expired' | 'expiring_soon'

def get_current_user_and_role(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de autorización o el formato es incorrecto"
        )
    token = authorization.split(" ")[1]
    try:
        user_res = supabase_client.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de Supabase inválido o expirado"
            )
        
        user_id = user_res.user.id
        
        # Buscar el rol en profiles
        profile_res = supabase_client.table("profiles").select("role").eq("id", user_id).execute()
        if not profile_res.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El perfil de usuario no existe en la base de datos"
            )
        
        return user_id, profile_res.data[0]["role"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o error al verificar permisos: {str(e)}"
        )

@router.post("/admin/send-communication")
async def send_communication(
    data: SendCommunicationRequest,
    authorization: Optional[str] = Header(None)
):
    # Validar rol de super_admin
    user_id, role = get_current_user_and_role(authorization)
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores principales pueden enviar comunicados masivos"
        )

    # 1. Consultar miembros y correos según recipient_type
    try:
        if data.recipient_type == "all":
            # Obtener todos los miembros
            members_res = supabase_client.table("members").select("id, status, profiles(id, email, full_name)").execute()
        elif data.recipient_type == "active":
            # Miembros activos
            members_res = supabase_client.table("members").select("id, status, profiles(id, email, full_name)").eq("status", "active").execute()
        elif data.recipient_type == "expired":
            # Miembros vencidos
            members_res = supabase_client.table("members").select("id, status, profiles(id, email, full_name)").eq("status", "expired").execute()
        elif data.recipient_type == "expiring_soon":
            # Miembros activos que vencen en los próximos 7 días
            today_str = date.today().isoformat()
            in_7_days_str = (date.today() + timedelta(days=7)).isoformat()
            members_res = supabase_client.table("members")\
                .select("id, status, profiles(id, email, full_name)")\
                .eq("status", "active")\
                .gte("end_date", today_str)\
                .lte("end_date", in_7_days_str)\
                .execute()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de destinatario inválido"
            )

        if not members_res or not members_res.data:
            members_data = []
        else:
            members_data = members_res.data

        # Filtrar correos electrónicos válidos
        recipients = []
        for m in members_data:
            profile = m.get("profiles")
            if profile and profile.get("email"):
                recipients.append({
                    "email": profile["email"],
                    "full_name": profile.get("full_name", "Miembro")
                })

        if not recipients:
            return {
                "status": "success",
                "message": "No se encontraron destinatarios que cumplan con la condición.",
                "recipients_count": 0
            }

        # 2. Invocar Edge Function send-notification con tipo BULK_COMMUNICATION en una sola llamada
        recipient_emails = [r["email"] for r in recipients]
        payload = {
            'type': 'BULK_COMMUNICATION',
            'recipients': [{'email': e, 'name': ''} for e in recipient_emails],
            'custom_subject': data.subject,
            'custom_body': data.body
        }

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_secret = os.getenv("SUPABASE_SECRET_KEY")

        successful_sends = 0
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{supabase_url}/functions/v1/send-notification",
                headers={
                    "Authorization": f"Bearer {supabase_secret}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )
            if response.status_code == 200:
                successful_sends = len(recipients)
            else:
                print(f"[COMMUNICATION] Error API Edge Function: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error en Edge Function al enviar comunicado: {response.text}"
                )

        # 3. Guardar registro en la tabla communications
        supabase_client.table("communications").insert({
            "subject": data.subject,
            "body": data.body,
            "recipient_type": data.recipient_type,
            "recipients_count": successful_sends,
            "sent_by": user_id,
            "sent_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "status": "success",
            "message": f"Comunicado masivo enviado exitosamente a {successful_sends} destinatarios.",
            "recipients_count": successful_sends
        }

    except Exception as e:
        print(f"[COMMUNICATION] Error crítico: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al enviar comunicación: {str(e)}"
        )
