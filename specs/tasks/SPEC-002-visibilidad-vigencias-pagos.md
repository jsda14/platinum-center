# SPEC: [SPEC-002] - Visibilidad y edición de vigencias (inicio/fin) y pagos programados

### PROTOCOLO DE EJECUCIÓN AGÉNTICA (CERROJO ESTRICTO)

> Aplica a cualquier agente codificador (Claude, Gemini/Antigravity "Agy", Cursor, etc.). No es opcional.

1. **ALLOWLIST ABSOLUTA DE ARCHIVOS:** Únicamente tienes permiso de escritura sobre los archivos
   declarados en la Sección 1.1 (Archivos Autorizados). Cualquier otro archivo del repositorio tiene
   estado **BLOQUEADO para escritura**, sin excepción, aunque la sección "Prohibido modificar" no lo
   mencione explícitamente.
2. **GATE DE BLOQUEO (Stop Condition):** Si para resolver un error necesitas tocar un archivo fuera
   de la Allowlist: **ABORTA INMEDIATAMENTE.** Emite `[BLOCKED: Requiere cambios en <ruta_archivo>]`
   y cede el control al arquitecto.
3. **FASE 1 OBLIGATORIA (No-Write):** Antes de escribir o editar cualquier archivo, tu primer turno
   es de solo lectura: confirma que entendiste el diagnóstico (Sección 3) y los contratos (Sección
   4), y enumera exactamente qué archivos vas a tocar y en qué orden (Sección 6). Espera aprobación
   explícita antes de usar herramientas de escritura.
4. **POLÍTICA DE NO-SUPOSICIÓN Y SCOPE CREEP:** Prohibido crear helpers/mocks/utils no solicitados.
   Prohibido refactorizar código circundante fuera del diff mínimo funcional.
5. **BLOQUE DE EJECUCIÓN, NO TODO DE UNA:** Ejecuta únicamente el bloque de la Sección 6 que el
   arquitecto apruebe en ese turno. Al terminar, **detente y muestra el diff** — no continúes al
   siguiente bloque sin aprobación explícita.
6. **COMANDOS DE GIT SEPARADOS:** `git commit`/`git push` y la edición de `TASK_STATUS.md` van
   únicamente en el Bloque Final, tras aprobación explícita post-validación funcional.
7. **VERIFICACIÓN DE INTEGRIDAD ANTES DE REPORTAR:** `git diff --name-only` y `git status --short`
   antes de decir "listo". Cualquier archivo fuera de la Allowlist se revierte (`git restore`) o se
   elimina (`rm`, si es nuevo) antes de reportar.
8. **ARCHIVOS INTOCABLES SIEMPRE:** `*.env`, `*.env.local`, credenciales, `cloudflared.exe`.

---

## 1. Alcance y Fronteras

* **Objetivo:** Hacer visibles las fechas de inicio/fin de vigencia en las tablas de Miembros y
  Pagos (hoy invisibles salvo entrando al detalle o a Supabase), marcar visualmente los pagos con
  activación programada (`activation_applied=false`, introducidos por SPEC-001), y permitir que el
  admin edite la fecha de un pago programado desde la UI sin tener que pedir SQL manual.
* **SPEC ID:** SPEC-002
* **Repos:** `platinum-center/backend-cloud` + `platinum-center/frontend`
* **Tipo:** Feature (mejora de visibilidad + nueva capacidad de edición)
* **Origen:** Nace directamente de la investigación de SPEC-001 — al corregir el caso de Angélica
  tuvimos que consultar/editar `payments` y `members` a mano en Supabase porque nada en la UI
  mostraba esa información. Objetivo: que la próxima vez no haga falta.

### 1.1 Archivos Autorizados (ALLOWLIST)

* **Modificar:**
  - `backend-cloud/src/api/routes/admin.py` (nuevo endpoint `PUT /admin/payments/{payment_id}/schedule`)
  - `frontend/src/domain/member/member.schema.ts` (agregar `activation_applied` a `paymentSchema`)
  - `frontend/src/infrastructure/supabase/admin.repository.ts` (nuevo método `updateScheduledPayment`)
  - `frontend/src/ui/pages/AdminPayments/AdminPayments.tsx` (columnas nuevas, Tag "Programado",
    acción de editar fecha programada + modal)
  - `frontend/src/ui/pages/AdminMembers/AdminMembers.tsx` (columna "Inicio")

