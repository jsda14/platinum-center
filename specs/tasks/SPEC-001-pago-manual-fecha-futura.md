# SPEC: [SPEC-001] - Pago manual con fecha de inicio futura (activación programada)

### PROTOCOLO DE EJECUCIÓN AGÉNTICA (CERROJO ESTRICTO)

> Aplica a cualquier agente codificador (Claude, Gemini/Antigravity "Agy", Cursor, etc.). No es opcional.

1. **ALLOWLIST ABSOLUTA DE ARCHIVOS:** Únicamente tienes permiso de escritura sobre los archivos
   declarados en la Sección 1.1 (Archivos Autorizados). Cualquier otro archivo del repositorio tiene
   estado **BLOQUEADO para escritura**, sin excepción, aunque la sección "Prohibido modificar" no lo
   mencione explícitamente.
2. **GATE DE BLOQUEO (Stop Condition):** Si para resolver un error de compilación, tipos, linter o una
   referencia cruzada necesitas tocar un archivo fuera de la Allowlist:
   → **ABORTA INMEDIATAMENTE.** No lo corrijas por tu cuenta.
   → Emite literalmente: `[BLOCKED: Requiere cambios en <ruta_archivo>]` y cede el control al arquitecto.
3. **FASE 1 OBLIGATORIA (No-Write):** Antes de escribir o editar cualquier archivo, tu primer turno es de
   solo lectura: confirma que entendiste el diagnóstico (Sección 3) y los contratos (Sección 4), y
   enumera exactamente qué archivos de la Sección 1.1 vas a tocar y en qué orden (Sección 6). Espera
   aprobación explícita del arquitecto antes de usar herramientas de escritura.
4. **POLÍTICA DE NO-SUPOSICIÓN Y SCOPE CREEP:** Prohibido crear archivos helpers, utils o mocks no
   solicitados. Prohibido refactorizar código circundante, renombrar variables no relacionadas o
   modificar formato/estilo en líneas que no forman parte del cambio funcional. Cíñete al diff mínimo
   indispensable para satisfacer el contrato.
5. **BLOQUE DE EJECUCIÓN, NO TODO DE UNA:** Ejecuta únicamente el bloque de la Sección 6 que el
   arquitecto apruebe en ese turno. Al terminar un bloque, **detente y muestra el diff** — no continúes
   al siguiente bloque ni asumas aprobación implícita por la presencia de más pasos listados en el
   documento.
6. **COMANDOS DE GIT SEPARADOS:** Los comandos de `git commit`, `git push` y la edición de
   `specs/tasks/TASK_STATUS.md` NUNCA se ejecutan como parte de "terminar" un bloque de código. Van en
   el bloque de Cierre (Sección 6, último bloque), y solo se ejecutan cuando el arquitecto lo aprueba
   explícitamente después de validación funcional.
7. **VERIFICACIÓN DE INTEGRIDAD ANTES DE REPORTAR:** Antes de decir "listo" o "completado", ejecuta
   `git diff --name-only` y `git status --short`. Si aparece un archivo que NO está en la Sección 1.1:
   - Si es un archivo **modificado** (rastreado): revertirlo con `git restore <archivo>`.
   - Si es un archivo **nuevo** (no rastreado, aparece como `??` en `git status`): eliminarlo con
     `rm <archivo>` (`git checkout -- <archivo>` NO revierte archivos nuevos — no usar).
   No incluyas ese archivo en el diff que muestras al arquitecto.
8. **ARCHIVOS INTOCABLES SIEMPRE:** `backend-cloud/.env`, `frontend/.env.local`,
   `platinum-center-local/.env`, cualquier archivo de credenciales, `platinum-center-local/cloudflared.exe`.
   Nunca se modifican ni se incluyen en el diff, sin excepción.

---

## 1. Alcance y Fronteras

* **Objetivo:** Permitir que un pago manual con `start_date` futuro (ej. paga hoy, el plan arranca en
  5 semanas) quede correctamente registrado, visible y confirmado al admin — y que el acceso físico
  (chip RFID) permanezca bloqueado hasta esa fecha futura, activándose automáticamente ese día.
* **SPEC ID:** SPEC-001
* **Repos:** `platinum-center/backend-cloud` + `platinum-center/frontend` + `platinum-center/supabase`
  (migración)
* **Tipo:** Error (bug de confirmación + bug de seguridad de acceso) + Feature (activación programada)

