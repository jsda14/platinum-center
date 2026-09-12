from dotenv import load_dotenv
load_dotenv()
import os
import httpx
from supabase import create_client, Client

_supabase_url = os.getenv("SUPABASE_URL")
_supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not _supabase_url or not _supabase_key:
    raise ValueError("Faltan las variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SECRET_KEY)")

# Forzar HTTP/1.1 para evitar ConnectionTerminated con HTTP/2
http_client = httpx.Client(http2=False)
supabase_client: Client = create_client(
    _supabase_url,
    _supabase_key,
    options={"httpx_client": http_client} if hasattr(__import__('supabase'), 'ClientOptions') else {}
)