> Cualquier archivo fuera de esta lista está BLOQUEADO para escritura.

* **Prohibido modificar (recordatorio, no exhaustivo):**
  - `backend-cloud/src/api/routes/admin.py` función `register_payment` (de SPEC-001) — no tocar su
    lógica, solo se agrega un endpoint NUEVO y separado en el mismo archivo.
  - Cualquier lógica de `cron.py` (activación programada) — no se toca en esta SPEC.
  - `*.env`, `*.env.local`, credenciales.

### 1.2 Fuera de Alcance (Out-of-Scope / Non-Goals)

- No se agrega capacidad de **cancelar/borrar** un pago programado (solo editar sus fechas). Cancelar
  definitivamente requeriría decidir qué pasa con el dinero ya cobrado — fuera de alcance, se sigue
  resolviendo a mano con el arquitecto si llega a hacer falta.
- No se construye una vista dedicada nueva ("Membresías Activas") — se opta por enriquecer las 2
  vistas que ya existen (Miembros y Pagos) en vez de crear una tercera pantalla, evitando duplicar
  tablas que ya muestran casi la misma información.
- No se toca `AdminMemberDetail.tsx` (el modal "Editar Información" con sus propios DatePickers,
  ligado al hallazgo aparte ya registrado en SPEC-001 sobre `update_member` auto-activando status) —
  es un problema distinto, candidato a SPEC-003 si hace falta.
- Pagos grupales: no se les agrega edición de fecha programada (de por sí no soportan fecha futura).

---

## 2. Entorno y Dependencias Permitidas

Sin librerías nuevas. Mismo stack que SPEC-001 (FastAPI/Pydantic, React/TS/AntD).

---

## 3. Diagnóstico y Causa Raíz

- `GET /admin/payments` (`admin.py:588-618`) ya hace `select("*, ...")` sobre `payments` — es decir,
  `plan_start_date`, `plan_end_date` y `activation_applied` **ya viajan en la respuesta HTTP hoy**,
  pero `AdminPayments.tsx` (columnas definidas ~línea 272-347) no las renderiza en ninguna columna.
  No se necesita ningún cambio de backend para "ver" estos datos — es 100% un gap de presentación.
- Mismo caso en `GET /admin/members`: el payload ya incluye `start_date`, pero `AdminMembers.tsx`
  (columnas ~línea 217-279) solo tiene columna "Vencimiento" (`end_date`), no "Inicio".
- `frontend/src/domain/member/member.schema.ts` → `paymentSchema` (líneas 52-65) NO incluye
  `activation_applied` — hay que agregarlo para que TypeScript lo reconozca donde se use el tipo
  `Payment` fuertemente tipado (aunque el dato ya llegue en el JSON crudo).
- No existe ningún endpoint para editar `plan_start_date`/`plan_end_date` de un pago ya creado — hoy
  la única forma es SQL directo en Supabase (lo que tuvimos que hacer para corregir a Angélica).

---

## 4. Contratos e Interfaces (Single Source of Truth)

### 4.1 `frontend/src/domain/member/member.schema.ts` — `paymentSchema`

```ts
// ANTES
export const paymentSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  amount: z.number().positive(),
  method: paymentMethodSchema.nullable().optional(),
  plan: planTypeSchema.nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  status: paymentStatusSchema.nullable().optional(),
  registered_by: z.uuid().nullable().optional(),
  payment_date: z.string().optional(),
  plan_start_date: z.string().nullable().optional(),
  plan_end_date: z.string().nullable().optional(),
  created_at: z.string().optional()
});

// DESPUÉS
export const paymentSchema = z.object({
  id: z.uuid(),
  member_id: z.uuid().nullable().optional(),
  amount: z.number().positive(),
  method: paymentMethodSchema.nullable().optional(),
  plan: planTypeSchema.nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  status: paymentStatusSchema.nullable().optional(),
  registered_by: z.uuid().nullable().optional(),
  payment_date: z.string().optional(),
  plan_start_date: z.string().nullable().optional(),
  plan_end_date: z.string().nullable().optional(),
  activation_applied: z.boolean().nullable().optional(),
  created_at: z.string().optional()
});
```

### 4.2 `backend-cloud/src/api/routes/admin.py` — nuevo endpoint

Agregar DESPUÉS del endpoint `register_payment` (después de la línea donde termina su `return`,
antes de `@router.post("/admin/members/group-payment")`):

