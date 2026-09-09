# Backend Standards — Platinum Center

> Este archivo define los estándares de desarrollo para `backend-cloud/`.
> Agy debe leerlo antes de implementar cualquier tarea de backend.
> Aplica arquitectura hexagonal (clean architecture) + FastAPI + Supabase.

---

## Arquitectura hexagonal — estructura `backend-cloud/src/`

```
src/
├── domain/           # Entidades, tipos, Pydantic schemas — sin dependencias externas
│   ├── member/
│   │   ├── member.types.py     # Dataclasses y enums del dominio
│   │   └── member.schemas.py   # Pydantic schemas de entrada/salida
│   └── gym/
├── application/      # Casos de uso — orquestan el dominio, no conocen FastAPI ni Supabase
│   ├── member/
│   │   └── register_member.usecase.py
│   └── gym/
├── infrastructure/   # Implementaciones externas — Supabase, Bold, Brevo, tunnel
│   ├── supabase/
│   │   ├── client.py           # supabase_client singleton
│   │   └── member.repository.py
│   ├── zkteco/
│   │   └── tunnel_client.py
│   └── bold/
└── routers/          # FastAPI routers — punto de entrada HTTP, delegan a application/
    ├── members.py
    ├── payments.py
    ├── gym.py
    └── zkteco.py
```

### Regla de dependencias (estricta)
```
routers → application → domain
routers → infrastructure (solo para inyección)
application → domain
application → infrastructure (via interfaces, no directo)
domain → nada externo
```

❌ Nunca: lógica de negocio en routers
❌ Nunca: llamadas directas a Supabase en routers
❌ Nunca: imports de FastAPI en domain o application

---

## Estructura de un router

```python
# backend-cloud/src/routers/gym.py
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
from src.infrastructure.supabase.client import supabase_client
from src.domain.gym.gym.schemas import GymStatusResponse

router = APIRouter(prefix="/gym", tags=["gym"])


@router.get("/status", response_model=GymStatusResponse)
async def get_gym_status():
    """Descripción clara de qué hace el endpoint."""
    try:
        # lógica aquí
        pass
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno: {str(e)}"
        )
```

Registrar en `main.py`:
```python
from src.routers.gym import router as gym_router
app.include_router(gym_router)
```

---

## Schemas Pydantic

Todos los schemas van en `src/domain/{dominio}/{dominio}.schemas.py`.

```python
# src/domain/gym/gym.schemas.py
from pydantic import BaseModel
from typing import Optional

class GymStatusResponse(BaseModel):
    is_open: bool
    opens_at: Optional[str] = None
    closes_at: Optional[str] = None
    minutes_to_close: Optional[int] = None
    message: Optional[str] = None
```

Reglas:
- Request schemas: sufijo `Request` (ej: `AssignChipRequest`)
- Response schemas: sufijo `Response` (ej: `GymStatusResponse`)
- Schemas internos sin sufijo (ej: `MemberDay`)
- Siempre usar `Optional` con valor por defecto para campos opcionales
- Nunca devolver datos sin schema — usar `response_model` en el endpoint

---

## Queries a Supabase

```python
# Patrón estándar — siempre manejar el caso de datos vacíos
res = supabase_client.table("members")\
    .select("id, card_no, plan")\
    .eq("id", member_id)\
    .execute()

if not res.data:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Miembro no encontrado"
    )

member = res.data[0]
```

Reglas:
- Siempre verificar `res.data` antes de acceder
- Seleccionar solo las columnas necesarias — nunca `select("*")` en producción
- Usar `.or_()` para búsquedas con múltiples formatos (ej: card_no con/sin ceros)
- Operaciones de escritura: siempre loguear resultado

```python
# Búsqueda con normalización (ej: card_no)
normalized = data.card_no.lstrip("0") or "0"
res = supabase_client.table("members")\
    .select("id, card_no")\
    .or_(f"card_no.eq.{data.card_no},card_no.eq.{normalized}")\
    .execute()

# Insert
insert_res = supabase_client.table("access_logs").insert({
    "member_id": member_id,
    "card_no": card_no,
    "event_type": "granted",
    "timestamp": timestamp,
}).execute()

# Update
supabase_client.table("members")\
    .update({"status": "expired"})\
    .eq("id", member_id)\
    .execute()
```

