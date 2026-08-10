# Progress — Estado del proyecto

> ⚠️ Este archivo es la fuente de verdad del estado actual.
> Antigravity y Claude deben consultarlo antes de iniciar cualquier tarea.
> Actualizarlo al completar cada ítem.

---

## Estado general
**Fase actual:** 4 — Integración ZKTeco
**Inicio del proyecto:** 2026-07
**Última actualización:** 2026-08-06

---

## Fase 1 — Setup + Auth + Roles
**Estado: ✅ Completada**

### Infraestructura
- [x] Correo del proyecto creado (`gym.platinum.center@gmail.com`)
- [x] Repos creados en GitHub (`platinum-center` / `platinum-center-local`)
- [x] Estructura de carpetas inicial (`specs/`, `frontend/`, `backend-cloud/`)
- [x] Specs completas escritas y revisadas
- [x] Initial commit en `main`
- [x] Rama `develop` creada
- [x] Proyecto Supabase TEST creado (`platinum-center-test`, región sa-east-1)
- [x] Frontend inicializado (Vite + React + TS + Redux + Ant Design + Zod + Oxlint, pnpm)
- [x] Backend-cloud inicializado (FastAPI + Pydantic + uvicorn)
- [x] Health check endpoint `GET /health` funcionando
- [x] `.gitignore` completo (pnpm, Python venv, env files)
- [x] Estructura hexagonal creada en backend-cloud y frontend
- [x] Variables de entorno configuradas (`.env.local` frontend, `.env` backend)
- [x] Proyecto Railway TEST creado y conectado al repo

### Base de datos (Supabase TEST)
- [x] Tablas creadas: `profiles`, `members`, `plans`, `payments`, `member_day_passes`, `access_logs`, `suggestions`, `gym_config`
- [x] RLS habilitado en todas las tablas
- [x] Políticas RLS por rol configuradas
- [x] pg_cron: job `check-expired-members`
- [x] pg_cron: job `check-expired-day-passes`
- [x] Trigger de autenticación (`on_auth_user_created` -> `handle_new_user()`)

### Backend cloud (`backend-cloud/`)
- [x] FastAPI inicializado con estructura base
- [x] Health check endpoint `GET /health`
- [x] Estructura hexagonal completa
- [x] Conexión a Supabase funcionando
- [x] Deploy en Railway TEST

### Frontend (`frontend/`)
- [x] Vite + React + TypeScript inicializado
- [x] Redux, Ant Design, Zod, React Router instalados
- [x] Estructura hexagonal completa
- [x] Layouts base: AdminLayout, MemberLayout, AuthLayout
- [x] Página de Login funcional con Supabase Auth
- [x] Redirección por rol: `super_admin` → /admin, `receptionist` → /reception, `member` → /portal
- [x] Deploy en Vercel (branch `develop`)

---

## Fase 2 — Portal del miembro
**Estado: ✅ Completada**

- [x] Vista de estado de membresía (colores: verde=active, amarillo=próximo a vencer, rojo=expired)
- [x] Contador de días restantes para plan `15_days` (días usados / 15)
- [x] Historial de pagos
- [x] Formulario de sugerencias
- [x] Integración Bold — flujo completo end-to-end
- [x] Página de resultado de pago (éxito/rechazo/pendiente)
- [x] Email confirmación al miembro (Edge Function + Brevo)
- [x] Email confirmación al admin cuando llega un pago
- [x] Migración emails a Supabase Edge Functions
- [x] Tab de Renovar en MemberLayout
- [x] Notificaciones in-app (Supabase Realtime)
- [x] Email de bienvenida (Brevo)
- [x] Email de vencimiento próximo — 3 días antes (Brevo)

---

## Fase 3 — Panel admin + recepcionista
**Estado: ✅ Completada**

- [x] CRUD de miembros (crear, editar, suspender)
- [x] Asignación de chip RFID a miembro nuevo sin chip
- [x] Email de bienvenida con link de activación al crear miembro
- [x] Página SetupProfile para activación de cuenta primera vez
- [x] Página MemberSettings para editar perfil y contraseña
- [x] Modales con maskClosable={false}
- [x] LoadingScreen en operaciones asíncronas
- [x] Registro de pagos manuales (cash / nequi / daviplata)
- [x] Reactivación automática del chip al registrar pago manual
- [x] Lógica de renovación anticipada: sumar días desde fecha_fin actual
- [x] Página de detalle de miembro /admin/members/:id con:
  - Información del miembro (nombre, email, teléfono, chip)
  - Estado actual de membresía (plan activo, días restantes, vencimiento)
  - Historial de pagos completo
  - Historial de accesos (disponible tras Fase 4 ZKTeco)
  - Botones de acción: registrar pago, editar info, suspender, asignar chip
