from src.infrastructure.supabase import supabase_client
from fastapi import APIRouter
from pydantic import BaseModel

class GetOrCreateMemberRequest(BaseModel):
    profile_id: str

router = APIRouter(tags=["members"])

@router.post("/members/get-or-create")
async def get_or_create_member(data: GetOrCreateMemberRequest):
    """
    Obtiene o crea un registro en members para el profile_id dado.
    Usa service role — bypasea RLS.
    """
    profile_id = data.profile_id
    # Buscar primero
    res = supabase_client.table("members")\
        .select("*")\
        .eq("profile_id", profile_id)\
        .maybeSingle()\
        .execute()
    
    if res.data:
        return res.data
    
    # Si no existe, crear
    insert_res = supabase_client.table("members").insert({
        "profile_id": profile_id,
        "status": "inactive"
    }).execute()
    
    return insert_res.data[0]