---

## Validación de roles y autorización

```python
from src.infrastructure.supabase.auth import get_current_user_role

@router.post("/admin/something")
async def admin_action(
    data: SomeRequest,
    authorization: Optional[str] = Header(None)
):
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción"
        )
    # lógica aquí
```

Reglas de acceso por rol:
- `super_admin`: acceso total
- `receptionist`: registrar miembros, pagos, ver info — sin config ni reportes
- `member`: solo su propio portal
- Endpoints públicos (`/gym/status`, `/health`): sin validación de rol

---

## Manejo de errores

```python
# HTTPException para errores de negocio conocidos
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Miembro no encontrado"
)

raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="El chip ya está asignado a otro miembro"
)

raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="No tienes permisos para realizar esta acción"
)

# Exception genérica para errores inesperados — siempre al final
except HTTPException:
    raise  # re-raise sin transformar
except Exception as e:
    logger.error(f"[ENDPOINT] Error inesperado: {str(e)}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Error interno: {str(e)}"
    )
```

❌ Nunca: capturar `Exception` sin re-lanzar o logguear
❌ Nunca: devolver `{"error": "algo"}` con status 200
✅ Siempre: HTTP status code correcto + `detail` descriptivo

---

## Logging

```python
import logging
logger = logging.getLogger(__name__)

# Niveles
logger.info("[ROUTER] Acción iniciada para miembro {member_id}")
logger.warning("[ROUTER] Chip no encontrado en ZKBioSecurity — card_no: {card_no}")
logger.error("[ROUTER] Error inesperado: {str(e)}")
logger.debug("[ROUTER] Respuesta Supabase: {res.data}")
```

Convención de prefijos en logs:
- `[ROUTER]` — en routers
- `[USECASE]` — en casos de uso
- `[REPO]` — en repositories
- `[TUNNEL]` — en tunnel_client
- `[WEBHOOK]` — en webhooks

---

## Background tasks

Usar cuando la respuesta no debe esperar a que termine la operación:

```python
from fastapi import BackgroundTasks

@router.post("/zkteco/access-event")
async def access_event(data: AccessEventRequest, background_tasks: BackgroundTasks):
    # responder inmediatamente
    background_tasks.add_task(forward_to_railway, data)
    return {"status": "queued"}
```

Usar background tasks para:
- Envío de emails
- Llamadas al Bridge (tunnel)
- Notificaciones

No usar para:
- Operaciones que el cliente necesita confirmar antes de continuar
- Escrituras críticas a Supabase que afectan la respuesta

---

## Fechas y zonas horarias

El gym opera en Bogotá — siempre usar `America/Bogota`:

```python
from datetime import datetime
import pytz

bogota_tz = pytz.timezone("America/Bogota")
now = datetime.now(bogota_tz)
weekday = now.strftime("%A").lower()  # "monday", "tuesday", etc.

# Para guardar en Supabase (UTC)
from datetime import timezone
now_utc = datetime.now(timezone.utc).isoformat()
```

❌ Nunca: `datetime.now()` sin timezone
✅ Siempre: especificar timezone explícitamente

---

## Convención de nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos | snake_case | `member_repository.py` |
| Clases | PascalCase | `MemberRepository` |
| Funciones/métodos | snake_case | `get_member_by_id` |
| Variables | snake_case | `member_id`, `card_no` |
| Constantes | UPPER_SNAKE | `MAX_RETRIES = 3` |
| Endpoints URL | kebab-case | `/admin/assign-chip` |
| Campos Pydantic | snake_case | `member_id`, `opens_at` |

---

## Estructura de respuestas estándar

```python
# Éxito con datos
return {"status": "ok", "data": {...}}

# Éxito sin datos
return {"status": "ok"}

# Éxito con estado específico
return {"status": "queued", "command_id": command_id}
return {"status": "no_chip", "message": "Sin chip asignado"}

# Error — siempre via HTTPException, nunca en el body con status 200
raise HTTPException(status_code=404, detail="No encontrado")
```

---

## Checklist antes de entregar una tarea de backend

