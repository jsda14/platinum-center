# Membresías Grupales — Platinum Center

## Descripción
El gym maneja precios por volumen para grupos de personas que se inscriben juntas. Solo aplica para plan mensual.

## Precios de ejemplo (configurables por admin)
- 1 persona: precio normal del plan
- 2 personas: precio reducido por persona
- 3 o más personas: precio aún más reducido por persona

## Escenarios de pago

### Escenario 1 — Un pagador, múltiples beneficiarios
Un miembro paga el total por todo el grupo.
Sistema activa todas las membresías automáticamente.

### Escenario 2 — Pago dividido
Cada miembro del grupo paga su parte al precio grupal.
La membresía de cada uno se activa al confirmar su pago.

### Escenario 3 — Pago mixto
Combinación libre: uno puede pagar por varios,
otro paga solo lo suyo. Sistema distribuye correctamente.

### Escenario 4 — Pago presencial (admin/recepcionista)
El admin o recepcionista registra el grupo manualmente,
indica quién pagó qué monto y activa las membresías
correspondientes desde el panel admin.

## Schema requerido

### `plan_group_pricing`
Precios por volumen configurables por plan.

id                UUID PRIMARY KEY
plan_id           UUID REFERENCES plans(id)
min_members       INT NOT NULL   -- desde cuántas personas aplica
max_members       INT            -- null = sin límite superior
price_per_person  NUMERIC(10,2) NOT NULL
active            BOOLEAN DEFAULT TRUE
created_at        TIMESTAMPTZ DEFAULT NOW()

### `group_memberships`
Representa un grupo de personas inscritas juntas.

id              UUID PRIMARY KEY
name            TEXT            -- "Grupo de Juan y amigos"
created_by      UUID REFERENCES profiles(id)
plan_id         UUID REFERENCES plans(id)
total_members   INT NOT NULL
status          TEXT CHECK (status IN ('pending', 'partial', 'active', 'expired'))
created_at      TIMESTAMPTZ DEFAULT NOW()

### `group_membership_members`
Relación entre un grupo y sus miembros individuales.

id              UUID PRIMARY KEY
group_id        UUID REFERENCES group_memberships(id)
member_id       UUID REFERENCES members(id)
amount_paid     NUMERIC(10,2)  -- lo que pagó este miembro
payment_id      UUID REFERENCES payments(id)
status          TEXT CHECK (status IN ('pending_payment', 'confirmed'))
created_at      TIMESTAMPTZ DEFAULT NOW()

## Flujo completo

### Online (portal del miembro)
1. Miembro crea un grupo desde /portal/group
2. Agrega emails de los otros miembros
3. Sistema calcula precio por persona según volumen
4. Miembro elige: pagar todo o pagar solo lo suyo
5. Si paga todo → Bold procesa el total → activa todas las membresías
6. Si pago dividido → sistema genera link de pago individual
   para cada miembro con el precio grupal
7. Cada membresía se activa al confirmar su pago individual

### Presencial (panel admin/recepcionista)
1. Admin crea el grupo desde /admin/payments
2. Registra quién pagó qué monto (efectivo/Nequi/DaviPlata)
3. Sistema activa las membresías correspondientes
4. Envía email de bienvenida a cada miembro del grupo

## Fase de implementación
Fase 5 — Pagos + Notificaciones completas

## Impacto en schema existente
- Nueva tabla: plan_group_pricing
- Nueva tabla: group_memberships  
- Nueva tabla: group_membership_members
- Sin cambios en tablas existentes

## Notas importantes
- Solo aplica para plan mensual (1_month) en el MVP
- Los precios grupales son configurables desde el panel admin
- Un miembro puede pertenecer a un solo grupo activo a la vez
- Si un miembro del grupo no paga, solo su membresía queda inactiva
- El grupo se considera completo cuando todos tienen status=confirmed
