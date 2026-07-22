import os
from supabase import create_client, Client

_supabase_url = os.getenv("SUPABASE_URL")
_supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not _supabase_url or not _supabase_key:
    raise ValueError("Faltan las variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SECRET_KEY)")

supabase_client: Client = create_client(_supabase_url, _supabase_key)