- [ ] Schema Pydantic definido en `domain/`
- [ ] Endpoint en `routers/` con `response_model`
- [ ] Validación de rol si aplica
- [ ] Queries Supabase verifican `res.data` antes de acceder
- [ ] Try/except con HTTPException re-lanzado y Exception genérica al final
- [ ] Logs con prefijo correcto en puntos clave
- [ ] Timezone explícita en cualquier operación de fecha
- [ ] Router registrado en `main.py`
- [ ] Sin lógica de negocio en el router — delegar a `application/`
EOF
---

## Principios de diseño obligatorios

### SOLID

**S — Single Responsibility (SRP)**
Cada clase, función y módulo tiene una sola razón para cambiar.
- Un router solo enruta — no valida negocio ni consulta Supabase directamente
- Un repository solo habla con Supabase — no tiene lógica de negocio
- Un caso de uso solo orquesta — no conoce FastAPI ni HTTP

**O — Open/Closed (OCP)**
Abierto para extensión, cerrado para modificación.
- Agregar un nuevo tipo de plan no debe modificar el código existente de planes
- Agregar un nuevo canal de notificación no debe tocar los casos de uso existentes

**L — Liskov Substitution (LSP)**
Las implementaciones son intercambiables con sus interfaces.
- `SupabaseMemberRepository` puede reemplazarse por `PostgresMemberRepository` sin tocar los casos de uso

**I — Interface Segregation (ISP)**
Interfaces específicas mejor que una interfaz general.
- Un repository de lectura no debe tener métodos de escritura si no los usa

**D — Dependency Inversion (DIP)**
Depender de abstracciones, no de implementaciones concretas.
- Los casos de uso reciben el repository como dependencia — no lo instancian internamente

```python
# ✅ Correcto — DIP aplicado
class RegisterMemberUseCase:
    def __init__(self, member_repo: MemberRepositoryInterface):
        self.member_repo = member_repo

# ❌ Incorrecto — acoplado a implementación
class RegisterMemberUseCase:
    def __init__(self):
        self.member_repo = SupabaseMemberRepository()
```

---

### SoC — Separación de Responsabilidades

Cada capa solo conoce su propia responsabilidad:

| Capa | Responsabilidad | No debe |
|------|----------------|---------|
| `routers/` | Recibir HTTP, validar auth, delegar | Tener lógica de negocio |
| `application/` | Orquestar casos de uso | Conocer FastAPI o Supabase |
| `domain/` | Definir entidades y reglas | Tener dependencias externas |
| `infrastructure/` | Hablar con servicios externos | Tener lógica de negocio |

---

### DRY — Don't Repeat Yourself

- Lógica de validación de roles → función reutilizable en `infrastructure/supabase/auth.py`
- Lógica de normalización de card_no → función utilitaria en `domain/`
- Queries comunes → métodos en el repository, no repetidos en cada router
- Constantes compartidas → `src/config.py`

```python
# ✅ Correcto — lógica centralizada
from src.domain.utils import normalize_card_no

normalized = normalize_card_no(data.card_no)

# ❌ Incorrecto — repetido en cada router
normalized = data.card_no.lstrip("0") or "0"
```

---

### Reglas adicionales

- **Máximo 30 líneas por función** — si es más largo, extraer en funciones auxiliares
- **Máximo 3 niveles de anidamiento** — si hay más, refactorizar con early returns
- **Early returns** para reducir anidamiento:

```python
# ✅ Correcto — early return
if not res.data:
    raise HTTPException(status_code=404, detail="No encontrado")

member = res.data[0]
# continuar lógica...

# ❌ Incorrecto — anidamiento innecesario
if res.data:
    member = res.data[0]
    if member.get("status") == "active":
        # más lógica anidada...
```

- **Nombres descriptivos** — el nombre debe explicar qué hace sin necesidad de comentario
- **Comentarios solo para el porqué**, no para el qué:

```python
# ✅ Correcto — explica el porqué
# ZKBioSecurity devuelve card_no sin ceros — normalizar para match en Supabase
normalized = data.card_no.lstrip("0") or "0"

# ❌ Incorrecto — explica lo obvio
# quitar ceros a la izquierda
normalized = data.card_no.lstrip("0") or "0"
```