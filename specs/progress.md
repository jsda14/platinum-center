# Progress — Estado del proyecto

> ⚠️ Este archivo es la fuente de verdad del estado actual.
> Antigravity y Claude deben consultarlo antes de iniciar cualquier tarea.
> Actualizarlo al completar cada ítem.

---

## Estado general
**Fase actual:** 4 — Integración ZKTeco
**Inicio del proyecto:** 2026-07
**Última actualización:** 2026-08-30

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
- [x] Página de detalle de miembro /admin/members/:id
- [x] Gestión de planes (precios, duración editables)
- [x] Dashboard métricas: ingresos del mes, miembros activos, vencimientos próximos
- [x] Vista receptionist (permisos limitados)
- [x] Configuración del gym (nombre, logo, horarios)
- [x] Vista de miembros sin chip asignado (filtro en AdminMembers + Dashboard)
- [x] Rutas DRY: /admin/* para super_admin, /reception/* para receptionist
- [x] AdminMemberDetail: botones restringidos por rol en ambas URLs

---

## Fase 4 — Integración ZKTeco
**Estado: 🟡 En progreso (~85% completo)**

### Bridge (platinum-center-local)
- [x] FastAPI local con los 4 endpoints del protocolo iClock
- [x] Cola de comandos SQLite (no memoria — más robusto)
- [x] Cloudflare Tunnel permanente: `bridge.gymplatinumcenter.com` → `localhost:8001`
- [x] PlatinumCenterBridge.exe — ejecutable Windows con UI Tkinter + UAC admin ✅
- [x] Fix launcher.py: cloudflared espera que FastAPI esté listo antes de arrancar ✅
- [x] Fix logger.py para modo --noconsole de PyInstaller ✅
- [x] tunnel_client.py: activate/deactivate/sync via túnel
- [x] Simulador del inBio Pro para pruebas sin hardware
- [x] **Solución B (ZKBioSecurity HTTP Pull)** — pyzk descartado (puerto 4370 no expuesto)
  - [x] Login via `POST /authLoginAction!login.do` — validar por JSESSIONID no por HTTP status
  - [x] Long polling `GET /accRTMonitorAction!getEventData.action` — clientId fijo por sesión, timeout 30s
  - [x] Parser posicional de eventos: data[0]=timestamp, data[5]=card_no, data[6]=user_str, data[12]=pin
  - [x] Filtro de eventos de salida (data[7] contiene "Salida")
  - [x] Edición de usuarios via `POST /persPersonAction!edit.action` con payload form-data completo
  - [x] `_get_person_id_by_pin`: busca por cardNo en `persPersonAction!getAll.action` via POST
  - [x] `_get_card_info`: parsea cardId y logicalCardNo del HTML de `persPersonAction!getById.action`
  - [x] `deactivate_member_zk`: endTime = "2000-01-01 00:00:00"
  - [x] `activate_member`: endTime = "2099-12-31 23:59:59"
- [x] Cola de pendientes `pending_commands` en Supabase — fallback cuando Bridge está apagado
- [x] `sync_pending_commands` al arrancar con reintentos (5 intentos, 3s entre cada uno)
- [x] `start_pending_sync_loop`: loop cada 5 minutos para ejecutar pendientes automáticamente
- [x] Sleep de 15s al arrancar antes de sync para dar tiempo al DNS
- [x] Webhook `/webhook/deactivate-member` responde inmediatamente (threading)
- [x] Webhook `/webhook/lookup-member?card_no=` — busca usuario en ZKBioSecurity por card_no
- [x] DNS del gym configurado a 8.8.8.8 / 8.8.4.4 para estabilidad

### Railway (backend-cloud)
- [x] Endpoint `POST /zkteco/access-event` — valida membresía y descuenta días
- [x] Lógica denied: cuando member_day_passes exhausted → registra denied + llama deactivate
- [x] `members.status` se actualiza a 'expired' cuando se agotan días
- [x] Endpoint `POST /admin/reactivate-chip` — reactiva chip al registrar pago
- [x] Endpoint `GET /admin/pending-commands` — devuelve comandos pendientes al Bridge
- [x] Endpoint `POST /admin/pending-commands/{id}/done` — confirma ejecución
- [x] `tunnel_client.py`: guarda en `pending_commands` cuando tunnel falla
- [x] Endpoint `POST /admin/assign-chip` — asigna chip + lookup en ZKBioSecurity + guarda IDs

### Supabase
- [x] Tabla `pending_commands` creada con campos: id, member_id, action, card_no, zkteco_user_id, full_name, sn, status, created_at, executed_at
- [x] Columna `zkteco_person_id` agregada a tabla `members`
- [x] GRANT permissions en `pending_commands` para service_role

### Validado en campo (gym presencial 2026-08-26 y 2026-08-29)
- [x] Chip → inBio → ZKBioSecurity → Bridge → Railway → Supabase ✅
- [x] Descuento de día al pasar chip ✅
- [x] Denied cuando membresía exhausted ✅
- [x] Bloqueo físico en inBio (endTime=2000) cuando días agotados ✅
- [x] Reactivación automática al pagar (endTime=2099) ✅
- [x] Cola de pendientes ejecutada al arrancar Bridge ✅
- [x] Loop de 5 minutos ejecuta pendientes sin reiniciar exe ✅


---

## Fase 5 — Pagos + Notificaciones completas
**Estado: ⚪ Pendiente**

- [x] Bold webhook end-to-end (pago confirmed → activa membresía)
- [x] Idempotencia: UNIQUE constraint en transaction_id
- [x] Flujo completo: pago → Supabase → Railway → inBio Pro
- [x] Lógica 15_days: crear member_day_passes al confirmar pago
- [x] Emails automáticos via Supabase Edge Functions (Brevo)
- [x] Notificaciones in-app en tiempo real (Supabase Realtime)
- [ ] Validar `lookup-member` en gym con Bridge corriendo
- [ ] Validar flujo completo `assign-chip` desde frontend con Bridge corriendo
- [ ] Migración de ~1700 miembros existentes en ZKBioSecurity a Supabase (zkteco_person_id, zkteco_user_id) — script listo, requiere ejecución en gym
- [ ] Normalización card_no: fix `.or_()` en Railway para chips con/sin ceros iniciales
- [ ] Cloudflare Tunnel como servicio permanente en PC del gym (actualmente manual)
- [ ] Membresías grupales (ver specs/group-memberships.md)
- [ ] Configurar precios grupales en panel admin (plan_group_pricing)

---

## Fase 6 — QA + Deploy + Capacitación
**Estado: ⚪ Pendiente**

- [ ] Pruebas end-to-end de todos los flujos
- [ ] Responsive mobile-first revisado
- [ ] Supabase PROD creado y migrado
- [ ] Railway PROD desplegado
- [x] Dominio gymplatinumcenter.com conectado a Vercel ✅
- [x] bridge.gymplatinumcenter.com configurado ✅
- [ ] Cloudflare Tunnel como servicio permanente en PC del gym
- [ ] Restaurar validación HMAC Bold webhook (comentada temporalmente)
- [ ] Capacitación a Sevastián y recepcionistas
- [ ] Manual de uso entregado (PDF o Notion)
- [ ] Entrega formal ✅

---

## Notas y bloqueos activos
- GYM_TUNNEL_URL fija: `https://bridge.gymplatinumcenter.com` — ya no cambia
- PlatinumCenterBridge.exe requiere correr como Administrador (UAC configurado en build)
- exe requiere `.env` en la misma carpeta que el ejecutable
- SN real del inBio Pro: `AJYX215160006` (antes era PLATINUM001)
- card_no en ZKBioSecurity viene sin ceros iniciales (ej: "13588626" no "0013588626")
- zkteco_person_id es el ID interno de ZKBioSecurity (ej: 2900) — diferente al PIN (2564)
- PIN en ZKBioSecurity = zkteco_user_id en Supabase
- persPersonAction!edit requiere cardId interno + logicalCardNo para no fallar con error 400
- DNS del gym configurado a 8.8.8.8 — resolver si vuelve a fallar
- Bold webhook signature validation temporalmente desactivada — restaurar en producción
- Bold test mode: transaction_id "XXXX" guardado como null
- VITE_API_URL en Vercel debe incluir https:// al inicio
- Cobrar $500.000 COP por Fase 4 al completar validación final
- member_day_passes: cerrar activo antes de crear nuevo (fix aplicado)
- Railway y Vercel migrados a cuenta personal jsda14 ✅
- Dominio gymplatinumcenter.com registrado en cuenta personal jsda14
- Google OAuth verification enviada — aprobada con gymplatinumcenter.com

## Arquitectura ZKBioSecurity (Solución B — HTTP Pull)
```
Chip → inBio260 Pro (192.168.40.110)
  → ZKBioSecurity (127.0.0.1:8088) registra evento
  → Bridge hace long polling cada ~20s a getEventData
  → Bridge detecta evento → POST a Railway /zkteco/access-event
  → Railway valida membresía → descuenta día
  → Si exhausted → llama Bridge /webhook/deactivate-member
  → Bridge actualiza endTime=2000 en ZKBioSecurity via persPersonAction!edit
  → inBio sincroniza → bloquea chip físicamente
  → Si pago → Railway llama Bridge /webhook/activate-member
  → Bridge actualiza endTime=2099 → inBio reactiva chip
```

## Cola de pendientes (cuando Bridge está apagado)
```
tunnel_client falla → inserta en pending_commands (Supabase)
Bridge arranca → sync_pending_commands (con 5 reintentos)
Bridge loop cada 5min → reintenta pendientes automáticamente
```

## Upsells implementados
- LockedFeature componente creado y desplegado
- Exportar reportes: LockedFeature.Button en Dashboard
- Personalización de colores: LockedFeature.Section en Settings
- Programar comunicados: LockedFeature.Section en Communications
- WhatsApp Business: LockedFeature.Badge en Settings
- Contacto para upgrades: WhatsApp +573057532192 / jsda14@gmail.com