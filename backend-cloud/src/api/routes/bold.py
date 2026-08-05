import os
import hashlib
import hmac
import base64
import json
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Header, HTTPException, Request, status
from src.infrastructure.supabase import supabase_client
import httpx
from src.infrastructure.zkteco.tunnel_client import activate_member

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

from pydantic import BaseModel

class PaymentIntentCreate(BaseModel):
    order_id: str
    member_id: str
    plan_slug: str
    amount: float

router = APIRouter(tags=["bold"])

@router.post("/bold/create-payment-intent")
def create_payment_intent(data: PaymentIntentCreate):
    """
    Registra una intención de pago en la base de datos para conciliación posterior en el webhook
    """
    try:
        res = supabase_client.table("payment_intents").insert({
            "order_id": data.order_id,
            "member_id": data.member_id,
            "plan_slug": data.plan_slug,
            "amount": data.amount
        }).execute()
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo registrar la intención de pago en la base de datos"
            )
        return {"status": "ok", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en base de datos: {str(e)}"
        )

@router.get("/bold/integrity-signature")
def get_integrity_signature(order_id: str, amount: int, currency: str = "COP"):
    """
    Genera el hash de integridad SHA-256 requerido por Bold:
    SHA256(order_id + amount + currency + secret_key)
    """
    secret_key = os.getenv("BOLD_SECRET_KEY")
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falta la configuración de BOLD_SECRET_KEY en el servidor"
        )
    
    # El monto debe estar en centavos como string
    concat_str = f"{order_id}{amount}{currency}{secret_key}"
    signature = hashlib.sha256(concat_str.encode('utf-8')).hexdigest()
    
    print(f"[BOLD SIGNATURE] order_id: {order_id}")
    print(f"[BOLD SIGNATURE] amount: {amount}")
    print(f"[BOLD SIGNATURE] currency: {currency}")
    print(f"[BOLD SIGNATURE] concat_str: {order_id}{amount}{currency}[SECRET]")
    print(f"[BOLD SIGNATURE] signature: {signature}")
    
    return {"signature": signature}

