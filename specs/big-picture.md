# Big Picture — Platinum Center (Ecosistema completo)

> Documento maestro de contexto para Claude (arquitecto) antes de escribir cualquier SPEC.
> Consolida: `project.md`, `schema.md`, `decisions.md`, `progress.md`, `security.md`,
> `migration-supabase-to-railway.md`, `upsell-features.md`, `group-memberships.md`, `zkteco.md`,
> y el código real (no solo las specs — ver §6 "Deuda no documentada").
> Última consolidación: 2026-10-24.

---

## 0. Qué es esto
Plataforma de gestión de membresías + control de acceso físico para **Gimnasio Platinum Center**
(Bogotá). Cliente/dueño: Sevastián Velandia. Dev: Jhon Sebastián Delgado (jsda14).
3 piezas de software, 2 repos:

| Pieza | Repo | Rol |
|---|---|---|
| **Frontend** | `platinum-center/frontend` | React SPA — admin, recepción, portal de socio |
| **Backend cloud** | `platinum-center/backend-cloud` | FastAPI en Railway — 100% de la lógica de negocio (BFF) |
| **Bridge local** | `platinum-center-local` (repo separado) | FastAPI + Tkinter GUI corriendo en el PC de recepción del gym — habla con el hardware ZKTeco |

`platinum-center-local` **no hace falta instalarlo/levantarlo en este entorno de trabajo** — solo
`platinum-center` (frontend + backend-cloud) corre en local para desarrollo. El Bridge vive y se
prueba en el PC físico del gym.

Agentes de desarrollo: **Claude** = arquitecto (diseño, SPECs, decisiones) · **Gemini/Antigravity
("Agy")** = ejecutor que codifica siguiendo contratos estrictos de las SPECs.

---

## 1. Arquitectura global

```
[React SPA] --HTTP Bearer JWT--> [Railway FastAPI (backend-cloud)] --service_role--> [Supabase Postgres]
                                           |
                                           | webhook (X-Tunnel-Secret) via Cloudflare Tunnel
                                           v
                                [Bridge local en PC del gym] <--socket/HTTP--> [ZKTeco inBio Pro]
```

- El frontend **nunca** consulta Supabase directamente para datos de negocio (ver §4, migración
  completada en 2026-09). Supabase Auth + Realtime sí se usan directo desde el cliente.
- El backend-cloud es la única fuente de verdad de reglas de negocio: fechas (UTC-5 Bogotá),
  vigencias, RBAC, transacciones.
- El Bridge es un *edge gateway* sin lógica de negocio: solo traduce comandos del backend al
  protocolo del hardware y reporta eventos de acceso hacia arriba.

---

## 2. Frontend (`platinum-center/frontend`)

**Stack:** Vite + React 19 + TypeScript + Redux Toolkit + Ant Design 6 + React Router 7 + Zod 4 +
dayjs + recharts. pnpm. Linter: oxlint. Deploy: Vercel (`develop`→staging, `main`→prod).

**Arquitectura hexagonal estricta** en `src/`:
```
domain/           # entidades, Zod schemas, utils puros (ej. groupPricing.utils.ts) — sin deps externas
application/      # casos de uso (admin/, auth/, gym/, member/)
infrastructure/   # supabase/ (solo Auth+Realtime), api/ (cliente HTTP a Railway, Bearer token), store/ (Redux slices)
ui/               # components/ (CSS Modules + BEM), pages/, layouts/ (AdminLayout, MemberLayout, AuthLayout), hooks/
```
Convención CSS: `component-name__element--modifier` (BEM) en archivos `.module.css`.

**Roles y rutas:** `super_admin` → `/admin/*`, `receptionist` → `/reception/*` (mismas vistas,
permisos recortados), `member` → `/portal/*`.

**Páginas existentes** (`ui/pages/`): AdminDashboard, AdminMembers, AdminMemberDetail,
AdminPayments, AdminPlans, AdminAccessLogs, AdminCommunications, AdminSettings, AdminProfile,
AdminClasses*, AdminStore* · MemberPortal, MemberRenewal, MemberPayments, MemberAccessLogs,
MemberSuggestions, MemberSettings, MemberClasses*, MemberTrainer*, MemberProgress*, MemberStore* ·
Login, ForgotPassword, ResetPassword, SetupProfile, PaymentResult, PrivacyPolicy, TermsOfService.
(`*` = vistas "LockedFeature" / upsell, ver §5).

---

## 3. Backend cloud (`platinum-center/backend-cloud`)

