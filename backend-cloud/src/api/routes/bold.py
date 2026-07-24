import os
import hashlib
import hmac
import base64
import json
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Header, HTTPException, Request, status
from src.infrastructure.supabase import supabase_client

router = APIRouter(tags=["bold"])

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
    
    # Validar firma si el secreto del webhook está configurado
    if secret:
        if not x_bold_signature:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No autorizado: Falta firma x-bold-signature"
            )
            
        # Convertir cuerpo a Base64 para el cálculo del HMAC
        body_base64 = base64.b64encode(body_bytes).decode('utf-8')
        
        # Calcular HMAC-SHA256
        computed_sig = hmac.new(
            key=secret.encode('utf-8'),
            msg=body_base64.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(computed_sig, x_bold_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No autorizado: Firma del webhook inválida"
            )
            
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
        
    # Buscar datos del miembro y plan en metadatos del pago
    member_id = metadata.get("member_id")
    plan_slug = metadata.get("plan")
    
    # Buscar en metadatos del nivel superior del payload por si acaso
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
    
    # Convertir monto a COP (de centavos a pesos)
    amount_cop = float(amount_total) / 100.0 if amount_total else 0.0
    
    # Validar idempotencia para evitar procesar el mismo webhook dos veces
    if tx_id:
        payment_check = supabase_client.table("payments").select("id").eq("transaction_id", tx_id).execute()
        if payment_check.data:
            return {"status": "ok", "message": "Pago ya registrado anteriormente"}
            
    if event_type == "SALE_APPROVED":
        if not member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró el member_id en los metadatos de la transacción"
            )
            
        # Consultar duración del plan en la tabla plans
        duration_days = 30
        if plan_slug:
            plan_res = supabase_client.table("plans").select("duration_days").eq("slug", plan_slug).execute()
            if plan_res.data:
                duration_days = plan_res.data[0].get("duration_days", 30)
                
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
        
        # 2. Registrar el pago en la tabla payments como confirmado
        payment_data = {
            "member_id": member_id,
            "amount": amount_cop,
            "method": "bold",
            "plan": plan_slug,
            "transaction_id": tx_id,
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
            
        return {"status": "ok", "message": "Venta aprobada procesada exitosamente"}
        
    elif event_type == "SALE_REJECTED":
        # Registrar el pago en la tabla payments como fallido
        payment_data = {
            "amount": amount_cop,
            "method": "bold",
            "plan": plan_slug,
            "transaction_id": tx_id,
            "status": "failed",
            "payment_date": datetime.now().isoformat()
        }
        if member_id:
            payment_data["member_id"] = member_id
            
        supabase_client.table("payments").insert(payment_data).execute()
        
        return {"status": "ok", "message": "Venta rechazada registrada exitosamente"}
        
    else:
        return {"status": "ignored", "message": f"Tipo de evento '{event_type}' no requiere acción"}
