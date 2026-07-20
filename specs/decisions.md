# Decisions — Registro de decisiones técnicas

> Cada decisión técnica relevante queda registrada aquí con su justificación.
> Antes de cambiar algo del stack o la arquitectura, revisar este archivo.

---

## [2026-07] Stack frontend
**Decisión:** Vite + React + TypeScript + Redux + Ant Design
**Razón:** Stack conocido por el desarrollador. TypeScript garantiza tipado estricto y detección temprana de errores. Ant Design provee componentes de gestión listos (tablas, formularios, dashboards) ideales para el panel admin.

---

## [2026-07] Validación de datos — frontend
**Decisión:** Zod para validación estricta de schemas y formularios
**Razón:** Integra nativamente con TypeScript generando tipos inferidos. Valida tanto en formularios (UI) como en los datos que llegan de Supabase/API antes de usarlos en el dominio.

---

## [2026-07] Arquitectura frontend
**Decisión:** Arquitectura hexagonal (domain / application / infrastructure / ui)
**Razón:** Separa las reglas de negocio de los detalles de implementación. Facilita testing, mantenibilidad y futuros cambios de proveedor (ej: cambiar Supabase por otra BD sin tocar el dominio).

```
src/
├── domain/         # Entidades, tipos, Zod schemas — sin dependencias externas
├── application/    # Casos de uso — orquestan el dominio
├── infrastructure/ # Supabase, Redux, API calls — implementaciones externas
└── ui/             # Componentes React, páginas, layouts, hooks
```

---

## [2026-07] Estilos — frontend
**Decisión:** BEM estricto + CSS Modules
**Razón:** BEM garantiza nomenclatura predecible y sin colisiones. CSS Modules encapsula los estilos por componente, eliminando efectos secundarios globales. Cada componente tiene su propio `.module.css`.

Convención BEM en CSS Modules:
```css
/* MemberCard.module.css */
.member-card { }
.member-card__title { }
.member-card__status { }
.member-card__status--active { }
.member-card__status--expired { }
```

---

## [2026-07] Base de datos
**Decisión:** Supabase (PostgreSQL)
**Razón:** Auth, Realtime, Webhooks, pg_cron y storage en un solo servicio. Plan gratuito suficiente para el volumen de un gym pequeño. Evita manejar servidor propio.

---

## [2026-07] Backend cloud
**Decisión:** FastAPI en Railway
**Razón:** Vercel no soporta servidores de larga duración. Railway es simple, se conecta al repo de GitHub y el plan gratuito cubre el tráfico esperado.

---

## [2026-07] Pasarela de pagos
**Decisión:** Bold
**Razón:** Acepta Nequi, DaviPlata, PSE y tarjetas — los métodos que ya usa el gym. Integración simple vía webhook. Alternativa colombiana con buena documentación.

---

## [2026-07] Notificaciones
**Decisión:** Brevo para email en MVP. WhatsApp como upgrade futuro (pago).
**Razón:** Brevo tiene plan gratuito generoso. WhatsApp Business API tiene costo por mensaje — se deja para cuando el cliente quiera invertir más.

---

## [2026-07] Integración ZKTeco
**Decisión:** Push SDK (protocolo iClock/ADMS) vía FastAPI local en el PC del gym
**Razón:** El inBio Pro no tiene API REST moderna. El Push SDK es el protocolo oficial. El PC del gym ya existe y está en la misma LAN que el dispositivo — no requiere hardware adicional.

---

## [2026-07] Exposición del servicio local
**Decisión:** Cloudflare Tunnel (`cloudflared`)
**Razón:** Alternativa gratuita a ngrok. Sin necesidad de IP pública ni apertura de puertos en el router del gym. Se instala como servicio de Windows para persistencia.

---

## [2026-07] Revocación de acceso ZKTeco
**Decisión:** Sobreescribir `CardNo=0` en lugar de eliminar el usuario
**Razón:** Mantiene el historial de accesos intacto. La reactivación es inmediata con el número de tarjeta original. Más limpio que eliminar y recrear.

---

## [2026-07] Idempotencia en webhooks Bold
**Decisión:** UNIQUE constraint en `transaction_id` de la tabla `payments`
**Razón:** Bold puede reintentar webhooks. Sin este constraint, un mismo pago podría duplicar días de membresía o registrar dos cobros.

