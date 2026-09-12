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
26: ├── domain/         # Entidades, tipos, Zod schemas — sin dependencias externas
27: ├── application/    # Casos de uso — orquestan el dominio
28: ├── infrastructure/ # Supabase, Redux, API calls — implementaciones externas
29: └── ui/             # Componentes React, páginas, layouts, hooks
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

---

## [2026-07] Vista de detalle de miembro
**Decisión:** Página dedicada /admin/members/:id en lugar de modal expandido
**Razón:** El modal es insuficiente para mostrar historial de pagos, accesos y múltiples acciones. Una página dedicada es más limpia, escalable y fácil de entender para el admin.
**Impacto:** AdminMembers.tsx — click en miembro navega a detalle

---

## [2026-07] Dashboard métricas en backend
**Decisión:** Métricas del dashboard calculadas en Railway (FastAPI)
**Razón:** Escalabilidad, rendimiento y seguridad. PostgreSQL ejecuta
las agregaciones directamente, el frontend solo renderiza.
El volumen crecerá con el tiempo — esta arquitectura lo soporta.

---

## [2026-09] Migración completa de consultas cliente a Railway (BFF / API Gateway)
**Decisión:** Desacoplar el frontend de consultas directas a PostgreSQL/Supabase. El 100% de las consultas y mutaciones de datos de negocio (`members`, `payments`, `plans`, `profiles`, `gym_config`, `communications`) se ejecutan a través de endpoints en Railway utilizando autenticación Bearer token con roles verificados.
**Razón:** 
- **Seguridad:** Las políticas RLS de Supabase en cliente aumentan el vector de ataque si una regla se desconfigura. Un backend centralizado valida esquemas con Pydantic y aplica RBAC estricto.
- **Transaccionalidad atómica:** Operaciones críticas como registrar pagos manuales requieren consultar el plan, calcular fechas en UTC-5, crear el pago, actualizar el socio, renovar pases y encolar comandos de hardware en un solo ciclo server-side.
- **Separación de Responsabilidades:** El cliente solo renderiza; la inteligencia y reglas de negocio residen en el backend.

---

## [2026-09] Resiliencia y tolerancia a fallos en asignación física de chips RFID
**Decisión:** El endpoint `POST /admin/assign-chip` no retorna error HTTP 500 cuando el túnel local hacia el gimnasio (`bridge.gymplatinumcenter.com`) está caído o desconectado. En su lugar, guarda el comando en `pending_commands` de Supabase y responde exitosamente con estado `"queued"` y advertencia.
**Razón:** Evita que el recepcionista quede bloqueado o que el sistema impida entregar una tarjeta/manilla al socio si hay un corte de luz o microcorte de internet en el gimnasio. Cuando la PC local y el bridge vuelven a estar en línea, procesan la cola automáticamente.

---

## [2026-09] Eliminación de Check Constraints estáticos para Planes
**Decisión:** Eliminar las restricciones de base de datos PostgreSQL `payments_plan_check` y `members_plan_check` que limitaban los nombres de planes a valores fijos (`'1_day'`, `'15_days'`, `'1_month'`, `'1_year'`).
**Razón:** El gimnasio requiere crear planes dinámicos (trimestrales, semestrales, planes de pareja, promociones festivas) desde el panel administrativo sin requerir migraciones DDL manuales en la base de datos. La validación de existencia y vigencia de días se delega a la tabla relacional `plans` y al backend.

---

## [2026-09] Patrón LockedFeature diferenciado: Upsell Comercial (Admin) vs. Expectativa (Miembro)
**Decisión:** Rediseñar `LockedFeature` eliminando el overlay frosted glass borroso y diferenciando radicalmente la experiencia según el rol:
- **Admin:** Contenido 100% visible (tablas, calendarios) con badge flotante fijo dorado *"Función Premium"* y botones interactivos que despliegan modal con enlace directo a WhatsApp para cotizar la activación del módulo.
- **Miembro:** Banner amigable *"Próximamente"* y modales informativos de cortesía con botón *"Entendido"*, sin botones de WhatsApp comercial.
**Razón:** El administrador es el cliente comprador de la plataforma a quien se le ofrece un upsell de software de forma no invasiva pero persuasiva (ver el módulo terminado genera deseo de compra). Los miembros son socios del gimnasio que no deben ser direccionados al WhatsApp de ventas del desarrollador.

---

## [2026-09] Slider de navegación móvil segmentado con gestos universales de puntero
**Decisión:** En pantallas móviles, agrupar las 8 pestañas de navegación del portal de miembro en un carrusel slider de 2 páginas (4 ítems por página) utilizando animación por hardware (`transform: translateX`), controlado por una capa unificada de **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`), soporte de rueda/trackpad horizontal, puntos de paginación interactivos `[ • ○ ]` y flechas direccionales.
**Razón:** El espacio horizontal en smartphones (360px - 390px) impedía acomodar 8 iconos con etiquetas legibles sin truncar el texto o desbordar la pantalla. El uso de eventos de puntero reemplaza a `overflow-x: auto` nativo, permitiendo arrastre fluido tanto con los dedos en pantallas táctiles reales como con el mouse durante el desarrollo y pruebas en DevTools.

---

## [2026-09] Flujo integral de Membresías Grupales con pago unificado y activación multi-usuario simultánea
**Decisión:** Implementar la modalidad de Membresías Grupales (de 2 a 4 miembros) exclusivamente para planes mensuales (`1_month`), donde una sola persona (el organizador/pagador) realiza el abono total con descuento progresivo por persona definido dinámicamente en la tabla `plan_group_pricing`. Los IDs de todos los integrantes se vinculan a través de `payment_intents.metadata` y de los metadatos de la transacción en Bold. Tanto el webhook de aprobación (`POST /webhooks/bold-payment`) como el registro manual de recepción (`POST /admin/members/group-payment`) activan en cascada el plan mensual de 30 días para cada miembro y reprograman su chip en hardware ZKTeco.
**Razón:** Aumentar los ingresos y la retención de socios promoviendo el entrenamiento en pareja o grupo de amigos/familiares sin requerir micro-transacciones individuales fragmentadas ni intervención manual del recepcionista para activar a cada amigo.

---

## [2026-09] Centralización DRY de reglas de precios y límites grupales en la capa de Dominio
**Decisión:** Crear el módulo de dominio `src/domain/member/groupPricing.utils.ts` con funciones puras (`getGroupPricingBounds`, `findGroupPricingTier`, `calculateGroupPricingSummary`) consumidas tanto por el portal del miembro (`MemberRenewal.tsx`) como por el panel administrativo (`AdminPayments.tsx`).
**Razón:** Principio DRY (Don't Repeat Yourself) y Clean Architecture. Evita la duplicación de cálculos de límites dinámicos (`minPersons`, `maxPersons`), búsqueda de rangos de precio activos, cálculos de totales y validaciones en múltiples vistas de usuario, garantizando una única fuente de verdad y permitiendo pruebas unitarias desacopladas sin depender de la UI o de componentes React.