### 1.1 Archivos Autorizados (ALLOWLIST)

* **Crear:**
  - `supabase/migrations/20261104000000_add_activation_applied_to_payments.sql`
* **Modificar:**
  - `backend-cloud/src/api/routes/admin.py` (función `register_payment`, líneas ~888-1105)
  - `backend-cloud/src/api/routes/cron.py` (nuevo endpoint `activate_scheduled_memberships`)
  - `frontend/src/infrastructure/supabase/admin.repository.ts` (función `registerManualPayment`,
    líneas ~281-313)
  - `frontend/src/application/admin/registerManualPayment.usecase.ts`
  - `frontend/src/ui/pages/AdminPayments/AdminPayments.tsx` (solo el bloque del modal de éxito,
    líneas ~768-802, y el tipo de estado `successPayment` si aplica)

> Cualquier archivo fuera de esta lista está BLOQUEADO para escritura — ver Cerrojo, punto 1 y 2.

* **Prohibido modificar (recordatorio explícito, no exhaustivo — la Allowlist ya es la única fuente de
  verdad):**
  - `backend-cloud/main.py` (registro de routers — ya están montados, no hace falta tocarlo)
  - `frontend/src/domain/member/member.schema.ts` / `member.types.ts` (el campo `plan_start_date`/
    `plan_end_date` ya existe en `paymentSchema` — no se toca; `is_future_activation` va en un tipo
    local dentro de `admin.repository.ts`, NO en el schema compartido)
  - Cualquier lógica de `register_payment` NO relacionada con el cálculo de fechas/activación (splits,
    day_passes de plan `15_days`, creación de miembro "new") — no refactorizar, solo envolver la
    activación condicionalmente
  - `*.env`, `*.env.local`, `*.env.example` con valores reales

### 1.2 Fuera de Alcance (Out-of-Scope / Non-Goals)

- No se agrega un estado nuevo `scheduled` a `members.status` (se evalúa en una iteración futura si
  hace falta mostrarlo como badge propio en el dashboard). Mientras el pago está pendiente de activar,
  `members` NO se toca — el admin ve el pago programado en el historial de pagos del miembro
  (`plan_start_date` ya se renderiza ahí).
- Pagos grupales (`register_group_payment`, `AdminPayments.tsx` rama `isGroupPayment`) quedan fuera —
  no soportan fecha manual hoy y no es parte de este incidente.
- No se construye UI para que el admin cancele/edite un pago programado ya creado (si se equivocó,
  es corrección manual en Supabase por ahora — fuera de alcance de esta SPEC).
- No se toca el flujo de creación de miembro nuevo (`POST /admin/members/create`) — ya soporta fechas
  manuales correctamente y no tiene el bug de activación inmediata porque un miembro nuevo no tiene
  chip asignado todavía.

---

## 2. Entorno y Dependencias Permitidas

* **Runtime:** Python 3.12 / FastAPI (backend-cloud), React 19 / TypeScript (frontend), PostgreSQL
  (Supabase).
* **Librerías autorizadas:** Ninguna nueva — todo se resuelve con lo ya usado en los archivos listados
  (`datetime`, `supabase-py`, `dayjs`/Ant Design ya presentes).
* **Regla estricta:** Prohibido instalar o importar paquetes externos.

---

## 3. Diagnóstico y Causa Raíz

Caso real que originó esta SPEC (2026-11-04): un admin del gym quiso registrar hoy el pago de un
miembro (`member_id 7caeaa85-0f56-4c29-9f59-a11741316e4a`, plan actual vence 08/11/2026) para que la
nueva membresía arrancara el 10/12/2026. Nada llegó a guardarse — el admin vio que algo no cuadraba y
se detuvo antes de confirmar. Se auditó el código (sin tocar producción) y se confirmaron 3 bugs
independientes:

**Bug 1 — El admin nunca puede verificar qué fecha quedó guardada realmente.**
`backend-cloud/src/api/routes/admin.py:1105` — el endpoint `POST /admin/members/{member_id}/payments`
responde únicamente `{"status": "ok", "payment_id": payment["id"]}`, sin los campos
`plan_start_date`/`plan_end_date` que sí calculó internamente (líneas 976-1006).
`frontend/src/infrastructure/supabase/admin.repository.ts:304-312` — el método `registerManualPayment`
arma el objeto `Payment` de retorno a partir de `data` (lo que el admin tecleó en el form), nunca de
`resData` (lo que el backend realmente guardó), y ni siquiera copia `start_date`/`end_date` de `data`.
Resultado: `AdminPayments.tsx:794,797` siempre muestra *"Inicio de Vigencia: Inmediato"* / *"Nueva
Fecha de Vencimiento: No especificada"*, sin importar qué haya pasado en el backend. Esto es,
casi con certeza, lo que el admin vio y lo hizo desconfiar de la fecha ingresada.

