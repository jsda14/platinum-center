import os
import httpx
import logging

logger = logging.getLogger(__name__)

async def activate_member(member_id: str, card_no: str, zkteco_user_id: str, 
                          full_name: str, sn: str = None) -> bool:
    gym_tunnel_url = os.getenv("GYM_TUNNEL_URL")
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    
    if not gym_tunnel_url:
        logger.warning("[TUNNEL] GYM_TUNNEL_URL no está configurado. Omitiendo activación.")
        return False
        
    url = f"{gym_tunnel_url.rstrip('/')}/webhook/activate-member"
    headers = {
        "X-Tunnel-Secret": tunnel_secret or "",
        "Content-Type": "application/json"
    }
    payload = {
        "member_id": member_id,
        "card_no": card_no,
        "zkteco_user_id": zkteco_user_id,
        "full_name": full_name,
        "sn": sn or "PLATINUM001"  
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code == 200:
                logger.info(f"[TUNNEL] Activación exitosa para miembro {member_id}: {response.text}")
                return True
            else:
                logger.error(f"[TUNNEL] Error de activación para miembro {member_id}. HTTP {response.status_code}: {response.text}")
                return False
    except Exception as e:
        logger.error(f"[TUNNEL] Excepción al activar miembro {member_id}: {str(e)}")
        return False

async def deactivate_member(member_id: str, zkteco_user_id: str, 
                            full_name: str, sn: str = None) -> bool:
    gym_tunnel_url = os.getenv("GYM_TUNNEL_URL")
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    
    if not gym_tunnel_url:
        logger.warning("[TUNNEL] GYM_TUNNEL_URL no está configurado. Omitiendo desactivación.")
        return False
        
    url = f"{gym_tunnel_url.rstrip('/')}/webhook/deactivate-member"
    headers = {
        "X-Tunnel-Secret": tunnel_secret or "",
        "Content-Type": "application/json"
    }
    payload = {
        "member_id": member_id,
        "zkteco_user_id": zkteco_user_id,
        "full_name": full_name,
        "sn": sn
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=10.0)
            if response.status_code == 200:
                logger.info(f"[TUNNEL] Desactivación exitosa para miembro {member_id}: {response.text}")
                return True
            else:
                logger.error(f"[TUNNEL] Error de desactivación para miembro {member_id}. HTTP {response.status_code}: {response.text}")
                return False
    except Exception as e:
        import traceback
        logger.error(f"[TUNNEL] Excepción al desactivar miembro {member_id}: {type(e).__name__}: {str(e)}")
        logger.error(f"[TUNNEL] Traceback: {traceback.format_exc()}")
        return False

async def sync_member(action: str, member_id: str, card_no: str, 
                      zkteco_user_id: str, full_name: str, sn: str = None) -> bool:
    if action == "activate":
        return await activate_member(member_id, card_no, zkteco_user_id, full_name, sn)
    elif action == "deactivate":
        return await deactivate_member(member_id, zkteco_user_id, full_name, sn)
    else:
        logger.error(f"[TUNNEL] Acción desconocida: {action}")
        return False
