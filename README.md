# Platinum Center — Gym Management Platform

Plataforma web de gestión de membresías para **Gimnasio Platinum Center** (Bogotá, Colombia).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React + Redux + Ant Design |
| Backend cloud | FastAPI (Python) en Railway |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime) |
| Control de acceso | ZKTeco inBio Pro vía Push SDK |
| Pagos | Bold |
| Notificaciones | Brevo (email) |
| Deploy | Vercel (frontend) + Railway (backend) |

## Repositorios

| Repo | Descripción |
|---|---|
| `platinum-center` | Frontend + FastAPI cloud (este repo) |
| `platinum-center-local` | FastAPI local instalado en el PC del gym |

## Ambientes

| Ambiente | Branch | BD |
|---|---|---|
| Staging | `develop` | `platinum-center-test` (Supabase) |
| Producción | `main` | `platinum-center-prod` (Supabase) |

## Estructura

```
platinum-center/
├── specs/              # Documentación técnica del proyecto
│   ├── project.md      # Visión general, stack, fases
│   ├── schema.md       # Tablas de Supabase y relaciones
│   ├── zkteco.md       # Protocolo Push SDK y endpoints
│   ├── progress.md     # Estado actual del proyecto
│   └── decisions.md    # Decisiones técnicas y justificaciones
├── frontend/           # Vite + React + Redux + Ant Design
├── backend-cloud/      # FastAPI para Railway
└── README.md
```

## Agentes de desarrollo

- **Claude** — arquitecto: diseño, decisiones, revisión de código, actualización de specs
- **Gemini / Antigravity CLI** — ejecutor: implementación siguiendo las specs

> ⚠️ Consultar `specs/progress.md` antes de iniciar cualquier tarea.

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

### Backend cloud (`backend-cloud/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GYM_TUNNEL_URL=
BOLD_WEBHOOK_SECRET=
BREVO_API_KEY=
```

## Comandos rápidos

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend cloud
cd backend-cloud
pip install -r requirements.txt
uvicorn main:app --reload
```