**Bug 2 — El acceso físico (chip) se activa HOY, nunca respeta un `start_date` futuro.**
El cálculo de fechas (`admin.py:976-1006`) sí es correcto: si `data.start_date` es `2026-12-10` y
`data.end_date` viene vacío, produce `start_date=2026-12-10`, `end_date=2027-01-09` (30 días,
`duration_days` del plan). El problema es lo que pasa después, sin condicionar nada a si esa fecha es
futura:
- `admin.py:1048-1056` — actualiza `members.status="active"` y `members.start_date/end_date` a las
  fechas futuras **de inmediato**.
- `admin.py:1081-1101` — llama `activate_member(...)` (reactivación de chip en ZKBioSecurity vía el
  Bridge) **de inmediato**, sin mirar `start_date`.
- `frontend/src/application/admin/registerManualPayment.usecase.ts:21-36` — el frontend, en paralelo,
  dispara su **propia** llamada a `POST /admin/reactivate-chip` apenas el pago responde 200.
Resultado: alguien que paga hoy para empezar el 10 de diciembre quedaría con el torniquete habilitado
desde hoy — un hueco de control de acceso, no solo un bug cosmético.

**Bug 3 — No existe ningún mecanismo que active la membresía el día del `start_date` futuro.**
No hay cron ni job que, llegado el 10 de diciembre, aplique las fechas a `members` y reactive el chip.
El proyecto ya tiene la infraestructura para esto (`backend-cloud/src/api/routes/cron.py`, jobs diarios
llamados por `cron-job.org` con header `X-Cron-Secret`, patrón idéntico a `/admin/expire-members`), solo
falta el endpoint.

---

## 4. Contratos e Interfaces (Single Source of Truth)

### 4.1 Migración — `supabase/migrations/20261104000000_add_activation_applied_to_payments.sql`

```sql
-- Marca si un pago con start_date futuro ya fue aplicado a members + chip.
-- Default true: todo pago existente (sin start_date futuro) se considera ya aplicado.
ALTER TABLE payments
  ADD COLUMN activation_applied BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN payments.activation_applied IS
  'false = pago con plan_start_date futuro, pendiente de que el cron active members + chip en esa fecha';
```

### 4.2 `backend-cloud/src/api/routes/admin.py` — `register_payment`

```python
# ANTES (fragmento, líneas ~972-1104)
# 3. Calcular fechas
...
if data.start_date or data.end_date:
    ...
elif member.get("status") == "active" and member.get("end_date"):
    ...
else:
    ...

# 4. Registrar pago
payment_res = supabase_client.table("payments").insert({
    "member_id": actual_member_id,
    "amount": data.amount,
    "method": "mixed" if data.splits else data.method,
    "plan": plan_slug,
    "status": "confirmed",
    "registered_by": admin_user_id,
    "plan_start_date": start_date,
    "plan_end_date": end_date
}).execute()
...
# 5. Actualizar member (SIEMPRE, sin condición)
supabase_client.table("members").update({
    "status": "active",
    "plan": plan_slug,
    "start_date": start_date,
    "end_date": end_date,
    ...
}).eq("id", actual_member_id).execute()
...
# 7. Reactivar chip (SIEMPRE, sin condición)
try:
    ...
    await activate_member(...)
except Exception as e:
    ...

return {"status": "ok", "payment_id": payment["id"]}
```