- [x] Gestión de planes (precios, duración editables)
- [x] Dashboard métricas: ingresos del mes, miembros activos, vencimientos próximos
- [x] Vista receptionist (permisos limitados)
- [x] Configuración del gym (nombre, logo, horarios)
- [x] Vista de miembros sin chip asignado (filtro en AdminMembers + Dashboard)
- [x] Vista receptionist con permisos limitados
- [x] Rutas DRY: /admin/* para super_admin, /reception/* para receptionist
- [x] Mismo componente, diferente URL según rol
- [x] AdminMemberDetail: botones restringidos por rol en ambas URLs

---

## Fase 4 — Integración ZKTeco
**Estado: 🟡 En progreso**

- [x] FastAPI local con los 4 endpoints del protocolo iClock (GET/POST /iclock/cdata, GET /iclock/getrequest, POST /iclock/devicecmd)
- [x] Cola de comandos SQLite (no memoria — más robusto)
- [x] Cloudflare Tunnel configurado y probado desde PC de desarrollo
- [x] Webhook Railway → Cloudflare Tunnel → FastAPI local funcionando
- [x] tunnel_client.py: activate/deactivate/sync via túnel
- [x] Simulador del inBio Pro para pruebas sin hardware
- [x] Panel gestión de roles en /admin/settings
- [x] Google OAuth configurado con Client ID real
- [x] Estado del chip visible en portal del miembro
- [x] Landing page pública para verificación Google
- [x] Páginas /terminos y /politica-privacidad
- [x] Responsive mejorado en admin y portal
- [x] AdminProfile para admin y recepcionista
- [ ] Mapeo de IDs existentes en Supabase
- [ ] Prueba Google Auth con correo personal
- [ ] Prueba flujo completo con chip RFID real
- [ ] Visita presencial al gym (pendiente confirmar fecha)

---

## Fase 5 — Pagos + Notificaciones completas
**Estado: ⚪ Pendiente**

> Bold y notificaciones completados en Fase 2. 
> Fase 5 ahora enfocada en membresías grupales.

- [x] Bold webhook end-to-end (pago confirmed → activa membresía)
- [x] Idempotencia: UNIQUE constraint en transaction_id
- [x] Flujo completo: pago → Supabase → Railway → inBio Pro
- [x] Lógica 15_days: crear member_day_passes al confirmar pago
- [x] Emails automáticos via Supabase Edge Functions (Brevo)
- [x] Notificaciones in-app en tiempo real (Supabase Realtime)
- [ ] Membresías grupales (ver specs/group-memberships.md):
  - [ ] Schema: plan_group_pricing, group_memberships, group_membership_members
  - [ ] Portal miembro: crear grupo, invitar personas, pago total o dividido
  - [ ] Panel admin: registrar grupo presencial con pago manual
  - [ ] Precios grupales configurables desde gestión de planes
  - [ ] Email de bienvenida a cada miembro del grupo
  - [ ] Activación de chip por cada miembro del grupo
- [ ] Configurar precios grupales en panel admin (plan_group_pricing)

---

## Fase 6 — QA + Deploy + Capacitación
**Estado: ⚪ Pendiente**

- [ ] Pruebas end-to-end de todos los flujos
- [ ] Responsive mobile-first revisado
- [ ] Supabase PROD creado y migrado
- [ ] Railway PROD desplegado
- [ ] Dominio personalizado en Vercel (`main`)
- [ ] Cloudflare Tunnel como servicio permanente en PC del gym
- [ ] Capacitación a Sevastián y recepcionistas
- [ ] Manual de uso entregado (PDF o Notion)
- [ ] Entrega formal ✅

---

## Notas y bloqueos activos
- Google OAuth verificado en Search Console: platinum-center.vercel.app
- Google Cloud pantalla consentimiento: enviada para revisión
- TUNNEL_SECRET debe coincidir en ambos .env al reconectar el túnel
- ZKTeco local bridge: `platinum-center-local` funcionando con SQLite
- Tunnel client probado: Railway → Cloudflare → FastAPI local → cola SQLite
- SN por defecto: "PLATINUM001" hasta obtener SN real del inBio Pro
- `TUNNEL_SECRET` debe coincidir en `backend-cloud/.env` y `platinum-center-local/.env`
- Fase 3 completa — lista para entrega a Sevastián
- Cobrar $400.000 COP por Fase 3
- Frontend: https://platinum-center.vercel.app
- Backend: https://platinum-center-production.up.railway.app
- Webhook Supabase configurado: `members` UPDATE → Railway `/webhooks/member-status`
- `SUPABASE_WEBHOOK_SECRET` configurado en Railway
- Email bloqueado temporalmente por Gmail rate limit en pruebas — no es bug, es comportamiento normal en envíos masivos de prueba (shared IP reputation)
- PowerShell en Windows requiere `New-Item` en lugar de `mkdir -p` para crear múltiples carpetas
- Bold integration complete: payment_intents table used for webhook reconciliation
- Bold metadata.reference = orderId → lookup in payment_intents → member_id + plan
- Bold webhook signature validation temporarily disabled (commented out) — restore before production
- Edge Function send-notification desplegada en Supabase
- Emails funcionando vía Supabase Edge Functions (Deno + Brevo)
- Bold test mode: transaction_id "XXXX" guardado como null
- URL staging Sevastián: https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app
- Flujo completo de creación de miembro: admin crea → email bienvenida → SetupProfile → portal
- Supabase auth.admin.generate_link usado para links de activación
- maskClosable={false} aplicado a todos los modales del admin
- Precios grupales: UI configurada en /admin/settings pero NO integrada 
  en flujo de pago — se integra en Fase 5 con membresías grupales
- LockedFeature: botones duales de contacto (WhatsApp + Email) 
  en sub-componentes Section y Page

## Upsells implementados
- LockedFeature componente creado y desplegado
- Exportar reportes: LockedFeature.Button en Dashboard
- Personalización de colores: LockedFeature.Section en Settings
- Programar comunicados: LockedFeature.Section en Communications  
- WhatsApp Business: LockedFeature.Badge en Settings
- Contacto para upgrades: WhatsApp +573057532192 / jsda14@gmail.com
