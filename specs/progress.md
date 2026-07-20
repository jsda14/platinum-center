# Progress — Estado del proyecto

> ⚠️ Este archivo es la fuente de verdad del estado actual.
> Antigravity y Claude deben consultarlo antes de iniciar cualquier tarea.
> Actualizarlo al completar cada ítem.

---

## Estado general
**Fase actual:** 1 — Setup + Auth + Roles
**Inicio del proyecto:** 2026-07
**Última actualización:** 2026-07

---

## Fase 1 — Setup + Auth + Roles
**Estado: 🟡 En progreso**

### Infraestructura
- [x] Correo del proyecto creado (`platinumcenter.app@gmail.com`)
- [x] Repos creados en GitHub (`platinum-center` / `platinum-center-local`)
- [x] Estructura de carpetas inicial (`specs/`, `frontend/`, `backend-cloud/`)
- [x] Specs completas escritas y revisadas
- [ ] Initial commit en `main`
- [ ] Rama `develop` creada
- [ ] Proyecto Supabase TEST creado
- [ ] Variables de entorno configuradas (`.env.local` frontend, `.env` backend)
- [ ] Proyecto Railway TEST creado y conectado al repo

### Backend cloud (`backend-cloud/`)
- [ ] FastAPI inicializado con estructura base
- [ ] Conexión a Supabase funcionando
- [ ] Health check endpoint `GET /health`
- [ ] Deploy en Railway TEST

### Base de datos (Supabase TEST)
- [ ] Tablas creadas: `profiles`, `members`, `payments`, `plans`, `member_day_passes`, `access_logs`, `suggestions`, `gym_config`
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS por rol configuradas
- [ ] pg_cron: job `check-expired-members`
- [ ] pg_cron: job `check-expired-day-passes`

### Frontend (`frontend/`)
- [ ] Vite + React inicializado
- [ ] Redux configurado
- [ ] Ant Design instalado y tema base configurado
- [ ] React Router configurado
- [ ] Layouts base: AdminLayout, MemberLayout, AuthLayout
- [ ] Página de Login funcional con Supabase Auth
- [ ] Redirección por rol: `super_admin` → /admin, `receptionist` → /reception, `member` → /portal
- [ ] Deploy en Vercel (branch `develop`)

---

## Fase 2 — Portal del miembro
**Estado: ⚪ Pendiente**

- [ ] Vista de estado de membresía (colores: verde=active, amarillo=próximo a vencer, rojo=expired)
- [ ] Contador de días restantes para plan `15_days` (días usados / 15)
- [ ] Historial de pagos
- [ ] Formulario de sugerencias
- [ ] Integración Bold (pago de renovación)
- [ ] Notificaciones in-app (Supabase Realtime)
- [ ] Email de bienvenida (Brevo)
- [ ] Email de vencimiento próximo — 3 días antes (Brevo)
- [ ] Email de confirmación de pago (Brevo)

---

## Fase 3 — Panel admin + recepcionista
**Estado: ⚪ Pendiente**

- [ ] CRUD de miembros
- [ ] Registro de pagos manuales (cash / nequi / daviplata)
- [ ] Gestión de planes (precios, duración)
- [ ] Dashboard métricas: ingresos del mes, miembros active, vencimientos próximos
- [ ] Vista receptionist (permisos limitados)
- [ ] Configuración del gym (nombre, logo, horarios)

---

## Fase 4 — Integración ZKTeco
**Estado: ⚪ Pendiente**

- [ ] FastAPI local con los 3 endpoints del protocolo iClock
- [ ] Endpoint `POST /iclock/devicecmd` (confirmación de comandos)
- [ ] Cola de comandos en memoria (MVP)
- [ ] Lógica de casos: `active` / `expired` / `exhausted` / unknown card
- [ ] Cloudflare Tunnel configurado y probado desde PC de desarrollo
- [ ] Webhook Supabase → Railway → PC gym funcionando
- [ ] **Visita presencial al gym completada**
- [ ] Mapeo de IDs existentes en Supabase
- [ ] Prueba real con tarjeta física ✅

---

## Fase 5 — Pagos + Notificaciones completas
**Estado: ⚪ Pendiente**

- [ ] Bold webhook end-to-end (pago `confirmed` → activa membresía automáticamente)
- [ ] Idempotencia: UNIQUE constraint en `transaction_id`
- [ ] Flujo completo: pago → Supabase → Railway → inBio Pro
- [ ] Lógica `15_days`: crear `member_day_passes` al confirmar pago
- [ ] Todos los emails automáticos funcionando
- [ ] Notificaciones in-app en tiempo real

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
_(registrar aquí cualquier impedimento o decisión pendiente)_