```python
# DESPUÉS
# 3. Calcular fechas (SIN CAMBIOS en la lógica de cálculo — líneas 972-1006 intactas)
...

# 3.5 Determinar si la activación es futura
bogota_today = now.date()
is_future_activation = date.fromisoformat(start_date) > bogota_today

# 3.6 Guardia: no permitir un segundo pago programado mientras hay uno pendiente
if is_future_activation:
    pending_res = supabase_client.table("payments")\
        .select("id, plan_start_date")\
        .eq("member_id", actual_member_id)\
        .eq("activation_applied", False)\
        .execute()
    if pending_res.data:
        pending = pending_res.data[0]
        raise HTTPException(
            status_code=409,
            detail=(
                f"Ya existe un pago con activación programada pendiente para este miembro "
                f"(inicia {pending['plan_start_date']}). Espera a que se aplique o corrígelo "
                f"manualmente antes de registrar uno nuevo."
            )
        )

# 4. Registrar pago (agrega activation_applied)
payment_res = supabase_client.table("payments").insert({
    "member_id": actual_member_id,
    "amount": data.amount,
    "method": "mixed" if data.splits else data.method,
    "plan": plan_slug,
    "status": "confirmed",
    "registered_by": admin_user_id,
    "plan_start_date": start_date,
    "plan_end_date": end_date,
    "activation_applied": not is_future_activation
}).execute()
...

# 5. Actualizar member — SOLO si la activación NO es futura
if not is_future_activation:
    supabase_client.table("members").update({
        "status": "active",
        "plan": plan_slug,
        "start_date": start_date,
        "end_date": end_date,
        "updated_at": now.isoformat(),
        "renewal_reminder_sent": False,
        "expiration_day_notified": False
    }).eq("id", actual_member_id).execute()

# 6. Día pass 15_days — SIN CAMBIOS, pero solo si not is_future_activation
#    (si es futuro, el day_pass se crea cuando el cron aplique la activación —
#    ver 4.3; mover este bloque dentro del cron para plan_slug == "15_days")

# 7. Reactivar chip — SOLO si la activación NO es futura
if not is_future_activation:
    try:
        ...
        await activate_member(...)
    except Exception as e:
        ...

return {
    "status": "ok",
    "payment_id": payment["id"],
    "plan_start_date": start_date,
    "plan_end_date": end_date,
    "is_future_activation": is_future_activation,
    "current_access_active": has_ongoing_access,
    "current_access_until": member.get("end_date") if has_ongoing_access else None
}
```

> **Enmienda 2026-11-04 (antes de commitear el Bloque 4, detectada en validación manual en
> navegador):** el mensaje "el acceso físico permanece BLOQUEADO" es correcto solo cuando el miembro
> NO tiene una membresía vigente en este momento. Si el miembro ya tiene una membresía `active` cuyo
> `end_date` todavía no pasó (el caso real de prueba: Jhon con su plan `15_days` vigente hasta
> 19/11), su chip sigue funcionando con normalidad por esa membresía actual — el pago futuro no
> bloquea nada, solo programa el SIGUIENTE período. El mensaje debe diferenciar ambos casos.
>
> Justo antes de calcular `is_future_activation` ya existe en scope la variable `member` (del query
> de la línea ~962, `member_res.select("status, end_date")`) — es el snapshot ANTERIOR a cualquier
> cambio de esta request. Agregar, inmediatamente después del cálculo de `is_future_activation`:
> ```python
> current_status = member.get("status")
> current_end_date = member.get("end_date")
> has_ongoing_access = bool(
>     is_future_activation and current_status == "active" and current_end_date and
>     date.fromisoformat(current_end_date) >= bogota_today
> )
> ```
> Y agregar `current_access_active`/`current_access_until` al `return` final como se muestra arriba.

> Nota de implementación para el bloque 6 (day_pass `15_days`): si `is_future_activation` es `True`,
> NO crear el `member_day_passes` en este endpoint — debe crearse en el cron (4.3) cuando se aplique la
> activación real, usando las fechas definitivas. Si `is_future_activation` es `False`, el bloque 6
> actual queda exactamente igual (sin cambios).

### 4.3 `backend-cloud/src/api/routes/cron.py` — nuevo endpoint

