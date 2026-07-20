# Schema — Supabase (PostgreSQL)

## Tablas principales

### `profiles`
Extiende `auth.users` de Supabase. Un registro por usuario registrado.

```sql
id            UUID PRIMARY KEY REFERENCES auth.users(id)
full_name     TEXT NOT NULL
email         TEXT NOT NULL
phone         TEXT
role          TEXT NOT NULL CHECK (role IN ('super_admin', 'receptionist', 'member'))
avatar_url    TEXT
created_at    TIMESTAMPTZ DEFAULT NOW()
```

---

### `members`
Información específica del miembro del gym. Solo usuarios con `role='member'`.

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE
zkteco_user_id  TEXT UNIQUE        -- PIN interno en el inBio Pro
card_no         TEXT UNIQUE        -- Número de tarjeta RFID física
status          TEXT NOT NULL CHECK (status IN ('active', 'expired', 'suspended'))
plan            TEXT CHECK (plan IN ('1_day', '15_days', '1_month', '1_year'))
start_date      DATE
end_date        DATE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

---

### `payments`
Registro de todos los pagos (manuales y Bold).

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
member_id         UUID REFERENCES members(id)
amount            NUMERIC(10,2) NOT NULL
method            TEXT CHECK (method IN ('cash', 'nequi', 'daviplata', 'bold', 'other'))
plan              TEXT CHECK (plan IN ('1_day', '15_days', '1_month', '1_year'))
transaction_id    TEXT UNIQUE        -- ID de Bold (UNIQUE para idempotencia)
status            TEXT CHECK (status IN ('pending', 'confirmed', 'failed'))
registered_by     UUID REFERENCES profiles(id)
payment_date      TIMESTAMPTZ DEFAULT NOW()
plan_start_date   DATE
plan_end_date     DATE
created_at        TIMESTAMPTZ DEFAULT NOW()
```

> ⚠️ `transaction_id` tiene UNIQUE constraint para evitar duplicados en webhooks de Bold.

---

### `plans`
Configuración de planes editable por el admin.

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          TEXT NOT NULL          -- "1 Day", "15 Days", "1 Month", "1 Year"
slug          TEXT UNIQUE NOT NULL   -- "1_day", "15_days", "1_month", "1_year"
duration_days INT NOT NULL
price         NUMERIC(10,2) NOT NULL
active        BOOLEAN DEFAULT TRUE
created_at    TIMESTAMPTZ DEFAULT NOW()
```

---

### `member_day_passes`
Contador de días consumibles para el plan `15_days`.
Solo se crea un registro por cada pago de plan `15_days`.

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
member_id     UUID REFERENCES members(id)
payment_id    UUID REFERENCES payments(id)
days_total    INT DEFAULT 15          -- siempre 15
days_used     INT DEFAULT 0           -- se incrementa con cada entrada registrada
valid_from    DATE                    -- fecha del pago
valid_until   DATE                    -- valid_from + 30 días (un mes calendario)
status        TEXT CHECK (status IN ('active', 'expired', 'exhausted'))
              -- 'exhausted' = usó los 15 días antes de que venza el mes
              -- 'expired'   = venció el mes sin consumir todos los días
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

**Lógica de acceso para plan `15_days`:**
1. FastAPI verifica que `days_used < days_total` Y `NOW() < valid_until`
2. Si se permite entrada → incrementar `days_used` en 1
3. Si `days_used` llega a 15 → status = `'exhausted'` → revocar acceso en inBio Pro
4. Si `valid_until < NOW()` → status = `'expired'` → revocar acceso en inBio Pro

---

### `access_logs`
Registro de cada evento del torniquete (entrada/denegado).

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
member_id     UUID REFERENCES members(id)
card_no       TEXT NOT NULL
event_type    TEXT CHECK (event_type IN ('granted', 'denied', 'unknown'))
door          INT                  -- número de puerta/lector (1-4)
timestamp     TIMESTAMPTZ NOT NULL
raw_payload   TEXT                 -- línea cruda del Push SDK para debug
created_at    TIMESTAMPTZ DEFAULT NOW()
```

---

### `suggestions`
Recomendaciones y sugerencias enviadas por los miembros.

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
member_id   UUID REFERENCES members(id)
message     TEXT NOT NULL
status      TEXT CHECK (status IN ('pending', 'read', 'answered')) DEFAULT 'pending'
response    TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
```

---

### `gym_config`
Configuración general del gym (una sola fila).

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          TEXT NOT NULL DEFAULT 'Gimnasio Platinum Center'
logo_url      TEXT
address       TEXT
phone         TEXT
email         TEXT
opening_time  TIME
closing_time  TIME
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

---

## Relaciones clave

```
auth.users
    └── profiles (1:1)
            └── members (1:1) ← solo si role = 'member'
                    ├── payments (1:N)
                    │       └── member_day_passes (1:1) ← solo si plan = '15_days'
                    ├── access_logs (1:N)
                    └── suggestions (1:N)
```

---

## Lógica de fechas por plan

| Plan | start_date | end_date | Tabla extra |
|---|---|---|---|
| `1_day` | NOW() | NOW() + 1 día (24h exactas) | — |
| `15_days` | NOW() | NOW() + 30 días | `member_day_passes` |
| `1_month` | NOW() | NOW() + 30 días | — |
| `1_year` | NOW() | NOW() + 365 días | — |

> ⚠️ Para `15_days`: `end_date` en `members` marca el límite del mes calendario.
> El acceso real lo controla `member_day_passes.days_used` vs `days_total`.

---

## Jobs automáticos (pg_cron)

```sql
-- Cada hora: marca expired los miembros con end_date < NOW()
SELECT cron.schedule(
  'check-expired-members',
  '0 * * * *',
  $$
    UPDATE members
    SET status = 'expired', updated_at = NOW()
    WHERE end_date < NOW()
    AND status = 'active';
  $$
);

-- Cada hora: marca expired los day_passes vencidos por fecha
SELECT cron.schedule(
  'check-expired-day-passes',
  '0 * * * *',
  $$
    UPDATE member_day_passes
    SET status = 'expired', updated_at = NOW()
    WHERE valid_until < NOW()
    AND status = 'active';
  $$
);
```

Ambos cambios de status disparan webhooks de Supabase → Railway → PC gym → inBio Pro.

---

## Row Level Security (RLS)

| Tabla | super_admin | receptionist | member |
|---|---|---|---|
| profiles | CRUD total | solo lectura | solo el propio |
| members | CRUD total | INSERT + UPDATE básico | solo el propio |
| payments | CRUD total | INSERT | solo los propios |
| member_day_passes | CRUD total | lectura | solo los propios |
| access_logs | lectura total | lectura total | solo los propios |
| suggestions | CRUD total | lectura | INSERT + los propios |
| gym_config | CRUD total | lectura | — |
