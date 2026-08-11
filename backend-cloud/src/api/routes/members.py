from src.infrastructure.supabase import supabase_client
from fastapi import APIRouter
from pydantic import BaseModel

class GetOrCreateMemberRequest(BaseModel):
    profile_id: str

router = APIRouter(tags=["members"])

@router.post("/members/get-or-create")
async def get_or_create_member(data: GetOrCreateMemberRequest):
    profile_id = data.profile_id
    
    res = supabase_client.table("members")\
        .select("*")\
        .eq("profile_id", profile_id)\
        .execute()
    
    if res.data:
        return res.data[0]
    
    insert_res = supabase_client.table("members").insert({
        "profile_id": profile_id,
        "status": "suspended"
    }).execute()
    
    return insert_res.data[0]