```python
@router.post("/admin/activate-scheduled-memberships")
async def activate_scheduled_memberships(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret")
):
    """
    Job diario: aplica pagos con plan_start_date futuro cuya fecha ya llegó —
    activa members (status/plan/start_date/end_date) y reactiva el chip RFID.
    """
    cron_secret = os.getenv("CRON_SECRET")
    if not cron_secret:
        raise HTTPException(status_code=500, detail="Configuración incompleta")
    if not x_cron_secret or x_cron_secret != cron_secret:
        raise HTTPException(status_code=401, detail="No autorizado")

    bogota_tz = timezone(timedelta(hours=-5))
    today_str = datetime.now(bogota_tz).date().isoformat()

    # payments con activación pendiente cuya fecha ya llegó (<=, no ==, por si el
    # cron falló un día — se aplica igual en cuanto vuelva a correr)
    res = supabase_client.table("payments")\
        .select("id, member_id, plan, plan_start_date, plan_end_date")\
        .eq("activation_applied", False)\
        .lte("plan_start_date", today_str)\
        .execute()

    pending = res.data or []
    activated_count = 0
    errors = []

    for p in pending:
        try:
            supabase_client.table("members").update({
                "status": "active",
                "plan": p["plan"],
                "start_date": p["plan_start_date"],
                "end_date": p["plan_end_date"],
                "updated_at": datetime.now(bogota_tz).isoformat(),
                "renewal_reminder_sent": False,
                "expiration_day_notified": False
            }).eq("id", p["member_id"]).execute()

            if p["plan"] == "15_days":
                supabase_client.table("member_day_passes")\
                    .update({"status": "exhausted"})\
                    .eq("member_id", p["member_id"])\
                    .eq("status", "active")\
                    .execute()
                supabase_client.table("member_day_passes").insert({
                    "member_id": p["member_id"],
                    "payment_id": p["id"],
                    "days_total": 15,
                    "days_used": 0,
                    "valid_from": p["plan_start_date"],
                    "valid_until": p["plan_end_date"],
                    "status": "active"
                }).execute()

            # Reactivar chip (mismo patrón que register_payment paso 7)
            member_full = supabase_client.table("members")\
                .select("card_no, zkteco_user_id, profile_id")\
                .eq("id", p["member_id"])\
                .execute()
            if member_full.data and member_full.data[0].get("card_no"):
                m = member_full.data[0]
                profile = supabase_client.table("profiles")\
                    .select("full_name").eq("id", m["profile_id"]).execute()
                full_name = profile.data[0]["full_name"] if profile.data else "Miembro"
                await activate_member(
                    member_id=p["member_id"],
                    card_no=m["card_no"],
                    zkteco_user_id=m["zkteco_user_id"],
                    full_name=full_name
                )

            supabase_client.table("payments").update({"activation_applied": True}).eq("id", p["id"]).execute()
            activated_count += 1
        except Exception as e:
            logger.error(f"[SCHEDULED_ACTIVATION] Error activando payment {p['id']}: {e}")
            errors.append({"payment_id": p["id"], "error": str(e)})

    logger.info(f"[SCHEDULED_ACTIVATION] {activated_count} membresías activadas de {len(pending)} pendientes")
    return {"activated_count": activated_count, "pending_total": len(pending), "errors": errors}
```

> Import necesario ya disponible en el módulo: agregar
> `from src.infrastructure.zkteco.tunnel_client import activate_member` al inicio de `cron.py` (no está
> importado ahí hoy, sí en `admin.py`).

### 4.4 `frontend/src/infrastructure/supabase/admin.repository.ts`

```ts
// ANTES (líneas 281-313)
export interface ManualPaymentData { /* ... sin cambios ... */ }

async registerManualPayment(data: ManualPaymentData): Promise<Payment> {
  ...
  const resData = await response.json();
  return {
    id: resData.payment_id,
    member_id: data.member_id,
    amount: data.amount,
    method: data.method,
    plan: data.plan,
    status: 'confirmed',
  } as Payment;
},

// DESPUÉS
export interface ManualPaymentResult extends Payment {
  is_future_activation?: boolean;
  current_access_active?: boolean;
  current_access_until?: string | null;
}

async registerManualPayment(data: ManualPaymentData): Promise<ManualPaymentResult> {
  ...
  const resData = await response.json();
  return {
    id: resData.payment_id,
    member_id: data.member_id,
    amount: data.amount,
    method: data.method,
    plan: data.plan,
    status: 'confirmed',
    plan_start_date: resData.plan_start_date ?? null,
    plan_end_date: resData.plan_end_date ?? null,
    is_future_activation: resData.is_future_activation ?? false,
    current_access_active: resData.current_access_active ?? false,
    current_access_until: resData.current_access_until ?? null,
  } as ManualPaymentResult;
},
```
También actualizar la firma de `registerPayment` (línea 315-317, alias que delega a
`registerManualPayment`) para que su tipo de retorno sea `Promise<ManualPaymentResult>` en vez de
`Promise<Payment>`.

### 4.5 `frontend/src/application/admin/registerManualPayment.usecase.ts`

