import os
import random
import string
import time
import logging
import httpx
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from src.infrastructure.supabase import supabase_client
from src.infrastructure.supabase.auth import get_current_user
from src.infrastructure.zkteco.tunnel_client import activate_member

logger = logging.getLogger(__name__)

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

class AssignChipRequest(BaseModel):
    member_id: str
    card_no: str
    full_name: str
    zkteco_user_id: Optional[str] = None
    sn: Optional[str] = None

@router.post("/admin/assign-chip")
async def assign_chip(
    data: AssignChipRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Asigna un chip a un miembro.
    1. Busca el usuario en ZKBioSecurity via Bridge
    2. Si existe: guarda zkteco_person_id y zkteco_user_id en members
    3. Si no existe: crea el usuario en ZKBioSecurity via Bridge
    4. Si el lookup al Bridge falla o el túnel no está disponible:
       - Guarda el comando 'activate' en pending_commands
       - Actualiza card_no y zkteco_user_id en members
       - Retorna {"status": "queued", "found_in_zkteco": false}
    """
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    gym_tunnel_url = os.getenv("GYM_TUNNEL_URL")
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    
    headers = {
        "Authorization": f"Bearer {tunnel_secret or ''}",
        "X-Tunnel-Secret": tunnel_secret or "",
        "Content-Type": "application/json"
    }

    zkteco_user_id = data.zkteco_user_id or str(int(time.time()))[-6:]
    person_id = None
    bridge_lookup_ok = False
    lookup = {"found": False}

    # 1. Intentar lookup al Bridge
    if gym_tunnel_url:
        try:
            async with httpx.AsyncClient() as client:
                lookup_resp = await client.get(
                    f"{gym_tunnel_url.rstrip('/')}/webhook/lookup-member?card_no={data.card_no}",
                    headers=headers,
                    timeout=10.0
                )
                if lookup_resp.status_code == 200:
                    lookup = lookup_resp.json()
                    bridge_lookup_ok = True
                else:
                    logger.warning(
                        "[ASSIGN-CHIP] Lookup al Bridge falló con status %s: %s",
                        lookup_resp.status_code,
                        lookup_resp.text
                    )
        except Exception as e:
            logger.warning("[ASSIGN-CHIP] Excepción al contactar Bridge: %s", str(e))
    else:
        logger.warning("[ASSIGN-CHIP] GYM_TUNNEL_URL no configurado")

    # 2. Si el lookup al Bridge falló -> guardar activate en pending_commands + actualizar card_no en members
    if not bridge_lookup_ok:
        logger.info("[ASSIGN-CHIP] Bridge no disponible. Guardando activate en pending_commands para miembro %s", data.member_id)
        try:
            supabase_client.table("pending_commands").insert({
                "member_id": data.member_id,
                "action": "activate",
                "card_no": data.card_no,
                "zkteco_user_id": zkteco_user_id,
                "full_name": data.full_name,
                "sn": data.sn or "PLATINUM001",
                "status": "pending"
            }).execute()
        except Exception as err:
            logger.error("[ASSIGN-CHIP] Error al insertar en pending_commands: %s", err)

        try:
            supabase_client.table("members")\
                .update({
                    "card_no": data.card_no,
                    "zkteco_user_id": zkteco_user_id
                })\
                .eq("id", data.member_id)\
                .execute()
        except Exception as err:
            logger.error("[ASSIGN-CHIP] Error al actualizar card_no en members: %s", err)

        return {
            "status": "queued",
            "found_in_zkteco": False,
            "zkteco_user_id": zkteco_user_id,
            "zkteco_person_id": None
        }

    # 3. Si el lookup al Bridge respondió:
    if lookup.get("found"):
        # Ya existe en ZKBioSecurity — guardar IDs en Supabase
        person_id = lookup.get("person_id")
        zkteco_user_id = lookup.get("zkteco_user_id") or zkteco_user_id

        update_data = {
            "card_no": data.card_no,
            "zkteco_user_id": zkteco_user_id
        }
        if person_id:
            update_data["zkteco_person_id"] = person_id

        supabase_client.table("members")\
            .update(update_data)\
            .eq("id", data.member_id)\
            .execute()

        return {
            "status": "ok",
            "found_in_zkteco": True,
            "zkteco_user_id": zkteco_user_id,
            "zkteco_person_id": person_id
        }
    else:
        # No existe en ZKBioSecurity — crear vía activate_member (maneja su propio fallback a pending_commands)
        activated = await activate_member(
            member_id=data.member_id,
            card_no=data.card_no,
            zkteco_user_id=zkteco_user_id,
            full_name=data.full_name,
            sn=data.sn
        )

        update_data = {
            "card_no": data.card_no,
            "zkteco_user_id": zkteco_user_id
        }
        supabase_client.table("members")\
            .update(update_data)\
            .eq("id", data.member_id)\
            .execute()

        return {
            "status": "ok" if activated else "queued",
            "found_in_zkteco": False,
            "zkteco_user_id": zkteco_user_id,
            "zkteco_person_id": None
        }

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


class UpdateMemberRequest(BaseModel):
    status: Optional[str] = None
    plan: Optional[str] = None
    end_date: Optional[str] = None
    card_no: Optional[str] = None
    zkteco_user_id: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class RegisterPaymentRequest(BaseModel):
    amount: float
    method: str
    plan: str


@router.put("/admin/members/{member_id}")
async def update_member(
    member_id: str,
    data: UpdateMemberRequest,
    authorization: Optional[str] = Header(None)
):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    # Obtener profile_id del miembro
    member_res = supabase_client.table("members")\
        .select("profile_id")\
        .eq("id", member_id)\
        .execute()
    
    if not member_res.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    profile_id = member_res.data[0].get("profile_id")
    
    # Actualizar members
    member_updates = {}
    if data.status is not None: member_updates["status"] = data.status
    if data.plan is not None: member_updates["plan"] = data.plan
    if data.end_date is not None: member_updates["end_date"] = data.end_date
    if data.card_no is not None: member_updates["card_no"] = data.card_no
    if data.zkteco_user_id is not None: member_updates["zkteco_user_id"] = data.zkteco_user_id
    
    if member_updates:
        member_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        supabase_client.table("members").update(member_updates).eq("id", member_id).execute()
    
    # Actualizar profiles si hay datos de perfil
    profile_updates = {}
    if data.full_name is not None: profile_updates["full_name"] = data.full_name
    if data.email is not None: profile_updates["email"] = data.email
    if data.phone is not None: profile_updates["phone"] = data.phone
    
    if profile_updates and profile_id:
        supabase_client.table("profiles").update(profile_updates).eq("id", profile_id).execute()
    
    return {"status": "ok"}


@router.put("/admin/members/{member_id}/suspend")
async def suspend_member(
    member_id: str,
    authorization: Optional[str] = Header(None)
):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    supabase_client.table("members")\
        .update({"status": "suspended", "updated_at": datetime.now(timezone.utc).isoformat()})\
        .eq("id", member_id)\
        .execute()
    
    return {"status": "ok"}


@router.get("/admin/payments")
async def get_payments(authorization: Optional[str] = Header(None)):
    """Historial general de pagos con datos del miembro y perfil."""
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    try:
        res = supabase_client.table("payments")\
            .select("*, members(id, profiles:profile_id(full_name, email))")\
            .order("payment_date", desc=True)\
            .execute()
        
        return {"payments": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Error al obtener pagos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener pagos: {str(e)}"
        )


@router.get("/admin/members")
async def get_members(
    without_chip: bool = False,
    authorization: Optional[str] = Header(None)
):
    """Listado de miembros con perfil. Filtro opcional: sin chip asignado."""
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    try:
        query = supabase_client.table("members")\
            .select("*, profiles:profile_id(full_name, email, phone)")
        
        if without_chip:
            query = query.is_("card_no", "null").eq("status", "active")
        
        res = query.order("created_at", desc=True).execute()
        
        return {"members": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Error al obtener miembros: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener miembros: {str(e)}"
        )


@router.get("/admin/members/{member_id}")
async def get_member_detail(
    member_id: str,
    authorization: Optional[str] = Header(None)
):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    # member + profile
    member_res = supabase_client.table("members")\
        .select("*, profiles:profile_id(full_name, email, phone)")\
        .eq("id", member_id)\
        .execute()
    
    if not member_res.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    member = member_res.data[0]
    
    # payments
    payments_res = supabase_client.table("payments")\
        .select("id, amount, method, plan, status, payment_date, plan_start_date, plan_end_date")\
        .eq("member_id", member_id)\
        .order("payment_date", desc=True)\
        .execute()
    
    # day_pass más reciente
    day_pass_res = supabase_client.table("member_day_passes")\
        .select("id, days_used, days_total, status, valid_from, valid_until")\
        .eq("member_id", member_id)\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
    
    dp = day_pass_res.data[0] if day_pass_res.data else None

    return {
        "member": member,
        "payments": payments_res.data or [],
        "day_pass": dp,
        "dayPass": dp
    }


@router.post("/admin/members/{member_id}/payments")
async def register_payment(
    member_id: str,
    data: RegisterPaymentRequest,
    authorization: Optional[str] = Header(None)
):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    admin_user = get_current_user(authorization)
    admin_user_id = admin_user["id"] if admin_user else None
    
    # 1. Obtener duración del plan
    plan_res = supabase_client.table("plans")\
        .select("duration_days")\
        .eq("slug", data.plan)\
        .execute()
    
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    duration_days = plan_res.data[0]["duration_days"]
    
    # 2. Obtener estado actual del miembro
    member_res = supabase_client.table("members")\
        .select("status, end_date")\
        .eq("id", member_id)\
        .execute()
    
    if not member_res.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    member = member_res.data[0]
    
    # 3. Calcular fechas (renovación anticipada si aún está activo)
    bogota_tz = timezone(timedelta(hours=-5))
    now = datetime.now(bogota_tz)
    
    if member.get("status") == "active" and member.get("end_date"):
        try:
            current_end = datetime.fromisoformat(member["end_date"])
            if current_end.tzinfo is None:
                current_end = current_end.replace(tzinfo=bogota_tz)
            start_date = current_end.date().isoformat()
            end_date = (current_end + timedelta(days=duration_days)).date().isoformat()
        except Exception:
            start_date = now.date().isoformat()
            end_date = (now + timedelta(days=duration_days)).date().isoformat()
    else:
        start_date = now.date().isoformat()
        end_date = (now + timedelta(days=duration_days)).date().isoformat()
    
    # 4. Registrar pago
    payment_res = supabase_client.table("payments").insert({
        "member_id": member_id,
        "amount": data.amount,
        "method": data.method,
        "plan": data.plan,
        "status": "confirmed",
        "registered_by": admin_user_id,
        "plan_start_date": start_date,
        "plan_end_date": end_date
    }).execute()

    if not payment_res.data:
        raise HTTPException(status_code=500, detail="Error al registrar pago en base de datos")
    
    payment = payment_res.data[0]
    
    # 5. Actualizar member
    supabase_client.table("members").update({
        "status": "active",
        "plan": data.plan,
        "start_date": start_date,
        "end_date": end_date,
        "updated_at": now.isoformat()
    }).eq("id", member_id).execute()
    
    # 6. Si plan 15_days: cerrar day_passes previos + crear nuevo
    if data.plan == "15_days":
        valid_until = (now + timedelta(days=30)).date().isoformat()
        
        supabase_client.table("member_day_passes")\
            .update({"status": "exhausted"})\
            .eq("member_id", member_id)\
            .eq("status", "active")\
            .execute()
        
        supabase_client.table("member_day_passes").insert({
            "member_id": member_id,
            "payment_id": payment["id"],
            "days_total": 15,
            "days_used": 0,
            "valid_from": start_date,
            "valid_until": valid_until,
            "status": "active"
        }).execute()
    
    # 7. Reactivar chip (no bloqueante)
    try:
        member_full = supabase_client.table("members")\
            .select("card_no, zkteco_user_id, profile_id")\
            .eq("id", member_id)\
            .execute()
        
        if member_full.data and member_full.data[0].get("card_no"):
            m = member_full.data[0]
            profile = supabase_client.table("profiles")\
                .select("full_name")\
                .eq("id", m["profile_id"])\
                .execute()
            full_name = profile.data[0]["full_name"] if profile.data else "Miembro"
            
            await activate_member(
                member_id=member_id,
                card_no=m["card_no"],
                zkteco_user_id=m["zkteco_user_id"],
                full_name=full_name
            )
    except Exception as e:
        logger.warning(f"[PAYMENT] No se pudo reactivar chip: {e}")
    
    return {"status": "ok", "payment_id": payment["id"]}


# ----------------------------------------------------
# ADMIN PLANS
# ----------------------------------------------------
class PlanRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[str] = None
    duration_days: Optional[int] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    is_active: Optional[bool] = None


@router.get("/admin/plans")
async def get_plans(authorization: Optional[str] = Header(None)):
    """Devuelve todos los planes ordenados por precio ascendente para gestión administrativa."""
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        res = supabase_client.table("plans")\
            .select("*")\
            .order("price", desc=False)\
            .execute()
        return {"plans": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al consultar planes: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener planes: {str(e)}"
        )


@router.post("/admin/plans")
async def create_plan(data: PlanRequest, authorization: Optional[str] = Header(None)):
    """Crea un nuevo plan (solo super_admin)."""
    role = get_current_user_role(authorization)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        plan_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if "is_active" in plan_dict and "active" not in plan_dict:
            plan_dict["active"] = plan_dict.pop("is_active")
        elif "is_active" in plan_dict:
            plan_dict.pop("is_active")
            
        res = supabase_client.table("plans").insert(plan_dict).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Error al crear plan en base de datos")
        return {"plan": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al crear plan: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear plan: {str(e)}"
        )


@router.put("/admin/plans/{plan_id}")
async def update_plan(plan_id: str, data: PlanRequest, authorization: Optional[str] = Header(None)):
    """Actualiza un plan existente (solo super_admin)."""
    role = get_current_user_role(authorization)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        plan_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if "is_active" in plan_dict and "active" not in plan_dict:
            plan_dict["active"] = plan_dict.pop("is_active")
        elif "is_active" in plan_dict:
            plan_dict.pop("is_active")
            
        res = supabase_client.table("plans").update(plan_dict).eq("id", plan_id).execute()
        return {"status": "ok", "plan": res.data[0] if res.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al actualizar plan: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar plan: {str(e)}"
        )


# ----------------------------------------------------
# ADMIN GROUP PRICING
# ----------------------------------------------------
class GroupPricingRequest(BaseModel):
    min_members: int
    max_members: Optional[int] = None
    price_per_person: Optional[float] = None
    discount_percentage: Optional[float] = None
    plan_id: Optional[str] = None
    plan_slug: Optional[str] = None
    active: Optional[bool] = True


@router.get("/admin/group-pricing")
async def get_group_pricing(authorization: Optional[str] = Header(None)):
    """Obtiene la configuración de precios grupales."""
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        res = supabase_client.table("plan_group_pricing")\
            .select("*")\
            .order("min_members", desc=False)\
            .execute()
        return {"pricing": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al consultar precios grupales: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener precios grupales: {str(e)}"
        )


@router.post("/admin/group-pricing")
async def create_group_pricing(data: GroupPricingRequest, authorization: Optional[str] = Header(None)):
    """Crea un nuevo rango de precio grupal (solo super_admin)."""
    role = get_current_user_role(authorization)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        pricing_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        pricing_dict.pop("discount_percentage", None)
        pricing_dict.pop("plan_slug", None)
        
        res = supabase_client.table("plan_group_pricing").insert(pricing_dict).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Error al crear precio grupal")
        return {"pricing": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al crear precio grupal: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear precio grupal: {str(e)}"
        )


@router.put("/admin/group-pricing/{pricing_id}")
async def update_group_pricing(pricing_id: str, data: GroupPricingRequest, authorization: Optional[str] = Header(None)):
    """Actualiza un rango de precio grupal existente (solo super_admin)."""
    role = get_current_user_role(authorization)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        pricing_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        pricing_dict.pop("discount_percentage", None)
        pricing_dict.pop("plan_slug", None)
        
        res = supabase_client.table("plan_group_pricing").update(pricing_dict).eq("id", pricing_id).execute()
        return {"status": "ok", "pricing": res.data[0] if res.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al actualizar precio grupal: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar precio grupal: {str(e)}"
        )


# ----------------------------------------------------
# ADMIN COMMUNICATIONS
# ----------------------------------------------------
@router.get("/admin/communications")
async def get_communications(authorization: Optional[str] = Header(None)):
    """Historial de comunicados enviados con el perfil del emisor."""
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    try:
        res = supabase_client.table("communications")\
            .select("*, sent_by_profile:profiles!communications_sent_by_fkey(full_name)")\
            .order("sent_at", desc=True)\
            .execute()
        return {"communications": res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[ADMIN] Error al consultar comunicaciones: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener comunicaciones: {str(e)}"
        )