**Stack:** FastAPI + Pydantic + httpx + Supabase client (`service_role`). Railway, servicios
`fastapi-test` / `fastapi-prod`. Arquitectura hexagonal: `domain/ → application/ → infrastructure/
→ api/routes/` (ver §6 sobre inconsistencia real con `routers/`).

**Responsabilidades clave:**
- Auth/RBAC vía JWT de Supabase, validado en cada endpoint.
- Cálculo de vigencias de membresía en **America/Bogota (UTC-5)**, nunca en el reloj del cliente.
- Integración de pagos Bold (webhook `SALE_APPROVED` → activa membresía).
- Orquestación de comandos hacia el Bridge (`tunnel_client.py`) con **cola de fallback** en
  Supabase (`pending_commands`) cuando el túnel/Bridge está caído — nunca bloquea al recepcionista.
- Emails transaccionales vía Supabase Edge Functions + Brevo (bienvenida, confirmación de pago,
  vencimiento próximo).
- Cron diario externo (`cron-job.org`, no Railway Cron) → `POST /admin/expire-members`.

**Routers montados en `main.py`** (mezcla de dos convenciones de carpeta, ver §6):
`webhooks`, `bold`, `admin`, `dashboard`, `cron`, `admin_communications`, `zkteco` (en
`api/routes/`) + `members`, `commands`, `gym`, `plans`, `profiles`, `groups` (en `routers/`).

---

## 4. Modelo de datos (Supabase Postgres) — resumen
`profiles` (1:1 auth.users, rol) → `members` (1:1 profile, `card_no`, `zkteco_user_id`,
`zkteco_person_id`, status) → `payments` (1:N, `transaction_id` UNIQUE para idempotencia Bold) →
`member_day_passes` (1:1 solo si plan=`15_days`, contador `days_used`/`days_total`) → `access_logs`
(1:N, auditoría de torniquete) → `suggestions`. Además: `plans` (dinámico, sin check constraints
desde 2026-09), `plan_group_pricing`, `member_groups`/`member_group_members`, `gym_config`,
`payment_intents` (contexto Bold, tiene `metadata jsonb` para pagos grupales), `pending_commands`
(cola de fallback hacia el Bridge).

RLS activo en todas las tablas, políticas por rol. `pg_cron` corre 2 jobs cada hora (expira
members y day_passes por fecha) → disparan webhook Supabase → Railway → Bridge → inBio Pro.

**Planes de membresía:** `1_day` (24h), `15_days` (consumibles dentro de 1 mes calendario, tabla
aparte), `1_month` (30 días), `1_year` (365 días), **Grupal** (2-4 personas, un solo pago,
precio progresivo vía `plan_group_pricing`, activa el plan mensual para todos simultáneamente).

**Migración arquitectónica clave (2026-09):** se eliminó todo acceso directo del frontend a
Supabase para datos de negocio — todo pasa por Railway (BFF/API Gateway) con Bearer JWT + RBAC
server-side. Supabase quedó reducido a Auth + Realtime + almacenamiento puro desde el cliente.

---

## 5. Integración ZKTeco / hardware (visión desde el lado cloud)
- Protocolo real en producción: **ZKBioSecurity HTTP Pull** (long polling), NO pyzk/socket directo
  (puerto 4370 bloqueado porque ZKBioSecurity ya lo usa). pyzk quedó descartado en campo.
- Flujo: chip → inBio260 Pro → ZKBioSecurity local → Bridge hace long-poll cada ~20s → POST
  `/zkteco/access-event` a Railway → valida membresía/descuenta día → si agotado, llama
  `/webhook/deactivate-member` en el Bridge (`endTime=2000-01-01`) → reactivación en pago
  (`endTime=2099-12-31`). Detalle completo del protocolo y endpoints del Bridge: ver
  `platinum-center-local/specs/big-picture.md` (documento ya consolidado para ese repo).
- Identificadores: `zkteco_person_id` (ID interno ZKBio, ej. 2900) ≠ `zkteco_user_id`/PIN (ej.
  2564) ≠ `card_no` (viene de ZKBio sin ceros a la izquierda).
- **Pendiente real:** migración batch de ~1700 miembros existentes en ZKBioSecurity a Supabase, y
  normalización de `card_no` con/sin ceros iniciales en el `.or_()` de Railway.

**Upsells / LockedFeature** (features de pago futuro, UI ya construida, lógica bloqueada):
Admin ve contenido completo + badge "Función Premium" + CTA a WhatsApp; Member ve banner
"Próximamente" sin venta. Vistas afectadas: `/admin|portal/classes`, `/store`, `trainer`,
`progress`, `communications` masivas, export de reportes, personalización de marca.

