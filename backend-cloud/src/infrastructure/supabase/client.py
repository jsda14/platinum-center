from dotenv import load_dotenv
load_dotenv()
import os
from supabase import create_client, Client

_supabase_url = os.getenv("SUPABASE_URL")
_supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not _supabase_url or not _supabase_key:
    raise ValueError("Faltan las variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SECRET_KEY)")

supabase_client: Client = create_client(_supabase_url, _supabase_key)


def execute_with_retry(query, max_retries: int = 2, delay: float = 0.5):
    import time
    import httpx
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            return query.execute()
        except httpx.RemoteProtocolError as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(delay)
                continue
            raise
        except Exception:
            raise
    raise last_error