@router.post("/webhooks/bold-payment")
async def bold_payment_webhook(
    request: Request,
    x_bold_signature: str = Header(None)
):
    """
    Recibe eventos de pago de Bold (venta aprobada/rechazada) y actualiza la base de datos
    """
    secret = os.getenv("BOLD_WEBHOOK_SECRET")
    
    # Leer el cuerpo de la petición crudo
    body_bytes = await request.body()
    
    print(f"[BOLD WEBHOOK] Headers recibidos: {dict(request.headers)}")
    print(f"[BOLD WEBHOOK] Body completo: {body_bytes.decode('utf-8')}")
    
    # Validar firma si el secreto del webhook está configurado
    # if secret:
    #     if not x_bold_signature:
    #         raise HTTPException(
    #             status_code=status.HTTP_401_UNAUTHORIZED,
    #             detail="No autorizado: Falta firma x-bold-signature"
    #         )
    #         
    #     # Calcular HMAC-SHA256
    #     computed_sig = hmac.new(
    #         key=secret.encode('utf-8'),
    #         msg=body_bytes,
    #         digestmod=hashlib.sha256
    #     ).hexdigest()
    #     
    #     if not hmac.compare_digest(computed_sig, x_bold_signature):
    #         raise HTTPException(
    #             status_code=status.HTTP_401_UNAUTHORIZED,
    #             detail="No autorizado: Firma del webhook inválida"
    #         )
            
    # Parsear payload
    try:
        payload = json.loads(body_bytes.decode('utf-8'))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuerpo de petición no es un JSON válido"
        )
        
    event_type = payload.get("type")
    data = payload.get("data", {})
    
    # Obtener metadatos
    metadata = data.get("metadata", {})
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except Exception:
            pass
            
    if not isinstance(metadata, dict):
        metadata = {}
        
    # Buscar en la tabla payment_intents usando data.metadata.reference como order_id
    order_id = metadata.get("reference")
    member_id = None
    plan_slug = None
    intent_amount = None
    
    if order_id:
        try:
            intent_res = supabase_client.table("payment_intents").select("*").eq("order_id", order_id).execute()
            if intent_res.data:
                intent_data = intent_res.data[0]
                member_id = intent_data.get("member_id")
                plan_slug = intent_data.get("plan_slug")
                intent_amount = float(intent_data.get("amount", 0.0))
                print(f"[BOLD WEBHOOK] Intención de pago encontrada: member_id={member_id}, plan_slug={plan_slug}, amount={intent_amount}")
        except Exception as e:
            print(f"[BOLD WEBHOOK] Error al consultar payment_intents: {str(e)}")
            
    # Fallback por si acaso
    if not member_id or not plan_slug:
        member_id = metadata.get("member_id")
        plan_slug = metadata.get("plan")
        if not member_id or not plan_slug:
            root_metadata = payload.get("metadata", {})
            if isinstance(root_metadata, str):
                try:
                    root_metadata = json.loads(root_metadata)
                except Exception:
                    pass
            if isinstance(root_metadata, dict):
                member_id = member_id or root_metadata.get("member_id")
                plan_slug = plan_slug or root_metadata.get("plan")
                
    # Identificadores de transacción
    tx_id = data.get("payment_id") or payload.get("subject")
    amount_total = data.get("amount", {}).get("total", 0)
    
    # Determinar si el monto viene en centavos (ej: 6000000) o pesos (ej: 60000)
    # Si es mayor a 2,000,000 (2 millones COP), probablemente son centavos.
    if amount_total > 2000000:
        amount_cop = float(amount_total) / 100.0
    else:
        amount_cop = float(amount_total)
        
    # Si se encontró en la intención de pago, priorizar ese monto
    if intent_amount:
        amount_cop = intent_amount
    
    # Validar idempotencia para evitar procesar el mismo webhook dos veces
    # Solo verificar idempotencia si el tx_id es un valor real y no "XXXX" de pruebas
    if tx_id and tx_id != "XXXX":
        payment_check = supabase_client.table("payments").select("id").eq("transaction_id", tx_id).execute()
        if payment_check.data:
            return {"status": "ok", "message": "Pago ya registrado anteriormente"}
            
    if event_type == "SALE_APPROVED":
        if not member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró el member_id en los metadatos de la transacción"
            )
            
        # Consultar duración y precio del plan en la tabla plans
        duration_days = 30
        plan_price = 0.0
        if plan_slug:
            plan_res = supabase_client.table("plans").select("duration_days", "price").eq("slug", plan_slug).execute()
            if plan_res.data:
                duration_days = plan_res.data[0].get("duration_days", 30)
                plan_price = float(plan_res.data[0].get("price", 0.0))
                
        # Si logramos obtener el precio oficial del plan, lo usamos como valor definitivo
        if plan_price:
            amount_cop = plan_price
                
        # Calcular vigencia de la membresía
        start_date = date.today()
        end_date = start_date + timedelta(days=duration_days)
        

        # 1. Actualizar membresía en la tabla members
        supabase_client.table("members").update({
            "status": "active",
            "plan": plan_slug,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "updated_at": datetime.now().isoformat()
        }).eq("id", member_id).execute()

        # Buscar el miembro para obtener card_no, zkteco_user_id, full_name
        try:
            m_res = supabase_client.table("members")\
                .select("card_no, zkteco_user_id, profile_id")\
                .eq("id", member_id)\
                .execute()
            if m_res.data:
                m_data = m_res.data[0]
                card_no = m_data.get("card_no")
                zkteco_user_id = m_data.get("zkteco_user_id")
                profile_id = m_data.get("profile_id")
                
                full_name = "Miembro"
                if profile_id:
                    p_res = supabase_client.table("profiles").select("full_name").eq("id", profile_id).execute()
                    if p_res.data:
                        full_name = p_res.data[0].get("full_name", "Miembro")
                
                if card_no:
                    await activate_member(
                        member_id=member_id,
                        card_no=card_no,
                        zkteco_user_id=zkteco_user_id or "",
                        full_name=full_name,
                        sn=None
                    )
                else:
                    print("[CHIP] Miembro sin chip — omitiendo activación ZKTeco")
        except Exception as z_err:
            print(f"[ZKTeco] Error al intentar activar miembro tras pago: {str(z_err)}")
        
        # 2. Registrar el pago en la tabla payments como confirmado
        payment_data = {
            "member_id": member_id,
            "amount": amount_cop,
            "method": "bold",
            "plan": plan_slug,
            "transaction_id": tx_id if tx_id and tx_id != "XXXX" else None,
            "status": "confirmed",
            "plan_start_date": start_date.isoformat(),
            "plan_end_date": end_date.isoformat(),
            "payment_date": datetime.now().isoformat()
        }
        payment_res = supabase_client.table("payments").insert(payment_data).execute()
        
        # 3. Si el plan es de 15 días consumibles, inicializar su contador
        if plan_slug == "15_days" and payment_res.data:
            payment_id = payment_res.data[0].get("id")
            
            # Desactivar cualquier pase anterior que estuviera activo
            supabase_client.table("member_day_passes").update({
                "status": "expired",
                "updated_at": datetime.now().isoformat()
            }).eq("member_id", member_id).eq("status", "active").execute()
            
            # Insertar el nuevo pase
            day_pass_data = {
                "member_id": member_id,
                "payment_id": payment_id,
                "days_total": 15,
                "days_used": 0,
                "valid_from": start_date.isoformat(),
                "valid_until": end_date.isoformat(),
                "status": "active"
            }
            supabase_client.table("member_day_passes").insert(day_pass_data).execute()
            
        # 4. Invocar la Edge Function de Supabase para enviar notificaciones de confirmación de pago
        print(f"[NOTIFY] Buscando perfil para member_id: {member_id}")
        try:
            # Buscar en la tabla members para obtener el profile_id
            member_res = supabase_client.table("members").select("profile_id").eq("id", member_id).execute()
            if member_res.data:
                profile_id = member_res.data[0].get("profile_id")
                if profile_id:
                    profile_res = supabase_client.table("profiles").select("email", "full_name").eq("id", profile_id).execute()
                    print(f"[NOTIFY] Perfil encontrado: {profile_res.data}")
                    if profile_res.data:
                        profile_data = profile_res.data[0]
                        member_email = profile_data.get("email")
                        member_name = profile_data.get("full_name") or "Miembro"
                        
                        if member_email:
                            print(f"[NOTIFY] Invocando Edge Function PAYMENT_CONFIRMED...")
                            # Enviar correo al miembro
                            await invoke_send_notification({
                                'type': 'PAYMENT_CONFIRMED',
                                'member_email': member_email,
                                'member_name': member_name,
                                'plan': plan_slug,
                                'amount': amount_cop,
                                'end_date': end_date.isoformat()
                            })
                            print(f"[NOTIFY] Edge Function invocada (miembro)")
                            
                            print(f"[NOTIFY] Invocando Edge Function PAYMENT_CONFIRMED_ADMIN...")
                            # Enviar correo al admin
                            try:
                                admins_res = supabase_client.table("profiles")\
                                    .select("email", "full_name")\
                                    .in_("role", ["super_admin", "receptionist"])\
                                    .execute()
                                admin_emails = [
                                    {"email": a.get("email"), "name": a.get("full_name") or "Admin"}
                                    for a in admins_res.data
                                    if a.get("email")
                                ]
                            except Exception as db_err:
                                print(f"[NOTIFY] Error query admins: {str(db_err)}")
                                admin_emails = []

                            await invoke_send_notification({
                                'type': 'PAYMENT_CONFIRMED_ADMIN',
                                'member_email': member_email,
                                'member_name': member_name,
                                'plan': plan_slug,
                                'amount': amount_cop,
                                'end_date': end_date.isoformat(),
                                'admin_emails': admin_emails
                            })
                            print(f"[NOTIFY] Edge Function invocada (admin)")
        except Exception as fn_err:
            print(f"[NOTIFY] Error: {str(fn_err)}")
            
        return {"status": "ok", "message": "Venta aprobada procesada exitosamente"}
        
    elif event_type == "SALE_REJECTED":
        # Consultar precio del plan en la tabla plans para registrar el monto correcto en caso de rechazo
        plan_price = 0.0
        if plan_slug:
            plan_res = supabase_client.table("plans").select("price").eq("slug", plan_slug).execute()
            if plan_res.data:
                plan_price = float(plan_res.data[0].get("price", 0.0))
        if plan_price:
            amount_cop = plan_price

        # Registrar el pago en la tabla payments como fallido
        payment_data = {
            "amount": amount_cop,
            "method": "bold",
            "plan": plan_slug,
            "transaction_id": tx_id if tx_id and tx_id != "XXXX" else None,
            "status": "failed",
            "payment_date": datetime.now().isoformat()
        }
        if member_id:
            payment_data["member_id"] = member_id
            
        supabase_client.table("payments").insert(payment_data).execute()
        
        # Invocar la Edge Function de Supabase para enviar notificación de pago rechazado
        if member_id:
            try:
                # Buscar en la tabla members para obtener el profile_id
                member_res = supabase_client.table("members").select("profile_id").eq("id", member_id).execute()
                if member_res.data:
                    profile_id = member_res.data[0].get("profile_id")
                    if profile_id:
                        profile_res = supabase_client.table("profiles").select("email", "full_name").eq("id", profile_id).execute()
                        if profile_res.data:
                            profile_data = profile_res.data[0]
                            member_email = profile_data.get("email")
                            member_name = profile_data.get("full_name") or "Miembro"
                            
                            if member_email:
                                await invoke_send_notification({
                                    'type': 'PAYMENT_REJECTED',
                                    'member_email': member_email,
                                    'member_name': member_name
                                })
                                print("[SUPABASE FUNCTIONS] Notificación de pago rechazado enviada al miembro")
            except Exception as fn_err:
                print(f"[SUPABASE FUNCTIONS] Error al invocar Edge Function de notificaciones para pago rechazado: {str(fn_err)}")
        
        return {"status": "ok", "message": "Venta rechazada registrada exitosamente"}
        
    else:
        return {"status": "ignored", "message": f"Tipo de evento '{event_type}' no requiere acción"}