```ts
// ANTES
export async function registerManualPayment(data: ManualPaymentData): Promise<Payment> {
  const payment = await adminRepository.registerManualPayment(data);
  try {
    const member = await adminRepository.getMemberWithProfile(data.member_id);
    if (member.card_no) {
      // ... fetch POST /admin/reactivate-chip SIEMPRE
    }
  } catch (err) { ... }
  return payment;
}

// DESPUÉS
export async function registerManualPayment(data: ManualPaymentData): Promise<ManualPaymentResult> {
  const payment = await adminRepository.registerManualPayment(data);

  // Si la activación es futura, el backend ya NO activó el chip — no disparar
  // la reactivación aquí tampoco. El cron de activación programada se encarga
  // el día que llegue plan_start_date.
  if (payment.is_future_activation) {
    return payment;
  }

  try {
    const member = await adminRepository.getMemberWithProfile(data.member_id);
    if (member.card_no) {
      // ... resto sin cambios
    }
  } catch (err) { ... }
  return payment;
}
```
(Importar el tipo `ManualPaymentResult` desde `admin.repository.ts` en vez de usar `Payment` como tipo
de retorno.)

### 4.6 `frontend/src/ui/pages/AdminPayments/AdminPayments.tsx` — modal de éxito

```tsx
// ANTES (líneas 783-801) — ya lee successPayment.plan_start_date/plan_end_date,
// solo hace falta que ahora SÍ vengan poblados (ver 4.4) y agregar el aviso de
// activación programada.

{successPayment && (
  <div>
    <p>El pago de la membresía ha sido confirmado y procesado con éxito en el sistema.</p>
    <div className={styles['admin-payments__success-details']}>
      ... Monto, Plan, Inicio de Vigencia, Nueva Fecha de Vencimiento (sin cambios) ...
    </div>
  </div>
)}

// DESPUÉS — agregar un Alert condicional cuando is_future_activation es true
{successPayment && (
  <div>
    <p>El pago de la membresía ha sido confirmado y procesado con éxito en el sistema.</p>
    <div className={styles['admin-payments__success-details']}>
      ... (sin cambios en Monto, Plan, Inicio de Vigencia, Nueva Fecha de Vencimiento) ...
    </div>
    {successPayment.is_future_activation && successPayment.current_access_active && (
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12 }}
        message="Activación programada"
        description={`El acceso físico sigue funcionando con normalidad por la membresía vigente (hasta el ${formatDate(successPayment.current_access_until!)}). Este nuevo período se activará automáticamente el ${formatDate(successPayment.plan_start_date!)}.`}
      />
    )}
    {successPayment.is_future_activation && !successPayment.current_access_active && (
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 12 }}
        message="Activación programada"
        description={`El acceso físico (chip) permanece BLOQUEADO hasta el ${formatDate(successPayment.plan_start_date!)}. Se activará automáticamente ese día.`}
      />
    )}
  </div>
)}
```
También cambiar el tipo del estado `successPayment` de `Payment | null` a `ManualPaymentResult | null`
(importar el tipo desde `admin.repository.ts`). `Alert` ya está importado en el archivo (se usa en la
sección de split payment, línea ~712).

---

## 5. Reglas de Negocio y Casos Borde

### 5.1 Reglas de Negocio (RN)
- **RN-01:** Si `start_date` enviado por el admin es `<= hoy (America/Bogota)`, el comportamiento es
  EXACTAMENTE el actual: activación inmediata de `members` y del chip. Sin cambios para el caso normal.
- **RN-02:** Si `start_date` es `> hoy`, el pago se registra pero `members` y el chip NO se tocan hasta
  que el cron de activación programada (4.3) corra en o después de esa fecha.
- **RN-03:** Un miembro solo puede tener UN pago con activación pendiente (`activation_applied=false`)
  a la vez. Intentar registrar un segundo mientras el primero sigue pendiente responde `409` con el
  mensaje de la Sección 4.2 — no se silencia ni se sobreescribe el pendiente existente.
- **RN-04:** El cron (4.3) corre diario vía `cron-job.org` (mismo mecanismo que `/admin/expire-members`,
  ver `specs/progress.md`), con el header `X-Cron-Secret` usando la variable `CRON_SECRET` ya existente
  en Railway — no se necesita una variable nueva. **Nota operativa (fuera del código de esta SPEC):**
  después de validar en producción, el arquitecto debe dar de alta el job externo en cron-job.org
  apuntando a `POST {RAILWAY_URL}/admin/activate-scheduled-memberships`, igual que se hizo para
  `expire-members` — esto no lo hace Agy, es configuración de infraestructura externa.

