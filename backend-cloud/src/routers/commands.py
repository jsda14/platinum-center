import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from src.infrastructure.supabase import supabase_client

router = APIRouter(prefix="/admin", tags=["commands"])

@router.get("/pending-commands")
async def get_pending_commands(authorization: Optional[str] = Header(None)):
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    if not authorization or authorization != f"Bearer {tunnel_secret}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")
    
    res = supabase_client.table("pending_commands")\
        .select("*")\
        .eq("status", "pending")\
        .order("created_at")\
        .execute()
    
    return {"commands": res.data or []}

@router.post("/pending-commands/{command_id}/done")
async def mark_command_done(command_id: str, authorization: Optional[str] = Header(None)):
    tunnel_secret = os.getenv("TUNNEL_SECRET")
    if not authorization or authorization != f"Bearer {tunnel_secret}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")
    
    supabase_client.table("pending_commands")\
        .update({"status": "done", "executed_at": datetime.now(timezone.utc).isoformat()})\
        .eq("id", command_id)\
        .execute()
    
    return {"status": "ok"}