```python
class UpdateScheduledPaymentRequest(BaseModel):
    start_date: str   # YYYY-MM-DD, obligatorio
    end_date: str     # YYYY-MM-DD, obligatorio


@router.put("/admin/payments/{payment_id}/schedule")
async def update_scheduled_payment(
    payment_id: str,
    data: UpdateScheduledPaymentRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Permite corregir las fechas de un pago con activación programada
    (activation_applied=false) ANTES de que el cron lo aplique. No se puede
    editar un pago ya aplicado — para eso hay que corregir `members` directo.
    """
    role = get_current_user_role(authorization)
    if role not in ["super_admin", "receptionist"]:
        raise HTTPException(status_code=403, detail="Sin permisos")

    payment_res = supabase_client.table("payments")\
        .select("id, activation_applied")\
        .eq("id", payment_id)\
        .execute()

    if not payment_res.data:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if payment_res.data[0].get("activation_applied") is True:
        raise HTTPException(
            status_code=400,
            detail="Este pago ya fue aplicado (la membresía ya está activa). No se puede editar su fecha programada."
        )

    try:
        new_start = date.fromisoformat(data.start_date)
        new_end = date.fromisoformat(data.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido, usa YYYY-MM-DD")

    if new_end <= new_start:
        raise HTTPException(status_code=400, detail="La fecha de vencimiento debe ser posterior a la fecha de inicio")

    bogota_tz = timezone(timedelta(hours=-5))
    bogota_today = datetime.now(bogota_tz).date()
    if new_start <= bogota_today:
        raise HTTPException(
            status_code=400,
            detail="La nueva fecha de inicio debe seguir siendo futura. Si ya debe iniciar hoy, corrige el pago manualmente con el arquitecto."
        )

    supabase_client.table("payments").update({
        "plan_start_date": new_start.isoformat(),
        "plan_end_date": new_end.isoformat()
    }).eq("id", payment_id).execute()

    return {"status": "ok", "plan_start_date": new_start.isoformat(), "plan_end_date": new_end.isoformat()}
```

### 4.3 `frontend/src/infrastructure/supabase/admin.repository.ts` — nuevo método

```ts
// Agregar junto a registerManualPayment, dentro de adminRepository:
async updateScheduledPayment(paymentId: string, startDate: string, endDate: string): Promise<{ plan_start_date: string; plan_end_date: string }> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const headers = await getAdminAuthHeaders();
  const response = await fetch(`${apiUrl}/admin/payments/${paymentId}/schedule`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'Error al actualizar la fecha programada');
  }
  return response.json();
},
```

### 4.4 `frontend/src/ui/pages/AdminPayments/AdminPayments.tsx` — columnas + Tag + edición

```tsx
// Agregar 2 columnas nuevas (después de la columna "Plan", antes de "Monto COP" o donde
// visualmente quede mejor — decisión del agente, sin romper el orden de las demás):
{
  title: 'Inicio de Vigencia',
  dataIndex: 'plan_start_date',
  key: 'plan_start_date',
  render: (value: string | null) => value ? formatDate(value) : '—',
},
{
  title: 'Vencimiento',
  dataIndex: 'plan_end_date',
  key: 'plan_end_date',
  render: (value: string | null, record: any) => (
    <span>
      {value ? formatDate(value) : '—'}
      {record.activation_applied === false && (
        <Tag color="blue" style={{ marginLeft: 8 }}>Programado</Tag>
      )}
    </span>
  ),
},

// En la columna "Acciones" (si no existe, agregarla al final de `columns`): agregar un botón
// "Editar fecha" visible SOLO cuando record.activation_applied === false, que abre un Modal con
// 2 DatePicker (inicio/fin) prellenados con plan_start_date/plan_end_date del registro, y al
// confirmar llama `adminRepository.updateScheduledPayment(record.id, nuevoInicio, nuevoFin)`,
// muestra `message.success`/`message.error` según corresponda, y refresca la tabla (`loadData()`).
```

### 4.5 `frontend/src/ui/pages/AdminMembers/AdminMembers.tsx` — columna "Inicio"

```tsx
// Agregar justo ANTES de la columna "Vencimiento" (línea ~261):
{
  title: 'Inicio',
  dataIndex: 'start_date',
  key: 'start_date',
  render: (value: string | null) => value ? formatDate(value) : '—',
},
```

---