### 5.2 Casos Borde (CB)
- **CB-01 (start_date = hoy exactamente):** `is_future_activation = False` (la comparación es estricta
  `>`, no `>=`) — se activa de inmediato, igual que el flujo actual sin fecha manual.
- **CB-02 (segundo pago futuro para el mismo miembro):** bloqueado con 409 (RN-03). El mensaje de error
  debe llegar al admin vía `message.error(msg)` en `handleRegisterSubmit` (ya existe el catch genérico
  en `AdminPayments.tsx`, no requiere cambio adicional — el `err.message` ya se propaga).
- **CB-03 (plan `15_days` con activación futura):** el `member_day_passes` NO se crea en
  `register_payment` cuando `is_future_activation=True` — se crea en el cron (4.3) con `days_used=0`
  siempre (el campo `initial_days_used` del form no aplica a pagos futuros; si el admin lo diligenció,
  se ignora para el day_pass pero el pago igual se guarda — no es error bloqueante, documentar como
  limitación conocida, no hace falta validación extra en esta SPEC).
- **CB-04 (el miembro tiene una membresía activa vigente cuando se registra el pago futuro):** no se
  toca la membresía actual en absoluto (RN-02) — sigue corriendo normal hasta su propio `end_date`,
  incluido el cron de expiración existente (`/admin/expire-members`) que seguirá marcándola `expired`
  en su momento si nadie la renueva antes. El pago futuro programado es independiente.
- **CB-05 (el cron corre pero el miembro no tiene `card_no` asignado):** igual que hoy en
  `register_payment` paso 7 — el `try/except` ya existente evita que la ausencia de chip rompa la
  activación de `members`; solo se omite la llamada a `activate_member`.
- **CB-06 (pago grupal con fecha futura):** no soportado (ver §1.2) — el form de pago grupal no tiene
  campos de fecha, así que no hay forma de que un admin dispare este caso desde la UI actual.
- **CB-07 (el cron corre pero el Bridge/túnel del gym está caído o apagado):** NO requiere lógica
  adicional — `activate_member()` (`tunnel_client.py:8-74`), que tanto `register_payment` como el
  cron nuevo (4.3) usan, ya cae automáticamente en `pending_commands` cuando el túnel no responde
  (timeout, excepción, o `GYM_TUNNEL_URL` no configurado) — ver `specs/big-picture.md` §6. El Bridge
  local ya reintenta esa cola cuando vuelve a conectarse. El cron de activación programada (4.3) NO
  debe implementar su propia lógica de pending_commands — basta con llamar `activate_member(...)`
  igual que ya hace `register_payment`, y dejar que el `try/except` existente en ese helper se
  encargue. `members.status/start_date/end_date` SÍ se actualizan igual en el cron aunque el chip
  quede pendiente — la membresía queda correctamente activa en el sistema aunque el torniquete tarde
  en sincronizar, exactamente igual que en cualquier activación inmediata de hoy.

---

## 6. Plan de Ejecución (Bloques Detenibles)

> Cada bloque termina con el agente mostrando el diff y esperando aprobación explícita del arquitecto —
> nunca encadenar bloques automáticamente (Cerrojo, punto 5).

### Bloque 1 — Migración de base de datos
- [ ] **Paso 1:** Crear `supabase/migrations/20261104000000_add_activation_applied_to_payments.sql`
  con el contenido exacto de la Sección 4.1.
- [ ] **Detenerse:** Mostrar el archivo creado. `git diff --name-only`. Esperar aprobación. (Nota: la
  migración se aplica a Supabase manualmente por el arquitecto — Agy NO ejecuta `apply_schema.py` ni
  corre la migración contra la base de datos real, solo crea el archivo SQL).

### Bloque 2 — Backend: `register_payment` condicional + guardia de duplicados
- [ ] **Paso 2:** Modificar `backend-cloud/src/api/routes/admin.py` según el contrato 4.2 completo
  (cálculo de `is_future_activation`, guardia 409, `activation_applied` en el insert, condicionar
  pasos 5/6/7, nuevo `return` con las fechas e `is_future_activation`).
- [ ] **Detenerse:** Mostrar diff completo. `git diff --name-only`. Esperar aprobación.

