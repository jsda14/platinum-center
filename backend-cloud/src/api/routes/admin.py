import os
import random
import string
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client

router = APIRouter(tags=["admin"])

class CreateMemberRequest(BaseModel):
    fullName: str
    email: str
    phone: Optional[str] = None
    plan: str
    paymentMethod: str
    amount: float

def get_current_user_role(authorization: Optional[str]) -> str:
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
        
        return profile_res.data[0]["role"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o error al verificar permisos: {str(e)}"
        )

@router.post("/admin/members/create")
async def create_member(
    data: CreateMemberRequest,
    authorization: Optional[str] = Header(None)
):
    # Validar rol de super_admin o receptionist
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )
        
    try:
        # Generar contraseña temporal segura
        temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=10)) + "Plat*2026"
        
        # 1. Crear el usuario en Supabase Auth
        auth_res = supabase_client.auth.admin.create_user({
            "email": data.email,
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": data.fullName,
                "role": "member"
            }
        })
        
        if not auth_res or not auth_res.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo crear el usuario en Supabase Auth"
            )
            
        user_id = auth_res.user.id
        
        # 2. Crear/Upsert el perfil
        profile_res = supabase_client.table("profiles").upsert({
            "id": user_id,
            "full_name": data.fullName,
            "email": data.email,
            "phone": data.phone,
            "role": "member",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        if not profile_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo crear el perfil del usuario"
            )
            
        # Calcular fechas del plan
        start_date = date.today()
        if data.plan == '1_day':
            end_date = start_date + timedelta(days=1)
        elif data.plan == '15_days':
            end_date = start_date + timedelta(days=30)
        elif data.plan == '1_month':
            end_date = start_date + timedelta(days=30)
        elif data.plan == '1_year':
            end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=30)
            
        start_date_str = start_date.isoformat()
        end_date_str = end_date.isoformat()
        
        # 3. Registrar el miembro
        member_res = supabase_client.table("members").insert({
            "profile_id": user_id,
            "status": "active",
            "plan": data.plan,
            "start_date": start_date_str,
            "end_date": end_date_str
        }).execute()
        
        if not member_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo registrar la membresía del usuario"
            )
            
        member_data = member_res.data[0]
        
        # 4. Registrar el pago
        payment_res = supabase_client.table("payments").insert({
            "member_id": member_data["id"],
            "amount": data.amount,
            "method": data.paymentMethod,
            "plan": data.plan,
            "status": "confirmed",
            "plan_start_date": start_date_str,
            "plan_end_date": end_date_str
        }).execute()
        
        # 5. Si es plan 15_days, registrar pase diario
        if data.plan == '15_days' and payment_res.data:
            # Cerrar cualquier day_pass activo anterior para este member_id
            supabase_client.table("member_day_passes")\
                .update({"status": "exhausted"})\
                .eq("member_id", member_data["id"])\
                .eq("status", "active")\
                .execute()

            supabase_client.table("member_day_passes").insert({
                "member_id": member_data["id"],
                "payment_id": payment_res.data[0]["id"],
                "days_total": 15,
                "days_used": 0,
                "valid_from": start_date_str,
                "valid_until": end_date_str,
                "status": "active"
            }).execute()
            
        # Generar link de activación
        try:
            link_res = supabase_client.auth.admin.generate_link({
                "type": "recovery",
                "email": data.email
            })
            recovery_link = link_res.properties.action_link
        except Exception as e:
            print(f"[ADMIN] No se pudo generar link de activación: {str(e)}")
            recovery_link = None

        # Enviar email de bienvenida
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{os.getenv('SUPABASE_URL')}/functions/v1/send-notification",
                    headers={
                        "Authorization": f"Bearer {os.getenv('SUPABASE_SECRET_KEY')}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "type": "WELCOME_NEW_MEMBER",
                        "member_email": data.email,
                        "member_name": data.fullName,
                        "recovery_link": recovery_link,
                        "plan": data.plan
                    },
                    timeout=10.0
                )
        except Exception as e:
            print(f"[ADMIN] Error al enviar email de bienvenida: {str(e)}")

        return member_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar miembro en el servidor: {str(e)}"
        )

from src.infrastructure.zkteco.tunnel_client import activate_member

class ReactivateChipRequest(BaseModel):
    member_id: str

@router.post("/admin/reactivate-chip")
async def reactivate_chip(
    data: ReactivateChipRequest,
    authorization: Optional[str] = Header(None)
):
    # Validar rol de super_admin o receptionist
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )
        
    try:
        # 1. Buscar card_no, zkteco_user_id, profile_id en la tabla members
        member_res = supabase_client.table("members")\
            .select("card_no, zkteco_user_id, profile_id")\
            .eq("id", data.member_id)\
            .execute()
            
        if not member_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Miembro no encontrado"
            )
            
        member_data = member_res.data[0]
        card_no = member_data.get("card_no")
        zkteco_user_id = member_data.get("zkteco_user_id")
        profile_id = member_data.get("profile_id")
        
        if not card_no:
            return {"status": "no_chip", "message": "Sin chip asignado"}
            
        if not zkteco_user_id:
            return {"status": "no_chip", "message": "Sin PIN físico asignado"}
            
        # Buscar el nombre en profiles
        profile_res = supabase_client.table("profiles").select("full_name").eq("id", profile_id).execute()
        full_name = profile_res.data[0]["full_name"] if profile_res.data else "Miembro"
        
        # 2. Llamar a tunnel_client.activate_member(...)
        success = await activate_member(
            member_id=data.member_id,
            card_no=card_no,
            zkteco_user_id=zkteco_user_id,
            full_name=full_name
        )
        
        if success:
            return {"status": "queued"}
        else:
            return {"status": "tunnel_unavailable"}
            
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la reactivación de chip: {str(e)}"
        )
