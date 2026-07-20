# Platinum Center — Project Specs

## Visión general
Plataforma web de gestión de membresías para **Gimnasio Platinum Center** (Bogotá, Colombia).
Cliente: Sevastian Velandia (admin/dueño).
Desarrollador: Jhon Sebastián Delgado (Papacho).

## Problema que resuelve
- Control manual de membresías (sin sistema digital)
- Sin integración con el control de acceso físico (ZKTeco inBio Pro)
- Sin pasarela de pagos online
- Sin notificaciones automáticas de vencimiento

## Roles de usuario
| Rol | Acceso |
|---|---|
| `super_admin` | Acceso total — Sevastián y admins designados |
| `receptionist` | Solo registra miembros y pagos, sin reportes ni config |
| `member` | Portal propio: estado, historial, pagos, sugerencias, notificaciones |

## Planes de membresía
| Plan | Lógica |
|---|---|
| `1_day` | 24 horas exactas desde el momento del pago |
| `15_days` | 15 días de acceso consumibles dentro de un mes calendario |
| `1_month` | 30 días corridos desde el pago |
| `1_year` | 365 días corridos desde el pago |

> ⚠️ El plan `15_days` usa la tabla `member_day_passes` como contador de días consumidos. Ver `schema.md`.

## Stack tecnológico

### Frontend
- Vite + React + Redux + Ant Design
- Deploy: Vercel
- Ramas: `main` (prod) / `develop` (staging para cliente)

### Backend cloud
- FastAPI (Python) en Railway
- Dos servicios: `fastapi-test` y `fastapi-prod`

### Base de datos
- Supabase (PostgreSQL + Auth + Realtime + Webhooks + pg_cron)
- Dos proyectos: `platinum-center-test` y `platinum-center-prod`

### Backend local (PC del gym)
- FastAPI (Python) corriendo en el PC del gimnasio
- Cloudflare Tunnel para exponer el servicio local sin abrir puertos
- Repo separado: `platinum-center-local`

### Integraciones externas
| Servicio | Uso | Fase |
|---|---|---|
| Bold | Pasarela de pagos (PSE, Nequi, DaviPlata, tarjetas) | 5 |
| Brevo | Emails automáticos (vencimiento, bienvenida, confirmación) | 2 |
| ZKTeco Push SDK | Control de acceso físico (tarjetas RFID) | 4 |
| Cloudflare Tunnel | Puente internet ↔ PC del gym | 4 |
| WhatsApp API | Notificaciones (upgrade futuro, no en MVP) | Post-entrega |

## Repositorios
- `platinum-center` — Frontend + FastAPI cloud
- `platinum-center-local` — FastAPI local (PC del gym)

## Ambientes
| Ambiente | Branch | URL | BD |
|---|---|---|---|
| Staging | `develop` | Preview automático Vercel | `platinum-center-test` |
| Producción | `main` | Dominio propio | `platinum-center-prod` |

## Agentes de desarrollo
- **Claude** — arquitecto: diseño, decisiones, revisión, specs
- **Gemini / Antigravity CLI** — ejecutor: implementación siguiendo specs

> ⚠️ Antigravity debe consultar `specs/progress.md` antes de iniciar cualquier tarea.
> ⚠️ Todo cambio de decisión técnica debe quedar registrado en `specs/decisions.md`.