### Bloque 3 — Backend: cron de activación programada
- [ ] **Paso 3:** Agregar el endpoint `activate_scheduled_memberships` a
  `backend-cloud/src/api/routes/cron.py` según el contrato 4.3, incluyendo el import de
  `activate_member` al inicio del archivo.
- [ ] **Detenerse:** Mostrar diff completo. `git diff --name-only`. Esperar validación funcional (el
  arquitecto probará el endpoint manualmente contra el entorno local con Swagger/curl) antes de
  continuar.

### Bloque 4 — Frontend: repositorio, usecase y modal de éxito
- [ ] **Paso 4:** Modificar `admin.repository.ts` según 4.4 (tipo `ManualPaymentResult`, retorno real
  del backend, firma de `registerPayment`).
- [ ] **Paso 5:** Modificar `registerManualPayment.usecase.ts` según 4.5 (skip de reactivación de chip
  cuando `is_future_activation`).
- [ ] **Paso 6:** Modificar `AdminPayments.tsx` según 4.6 (tipo de `successPayment`, `Alert` de
  activación programada).
- [ ] **Detenerse:** Mostrar diff completo. `git diff --name-only`. Esperar validación funcional en
  `localhost:5173` (registrar un pago con fecha futura y uno normal, confirmar ambos casos) antes de
  continuar.

### Bloque Final — Cierre (Git, solo tras aprobación explícita)
- [ ] **Paso 7:** `git diff --name-only` — confirmar que coincide EXACTAMENTE con la Sección 1.1. Si
  no, revertir el archivo extra primero.
- [ ] **Paso 8:** Commits atómicos separados por unidad lógica (ver `feedback_atomic_commits` — un
  commit por bloque, no uno solo bundleado):
  - `feat(db): agregar columna activation_applied a payments (SPEC-001)`
  - `fix(admin): no activar membresia ni chip con start_date futuro (SPEC-001)`
  - `feat(cron): activar membresias programadas cuando llega start_date (SPEC-001)`
  - `fix(payments-ui): mostrar fechas reales y aviso de activacion programada (SPEC-001)`
- [ ] **Paso 9:** Actualizar `specs/tasks/TASK_STATUS.md` a `🟣 IN REVIEW`.

---

## 7. Verificación y Checklist de Salida

- [ ] **1. Perímetro de disco:** `git diff --name-only` arroja EXACTAMENTE la lista de la Sección 1.1 —
  ni un archivo más.
- [ ] **2. Validación funcional — caso normal (sin cambios):** registrar un pago SIN fecha manual sobre
  un miembro vencido → se activa igual que siempre (status=active, chip reactivado, confirmación
  muestra fechas correctas).
- [ ] **3. Validación funcional — caso futuro (el bug reportado):** registrar un pago con
  `start_date` futuro (ej. hoy + 30 días) sobre un miembro con membresía activa vigente → el pago
  queda en `payments` con `activation_applied=false`, `members` NO cambia, el chip NO se reactiva, el
  modal de éxito muestra el Alert de "Activación programada" con la fecha correcta.
- [ ] **4. Validación funcional — guardia de duplicados:** intentar un segundo pago futuro para el
  mismo miembro mientras el primero sigue pendiente → responde 409 con el mensaje esperado.
- [ ] **5. Validación funcional — cron:** invocar manualmente `POST /admin/activate-scheduled-memberships`
  con `X-Cron-Secret` correcto y `plan_start_date` del pago de prueba ajustado a `<= hoy` (vía Supabase
  directo, solo para la prueba) → `members` se actualiza, chip se reactiva (si hay card_no), el pago
  queda `activation_applied=true`.
- [ ] **6. Sin regresiones:** pago grupal y creación de miembro nuevo (`POST /admin/members/create`)
  siguen funcionando exactamente igual que antes.
- [ ] **7. Sin scope creep:** sin helpers, mocks o refactors no solicitados.
- [ ] **8. Trazabilidad:** SPEC completada, `specs/tasks/TASK_STATUS.md` en `🟣 IN REVIEW`.

---

## 📎 Nota operativa: cómo invocar cada bloque (recorte de horizonte)

Al iniciar cada bloque, en `claude-to-agy.txt` se usará un mensaje corto que acote el alcance de ESE
turno — ver plantilla en `.agents/skills/sdd-spec-workflow/resources/SPEC_TEMPLATE.md`. No se le pide a
Agy "ejecuta todo" de una vez.