---

## [2026-07] Lógica plan 15 días
**Decisión:** Tabla separada `member_day_passes` con contador `days_used`
**Razón:** Los 15 días son consumibles dentro de un mes calendario, no corridos. Se necesita rastrear cuántos días ha usado el miembro en ese período. El acceso se revoca cuando `days_used = 15` (exhausted) o cuando vence el mes (expired).

---

## [2026-07] Cola de comandos ZKTeco
**Decisión:** Lista en memoria para MVP, SQLite para producción
**Razón:** En memoria es suficiente para desarrollo y pruebas. SQLite en producción garantiza que los comandos sobrevivan reinicios del PC del gym.

---

## [2026-07] Repositorios
**Decisión:** Dos repos separados (`platinum-center` / `platinum-center-local`)
**Razón:** El servicio local del gym tiene un ciclo de deploy completamente distinto — se instala una vez en el PC del gym y raramente se actualiza.

---

## [2026-07] Roles de usuario
**Decisión:** 3 roles — `super_admin`, `receptionist`, `member`
**Razón:** Sevastián necesita control total. El receptionist opera el día a día sin acceso a reportes financieros. El member tiene su portal propio de autogestión.

---

## [2026-07] Nomenclatura
**Decisión:** Variables, estados, claves y enums en inglés. Documentación (specs/) en español.
**Razón:** Estándar de la industria para código. Las specs en español facilitan la comunicación con el cliente y el equipo local.

---

## [2026-07] Ambientes
**Decisión:** TEST y PROD con Supabase + Railway separados por ambiente
**Razón:** Permite mostrarle avances a Sevastián en staging sin afectar datos reales. Costo adicional: $0 (ambos en plan gratuito durante el desarrollo).

---

## Plantilla para nuevas decisiones

```
## [YYYY-MM] Título corto
**Decisión:** Qué se decidió
**Razón:** Por qué — problema que resuelve, alternativas descartadas
**Impacto:** Qué archivos o fases afecta
```

---

## [2026-07] Gestor de paquetes frontend
**Decisión:** pnpm en lugar de npm
**Razón:** Más rápido, usa almacén central compartido sin duplicar dependencias, y es estricto con dependencias fantasma — solo accedes a lo que declaras explícitamente. Mayor seguridad por diseño.

---

## [2026-07] Linter frontend
**Decisión:** Oxlint
**Razón:** Escrito en Rust, entre 50-100x más rápido que ESLint. Es el estándar emergente para proyectos nuevos.

---

## [2026-07] Arquitectura backend-cloud
**Decisión:** Arquitectura hexagonal (domain / application / infrastructure / api)
**Razón:** Misma separación de responsabilidades que el frontend. Las reglas de negocio en `domain/` no dependen de FastAPI, Supabase ni ningún proveedor externo — son intercambiables sin tocar el dominio.

```
backend-cloud/src/
├── domain/         # Dataclasses, tipos, Pydantic schemas — sin dependencias externas
├── application/    # Casos de uso — orquestan el dominio
├── infrastructure/ # Supabase, Bold, Brevo — implementaciones externas
└── api/            # FastAPI routers — punto de entrada HTTP
```

**Validación backend:** Pydantic (incluido en FastAPI) — equivalente a Zod en el frontend.

---

## [2026-07] Principios de diseño de software (SOLID + SoC)
**Decisión:** Adopción obligatoria de principios SOLID (SRP, OCP, LSP, ISP, DIP) y Separación de Responsabilidades (SoC) como estándares de diseño en la arquitectura hexagonal tanto en frontend como en backend-cloud.
**Razón:** Mantenibilidad y desacoplamiento. Las reglas de negocio permanecen aisladas de los detalles de infraestructura (Supabase, FastAPI, React, Bold, Brevo). Permite realizar pruebas unitarias desacopladas y cambiar proveedores externos sin modificar la lógica del dominio o los casos de uso.
**Impacto:** Define la responsabilidad estricta de cada carpeta (`domain/`, `application/`, `infrastructure/`, `ui/` / `api/`). Prohíbe consultas directas a Supabase o lógica de fechas/membresías dentro de componentes UI o routers FastAPI.

