-- Marca si un pago con start_date futuro ya fue aplicado a members + chip.
-- Default true: todo pago existente (sin start_date futuro) se considera ya aplicado.
ALTER TABLE payments
  ADD COLUMN activation_applied BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN payments.activation_applied IS
  'false = pago con plan_start_date futuro, pendiente de que el cron active members + chip en esa fecha';