## 5. Reglas de Negocio y Casos Borde

### 5.1 Reglas de Negocio (RN)
- **RN-01:** Solo se puede editar la fecha programada de un pago con `activation_applied=false`. Un
  pago ya aplicado (`true`) responde `400` — para corregirlo hay que tocar `members` directamente
  (flujo manual con el arquitecto, no por UI).
- **RN-02:** La nueva fecha de inicio debe seguir siendo estrictamente futura (`> hoy`). Si el admin
  necesita que arranque HOY, no se edita aquí — es un caso distinto (activación inmediata real) que
  debe resolverse manualmente.
- **RN-03:** La guardia de "un solo pago programado por miembro" de SPEC-001 sigue aplicando para
  pagos NUEVOS — esta SPEC no la modifica, solo permite editar el que ya existe.

### 5.2 Casos Borde (CB)
- **CB-01 (payment_id inexistente):** `404`.
- **CB-02 (nueva fecha de fin <= nueva fecha de inicio):** `400`, mensaje claro.
- **CB-03 (el admin edita el pago justo cuando el cron ya lo está procesando):** condición de
  carrera de ventana muy pequeña (el cron corre 1 vez al día); no se bloquea con locks en esta SPEC
  — riesgo aceptado, documentado aquí para no sorprenderse si llega a pasar.
- **CB-04 (pago grupal):** no aplica, esos pagos no soportan fecha programada (ver §1.2).
- **CB-05 (members/payments donde `activation_applied` viene `null` en vez de `false`/`true`):** no
  debería pasar (la columna tiene `DEFAULT true` y SPEC-001 siempre escribe `true`/`false`
  explícito), pero el filtro visual (`record.activation_applied === false`) es estrictamente `===`,
  así que un `null` NO se muestra como "Programado" — comportamiento seguro por defecto.

---

## 6. Plan de Ejecución (Bloques Detenibles)

### Bloque 1 — Backend: nuevo endpoint de edición
- [ ] Agregar `UpdateScheduledPaymentRequest` y `update_scheduled_payment` en `admin.py` según 4.2.
- [ ] **Detenerse:** diff completo, `git diff --name-only`. Esperar aprobación.

### Bloque 2 — Frontend: tipo, repositorio y columnas de solo lectura
- [ ] Agregar `activation_applied` a `paymentSchema` (4.1).
- [ ] Agregar `updateScheduledPayment` al repositorio (4.3).
- [ ] Agregar las columnas "Inicio de Vigencia"/"Vencimiento con Tag" en `AdminPayments.tsx` y la
  columna "Inicio" en `AdminMembers.tsx` (4.4 parcial — solo columnas, sin el botón de editar
  todavía).
- [ ] **Detenerse:** diff completo + `pnpm typecheck`. Esperar validación visual en navegador antes
  de seguir con la edición.

### Bloque 3 — Frontend: acción de editar fecha programada (modal)
- [ ] Agregar el botón "Editar fecha" condicional + Modal con 2 DatePickers + llamada al repositorio
  (resto de 4.4).
- [ ] **Detenerse:** diff completo + `pnpm typecheck`. Esperar validación funcional en navegador
  (editar el pago programado de prueba, confirmar 400 si se intenta editar uno ya aplicado).

### Bloque Final — Cierre
- [ ] `git diff --name-only` == Allowlist exacta.
- [ ] Commits atómicos: `feat(admin): endpoint para editar fecha de pago programado (SPEC-002)` /
  `feat(payments-ui): mostrar vigencias y tag de pago programado (SPEC-002)` / `feat(members-ui):
  columna de fecha de inicio (SPEC-002)` — sin coautoría.
- [ ] Actualizar `specs/tasks/TASK_STATUS.md`.

---

## 7. Verificación y Checklist de Salida

- [ ] Perímetro de disco exacto a la Allowlist.
- [ ] `GET /admin/payments` muestra inicio/fin/tag correctamente en la tabla sin romper columnas
  existentes.
- [ ] `GET /admin/members` muestra columna "Inicio" sin romper el layout.
- [ ] Editar un pago programado de prueba cambia sus fechas correctamente y se refleja en la tabla.
- [ ] Intentar editar un pago ya aplicado (`activation_applied=true`) responde `400` y se muestra el
  error en UI.
- [ ] Sin regresiones en el resto de columnas/acciones de ambas tablas.
- [ ] Sin scope creep.
