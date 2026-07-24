# Security — Configuración y Buenas Prácticas de Seguridad

## 1. Autenticación y sesiones
- Supabase Auth maneja tokens JWT — expiración y refresh automático.
- RLS (Row Level Security) en todas las tablas — ningún usuario accede a datos de otro.
- Roles estrictos: `super_admin`, `receptionist`, `member`.
- Google OAuth habilitado — pendiente configurar Client ID.

## 2. Seguridad del frontend
- Variables de entorno con prefijo `VITE_` solo para claves públicas.
- Nunca exponer `SUPABASE_SECRET_KEY` ni `BOLD_SECRET_KEY` en el frontend.
- `ProtectedRoute` valida rol antes de renderizar cualquier página.
- Validación Zod en todos los formularios antes de enviar al backend.

## 3. Seguridad del backend (Railway)
- `BOLD_SECRET_KEY` solo en variables de entorno de Railway, nunca en código.
- `SUPABASE_SECRET_KEY` solo en backend, nunca en frontend.
- `SUPABASE_WEBHOOK_SECRET` valida que webhooks vengan de Supabase.
- Bold webhook signature validation: restaurar antes de producción (actualmente comentada).
- CORS configurado: solo orígenes autorizados (localhost, Vercel URLs).

## 4. Seguridad de pagos (Bold)
- Integrity signature generada en el backend — nunca en el frontend.
- `payment_intents` tabla como fuente de verdad del contexto del pago.
- Idempotencia: `UNIQUE` constraint en `transaction_id` de `payments`.
- Monto del plan tomado de Supabase en el webhook, no del payload de Bold.
- Restaurar validación HMAC-SHA256 del webhook de Bold antes de producción.

## 5. Base de datos (Supabase)
- RLS habilitado en todas las tablas.
- Políticas por rol: `super_admin`, `receptionist`, `member`, `service_role`.
- `SECURITY DEFINER` en funciones helper para evitar recursión en RLS.
- pg_cron corre con privilegios de `service_role`.
- Webhooks validados con `SUPABASE_WEBHOOK_SECRET`.

## 6. Checklist antes de producción (Fase 6)
- [ ] Restaurar validación HMAC-SHA256 en webhook de Bold.
- [ ] Rotar todas las keys de prueba por keys de producción de Sevastián.
- [ ] Configurar DKIM con dominio propio en Brevo.
- [ ] Migrar emails a Supabase Edge Functions.
- [ ] Revisar políticas RLS con datos reales.
- [ ] Configurar rate limiting en Railway.
- [ ] Habilitar HTTPS-only en todos los endpoints.
- [ ] Auditar variables de entorno — eliminar prints de diagnóstico.

> ⚠️ Antigravity no debe saltarse ningún ítem de seguridad sin aprobación de Claude.
