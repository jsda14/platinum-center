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
- **Vite + React + TypeScript** — base del proyecto
- **Pydantic** — validación estricta en el backend (equivalente a Zod)
- **Redux Toolkit** — estado global
- **Ant Design** — componentes UI
- **React Router DOM** — navegación
- **Zod** — validación estricta de schemas y formularios
- **CSS Modules + BEM estricto** — estilos encapsulados por componente
- **Arquitectura hexagonal** — domain / application / infrastructure / ui
- Deploy: Vercel
- Ramas: `main` (prod) / `develop` (staging para cliente)

### Arquitectura hexagonal — estructura `src/`
```
src/
├── domain/           # Entidades, tipos TS, Zod schemas — sin dependencias externas
│   ├── member/
│   ├── payment/
│   └── plan/
├── application/      # Casos de uso — orquestan el dominio
│   ├── member/
│   └── payment/
├── infrastructure/   # Implementaciones externas
│   ├── supabase/     # client.ts + repositories
│   ├── api/          # llamadas a Railway
│   └── store/        # Redux slices
└── ui/               # React
    ├── components/   # Componentes reutilizables (cada uno con .module.css)
    ├── pages/
    ├── layouts/
    └── hooks/
```

### Convención BEM en CSS Modules
```css
/* ComponentName.module.css */
.component-name { }
.component-name__element { }
.component-name__element--modifier { }
```

### Backend cloud
- FastAPI (Python) en Railway
- Dos servicios: `fastapi-test` y `fastapi-prod`

### Base de datos
- Supabase (PostgreSQL + Auth + Realtime + Webhooks + pg_cron)
- Dos proyectos: `platinum-center-test` y `platinum-center-prod`
- API keys nuevas: `sb_publishable_...` (frontend) y `sb_secret_...` (backend)

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

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=https://kgxtipwpzdljdoluclrs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_URL=http://localhost:8000
```

### Backend cloud (`backend-cloud/.env`)
```
SUPABASE_URL=https://kgxtipwpzdljdoluclrs.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
GYM_TUNNEL_URL=
BOLD_WEBHOOK_SECRET=
BREVO_API_KEY=
```

## Agentes de desarrollo
- **Claude** — arquitecto: diseño, decisiones, revisión, specs
- **Gemini / Antigravity CLI** — ejecutor: implementación siguiendo specs

> ⚠️ Antigravity debe consultar `specs/progress.md` antes de iniciar cualquier tarea.
> ⚠️ Todo cambio de decisión técnica debe quedar registrado en `specs/decisions.md`.
> ⚠️ Todo código nuevo debe respetar la arquitectura hexagonal y las convenciones BEM + CSS Modules.

---

## Arquitectura hexagonal — backend-cloud `src/`

```
src/
├── domain/           # Dataclasses, tipos, Pydantic schemas — sin dependencias externas
│   ├── member/
│   ├── payment/
│   └── plan/
├── application/      # Casos de uso — orquestan el dominio
│   ├── member/
│   └── payment/
├── infrastructure/   # Implementaciones externas
│   ├── supabase/     # client.py + repositories
│   ├── bold/         # webhook handler
│   └── brevo/        # email service
└── api/              # FastAPI routers — punto de entrada HTTP
    ├── routes/       # members.py, payments.py, health.py
    └── dependencies.py
```

> `main.py` solo inicializa FastAPI y registra los routers — sin lógica de negocio.
> Validación con **Pydantic** en `domain/` — equivalente a Zod en el frontend.