---

## 6. Deuda técnica y decisiones tomadas en caliente (no reflejadas en SPECs viejas)
Esto es contexto crítico que **no estaba documentado** porque se resolvió en vivo en el gym:

1. **Dos convenciones de rutas coexistiendo en backend-cloud:** `src/api/routes/*` (hexagonal
   "correcto", con `domain/application/infrastructure`) y `src/routers/*` (flat, agregado después
   — `members`, `commands`, `gym`, `plans`, `profiles`, `groups`). Ambos están montados en
   `main.py` y funcionando. Al tocar cualquiera de estos módulos, **no asumir que `routers/` es
   legacy a borrar** — está vivo en producción; es deuda de nomenclatura, no de funcionalidad.
2. **Tolerancia a fallos como patrón repetido:** tanto `assign-chip` como el `tunnel_client`
   general nunca devuelven 500 si el Bridge/túnel está caído — encolan en `pending_commands` y
   responden 200 con warning. Cualquier endpoint nuevo que hable con el Bridge debe seguir este
   mismo patrón (decisión de 2026-09, validada en campo).
3. **Bold webhook signature validation está comentada** (HMAC-SHA256) — pendiente de restaurar
   antes de ir a producción real. No tocar sin avisar explícitamente, es un hueco de seguridad
   conocido y aceptado temporalmente.
4. **Middleware de retry en `main.py`**: reintenta hasta 2 veces ante `httpx.RemoteProtocolError`
   antes de devolver 503 — mitigación agregada en caliente para cortes de conexión intermitentes
   con Railway/Supabase.
5. **DNS del PC del gym fijado a 8.8.8.8/8.8.4.4** — fix de campo para estabilidad del Bridge, no
   tocar sin razón.
6. **Cloudflare Tunnel del Bridge sigue siendo manual**, no está como servicio permanente de
   Windows todavía (pendiente en progress.md Fase 6).
7. **El dominio del Bridge es fijo:** `bridge.gymplatinumcenter.com` → no cambia, ya está
   hardcodeado como variable estable en varios lados.

---

## 7. Estado del proyecto (Fase 6 — QA/Deploy/Capacitación, en progreso)
Fases 1-5 completadas (setup, portal de socio, panel admin, integración ZKTeco, pagos). Fase 6
pendiente: pruebas e2e completas, Supabase/Railway PROD, HMAC Bold, Tunnel como servicio
permanente, capacitación a recepcionistas, manual de uso, entrega formal. Ver detalle línea por
línea en `specs/progress.md` (sigue siendo la fuente de verdad día a día; este documento es el
mapa estructural, no el tracker de tareas).

---

## 8. Cómo levantar el entorno local de desarrollo
Solo `platinum-center` (frontend + backend-cloud). **No** se requiere `platinum-center-local`
para desarrollar features de cloud/frontend.

```bash
# Backend cloud
cd backend-cloud
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend
pnpm install
pnpm dev
```
Requiere `.env` en `backend-cloud/` (Supabase service key, Bold, Brevo) y `.env.local` en
`frontend/` (Supabase URL/publishable key, `VITE_API_URL=http://localhost:8000`). Ver
`specs/project.md` para las variables exactas (sin valores reales — pedir a Jhon si faltan).

---

## 9. Otros documentos de referencia
- `specs/project.md` — visión, roles, stack, variables de entorno (plantilla).
- `specs/schema.md` — DDL completo de Supabase, RLS, pg_cron, lógica de fechas por plan.
- `specs/decisions.md` — ADRs cronológicos, consultar antes de cambiar stack/arquitectura.
- `specs/progress.md` — tracker de tareas fase por fase, fuente de verdad día a día.
- `specs/security.md` — checklist de seguridad pre-producción.
- `specs/migration-supabase-to-railway.md` — por qué y cómo se hizo el BFF.
- `specs/zkteco.md`, `specs/upsell-features.md`, `specs/group-memberships.md` — detalle por feature.
- `platinum-center-local/specs/big-picture.md` — arquitectura completa del Bridge (ya consolidada).
- `.agents/skills/sdd-spec-workflow/SKILL.md` (duplicada en `.claude/skills/`) — protocolo SDD + Cerrojo
  de Ejecución Agéntica obligatorio para generar cualquier SPEC antes de que Agy codifique. SPECs
  individuales viven en `specs/tasks/SPEC-XXX-<slug>.md`, tracker en `specs/tasks/TASK_STATUS.md`.
