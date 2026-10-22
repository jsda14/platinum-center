import logging
import os
import threading
import time
from typing import Optional
from fastapi import HTTPException, status
import jwt
from jwt import PyJWKClient
from src.infrastructure.supabase.client import supabase_client

logger = logging.getLogger(__name__)

# --- Verificación local de JWT (JWKS) ---
#
# Antes get_current_user_id() llamaba a supabase_client.auth.get_user(token) en
# CADA request — una llamada de red real al servidor de Auth de Supabase, medida
# en producción entre 300ms y casi 3 segundos, y corriendo encima en paralelo por
# cada endpoint que carga una pantalla (ej. 4 requests simultáneos al abrir Pagos).
#
# El proyecto ya firma los tokens con llaves asimétricas (ECC P-256 / ES256), así
# que se pueden verificar localmente contra la llave pública del proyecto (JWKS),
# sin red por request: PyJWKClient trae el JWKS una vez y lo cachea en memoria.
_jwks_client: Optional[PyJWKClient] = None
_jwks_client_lock = threading.Lock()


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        with _jwks_client_lock:
            if _jwks_client is None:
                supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
                jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
                _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


# Cache en memoria del rol ya resuelto por usuario, para que varias peticiones
# en paralelo de una misma carga de pantalla no repitan la consulta a `profiles`.
# TTL corto (no es para ahorrar la consulta por mucho tiempo, solo para colapsar
# el "estallido" de requests simultáneos de una sola carga de página).
_role_cache: dict[str, tuple[str, float]] = {}
_ROLE_CACHE_TTL_SECONDS = 30

def extract_token_from_header(authorization: Optional[str]) -> str:
    """Valida y extrae el token Bearer del header Authorization con early returns."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el header de autorización"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido. Debe ser 'Bearer <token>'"
        )
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío"
        )
    return token

def get_current_user_id(authorization: Optional[str]) -> str:
    """
    Valida el token JWT y extrae el profile_id (auth user id).

    Verifica la firma localmente contra el JWKS del proyecto (cacheado en
    memoria, sin red por request) en vez de llamar a Supabase Auth cada vez.
    Si la verificación local falla por un problema de infraestructura (no por
    un token inválido/expirado — eso sigue rechazándose), cae de vuelta a
    validar contra Supabase directamente, más lento pero sigue siendo seguro.
    """
    token = extract_token_from_header(authorization)
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        sub = decoded.get("sub")
        if sub:
            return str(sub)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario"
        )
    except HTTPException:
        raise
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, jwt.InvalidAudienceError) as e:
        # Token genuinamente inválido/expirado — no tiene sentido reintentar contra Supabase.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {str(e)}"
        )
    except Exception as e:
        # Problema de infraestructura verificando localmente (ej. no se pudo
        # traer el JWKS) — se valida contra Supabase Auth como respaldo.
        logger.warning("[AUTH] Verificación local de JWT falló (%s), probando contra Supabase Auth", str(e))
        try:
            user_res = supabase_client.auth.get_user(token)
            if user_res and user_res.user and user_res.user.id:
                return user_res.user.id
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o error al verificar"
        )

def get_current_user_role(authorization: Optional[str]) -> str:
    """
    Obtiene el rol del usuario autenticado consultando la tabla profiles.

    Cachea el resultado por usuario por unos segundos: una sola carga de
    pantalla del admin dispara varios requests en paralelo (ej. Pagos pide
    payments + members + group-pricing + plans a la vez), y sin esto cada
    uno repetía la misma consulta a profiles por separado.
    """
    user_id = get_current_user_id(authorization)

    cached = _role_cache.get(user_id)
    if cached and (time.monotonic() - cached[1]) < _ROLE_CACHE_TTL_SECONDS:
        return cached[0]

    try:
        profile_res = supabase_client.table("profiles").select("role").eq("id", user_id).limit(1).execute()
        if not profile_res.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El perfil de usuario no existe en la base de datos"
            )
        role = profile_res.data[0].get("role", "member")
        _role_cache[user_id] = (role, time.monotonic())
        return role
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[AUTH] Error al consultar rol en profiles: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar rol de usuario: {str(e)}"
        )

def get_current_user(authorization: Optional[str]) -> dict:
    """
    Retorna el usuario actual autenticado a partir del header Authorization.
    """
    user_id = get_current_user_id(authorization)
    return {"id": user_id}

def get_current_member(authorization: Optional[str]) -> dict:
    """
    Obtiene el registro de miembro (members) asociado al usuario autenticado.
    """
    user_id = get_current_user_id(authorization)
    try:
        res = supabase_client.table("members").select("id, profile_id, status, plan, card_no").eq("profile_id", user_id).limit(1).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró registro de socio para este usuario"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("[AUTH] Error al consultar registro de miembro: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar miembro: {str(e)}"
        )

