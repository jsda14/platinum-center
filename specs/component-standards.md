# Component Standards — Platinum Center Frontend

> ⚠️ Antigravity debe leer este archivo antes de crear o modificar cualquier componente React.
> Estas reglas son obligatorias y no negociables.

---

## Estructura de carpetas por componente

Cada componente vive en su propia carpeta con este patrón:

```
ui/components/ComponentName/
├── ComponentName.tsx
└── ComponentName.module.css

ui/pages/PageName/
├── PageName.tsx
└── PageName.module.css
```

Un componente = una carpeta. Sin excepciones.

---

## Nombrado de archivos

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente | PascalCase | `MemberCard.tsx` |
| CSS Module | PascalCase + .module.css | `MemberCard.module.css` |
| Tipos | camelCase + .types.ts | `member.types.ts` |
| Schema Zod | camelCase + .schema.ts | `member.schema.ts` |
| Repository | camelCase + .repository.ts | `member.repository.ts` |
| Caso de uso | camelCase + .usecase.ts | `getMember.usecase.ts` |
| Hook | camelCase + use prefix | `useAuth.ts` |

---

## Estructura interna de un componente

```typescript
// 1. Imports externos
import { useState } from 'react'
import { Button } from 'antd'

// 2. Imports internos (tipos, schemas, utils)
import type { Member } from '@/domain/member/member.types'

// 3. CSS Module
import styles from './MemberCard.module.css'

// 4. Interface de props — SIEMPRE nombrada, nunca inline
interface MemberCardProps {
  member: Member
  onRenew?: () => void
}

// 5. Componente — function declaration, nunca arrow function en el export
export function MemberCard({ member, onRenew }: MemberCardProps) {
  // hooks primero
  // handlers después
  // return al final
}
```

---

## BEM estricto en CSS Modules

```css
/* ✅ Correcto */
.member-card { }
.member-card__header { }
.member-card__title { }
.member-card__status { }
.member-card__status--active { }
.member-card__status--expired { }
.member-card__status--warning { }

/* ❌ Incorrecto */
.memberCard { }           /* camelCase prohibido */
.card-title { }           /* sin bloque padre */
.member-card__header__title { }  /* triple anidación prohibida */
```

En el componente:
```typescript
/* ✅ Correcto */
<div className={styles['member-card']}>
  <span className={`${styles['member-card__status']} ${styles['member-card__status--active']}`}>

/* ❌ Incorrecto */
<div className={styles.memberCard}>
<div style={{ color: 'red' }}>  /* inline styles prohibidos */
```

---

## Variables CSS — solo las definidas en _variables.css

```css
/* ✅ Correcto */
.member-card {
  background: var(--color-dark-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: var(--transition-normal);
}

/* ❌ Incorrecto */
.member-card {
  background: #2E2E2E;        /* valor hardcodeado */
  border-radius: 16px;        /* valor hardcodeado */
  transition: 0.25s ease;     /* valor hardcodeado */
}
```

---

## TypeScript — reglas estrictas

```typescript
/* ✅ Correcto */
interface MemberCardProps {
  member: Member
  isLoading?: boolean
}

/* ❌ Prohibido */
const Component = (props: any) => {}           /* any prohibido */
const Component = (props: { id: string }) => {} /* tipos inline prohibidos */
// @ts-ignore                                   /* ignore prohibido */
```

---

## Estados obligatorios en componentes con datos

Todo componente que carga datos debe manejar los tres estados:

```typescript
if (isLoading) return <LoadingState />
if (error) return <ErrorState message={error} />
if (!data) return <EmptyState />
return <ActualComponent data={data} />
```

---

## Animaciones — solo las definidas en global.css

```css
/* ✅ Permitido */
.member-card {
  animation: fadeInUp var(--transition-slow) ease forwards;
}

/* ❌ Prohibido — definir nuevas animaciones en module.css */
@keyframes myCustomAnimation { }
```

Si necesitas una animación nueva, se agrega primero en `global.css` y luego se usa.

---

## Accesibilidad mínima

```typescript
/* ✅ Obligatorio en elementos interactivos */
<button aria-label="Renovar membresía" onClick={onRenew}>
<img src={logo} alt="Logo Platinum Center" />
<input aria-describedby="email-error" />

/* Roles semánticos */
<nav role="navigation">
<main role="main">
<section aria-labelledby="section-title">
```

---

## Prohibiciones absolutas

```typescript
❌ No usar !important en CSS
❌ No usar inline styles (style={{}})
❌ No usar any en TypeScript
❌ No usar @ts-ignore
❌ No importar directamente desde Supabase en componentes UI
   (solo a través de infrastructure/ o application/)
❌ No definir lógica de negocio dentro de componentes
   (va en application/ o hooks)
❌ No crear animaciones nuevas fuera de global.css
❌ No hardcodear colores, tamaños o tiempos (usar variables CSS)
```

---

## Patrón de validación con Zod

```typescript
// En formularios — validar antes de enviar
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres')
})

// Al recibir datos de Supabase — validar antes de usar
const result = memberSchema.safeParse(rawData)
if (!result.success) {
  console.error(result.error)
  return
}
const member = result.data  // tipado y validado
```

---

## Path aliases

Usar `@/` para imports absolutos desde `src/`:

```typescript
/* ✅ Correcto */
import { supabase } from '@/infrastructure/supabase/client'
import type { Member } from '@/domain/member/member.types'

/* ❌ Incorrecto */
import { supabase } from '../../../infrastructure/supabase/client'
```

> ⚠️ Configurar el alias `@` en `vite.config.ts` y `tsconfig.json` si no está hecho.

---

## Principios SOLID y Separación de Responsabilidades (SoC)

### 1. Principios SOLID aplicados al proyecto

#### Single Responsibility Principle (SRP) — Responsabilidad Única
Cada módulo, clase o componente React debe tener una sola razón para cambiar.
- **Frontend (React)**: Un componente UI solo presenta datos y captura eventos del usuario. La lógica de negocio va en `application/` o custom hooks; las llamadas externas van en `infrastructure/`.
- **Backend (FastAPI)**: Un router solo maneja HTTP (status codes, request parsing). El caso de uso en `application/` orquesta la lógica de negocio; el repositorio en `infrastructure/` maneja PostgreSQL/Supabase.

*Ejemplo de SRP (Frontend React)*:
```typescript
// ❌ Violación: Componente UI que hace llamadas directas a Supabase, valida y calcula fechas
export function MemberRenew({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false);
  const handleRenew = async () => {
    setLoading(true);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    await supabase.from('members').update({ status: 'active', end_date: endDate }).eq('id', memberId);
    setLoading(false);
  };
  return <button onClick={handleRenew}>Renovar</button>;
}

// ✅ Correcto (SRP): Componente delega la acción al caso de uso / Redux thunk
export function MemberRenew({ memberId }: MemberRenewProps) {
  const { handleRenew, isLoading } = useRenewMember(memberId);
  return (
    <Button loading={isLoading} onClick={handleRenew}>
      Renovar Membresía
    </Button>
  );
}
```

*Ejemplo de SRP (Backend FastAPI)*:
```python
# ❌ Violación: Router FastAPI ejecutando SQL/Supabase directamente y calculando vencimiento
@router.post("/members/{member_id}/renew")
async def renew_member(member_id: str):
    end_date = datetime.now() + timedelta(days=30)
    supabase.table("members").update({"end_date": end_date}).eq("id", member_id).execute()
    return {"status": "ok"}

# ✅ Correcto (SRP): Router delega en el caso de uso RenewMemberUseCase
@router.post("/members/{member_id}/renew")
async def renew_member(member_id: str, use_case: RenewMemberUseCase = Depends(get_renew_use_case)):
    return await use_case.execute(member_id)
```

#### Open/Closed Principle (OCP) — Abierto a extensión, cerrado a modificación
Las entidades y servicios deben permitir extender su funcionalidad sin modificar su código fuente existente.
- **Frontend**: Utilizar composición de componentes (`children`, slots) o estrategias de formateo basadas en mapas/enums en lugar de bloques `if/else` o `switch` gigantes.
- **Backend**: Definir interfaces/clases abstractas (Protocols o ABCs) para servicios externos (ej: `NotificationService`, `PaymentGateway`). Si se cambia de Brevo a SendGrid o de Bold a Wompi, solo se añade una nueva implementación sin alterar el caso de uso.

#### Liskov Substitution Principle (LSP) — Sustitución de Liskov
Las subclases o implementaciones alternativas deben ser sustituibles por sus clases base sin alterar el comportamiento correcto del programa.
- **Backend**: Toda implementación de `MemberRepository` (ya sea `SupabaseMemberRepository` o `MockMemberRepository` para tests) debe respetar estrictamente la interfaz declarada en el dominio.

#### Interface Segregation Principle (ISP) — Segregación de Interfaces
Ningún cliente debe depender de métodos que no utiliza.
- **TypeScript / Python**: En lugar de pasar una entidad completa gigante `Member` a un componente que solo muestra un avatar, definir props o interfaces pequeñas y enfocadas (ej: `AvatarProps { name: string; avatarUrl?: string }`).

#### Dependency Inversion Principle (DIP) — Inversión de Dependencias
Los módulos de alto nivel (dominio y aplicación) no deben depender de módulos de bajo nivel (infraestructura). Ambos deben depender de abstracciones.
- **Frontend/Backend**: La capa `application/` depende de interfaces definidas en `domain/`. La capa `infrastructure/` implementa dichas interfaces.

---

### 2. Reglas de Separación de Responsabilidades (SoC) por capa

```
src/ (Frontend)  /  src/ (Backend-Cloud)
├── domain/         --> Reglas de negocio puras, tipos TS/dataclasses, esquemas Zod/Pydantic.
│                       SIN dependencias de React, FastAPI, Supabase, Redux, HTTP.
├── application/    --> Casos de uso e interacción de reglas de negocio.
│                       Orquestan el flujo. Dependen SOLO del dominio.
├── infrastructure/ --> Implementaciones de persistencia y API externa (Supabase, Bold, Brevo, Redux store).
└── ui/ o api/      --> Interfaz visual (React) o interfaz de API REST (FastAPI).
```

| Capa | Responsabilidad | Lo que PUEDE incluir | Lo que NO PUEDE incluir |
|---|---|---|---|
| `domain/` | Entidades y reglas de negocio puras | Interfaces/Tipos, Schemas (Zod/Pydantic), Enums, validadores puros | React, FastAPI, Supabase client, Redux, llamadas HTTP |
| `application/` | Orquestación de casos de uso | Clases/funciones de caso de uso, llamadas a repositorios abstractos | JSX/HTML, componentes UI, dependencias directas de Supabase/FastAPI |
| `infrastructure/` | Integraciones externas y persistencia | Clientes Supabase, Bold, Brevo, Redux slices/store, implementaciones de repositorios | Componentes UI React, endpoints HTTP |
| `ui/` (Frontend) | Presentación y navegación | Componentes React, hooks UI, CSS Modules, Ant Design | Consultas directas a Supabase, reglas de negocio complejas |
| `api/` (Backend) | Controladores y endpoints HTTP | FastAPI routers, DTOs de entrada/salida HTTP, dependencias FastAPI | Consultas SQL/Supabase directas, lógica de negocio |

---

### 3. Ejemplos de violaciones comunes y cómo corregirlas

#### Violación 1: Consulta directa a Supabase dentro de un componente React
```typescript
// ❌ Incorrecto: ui/components/MemberList.tsx
import { supabase } from '@/infrastructure/supabase/client';

export function MemberList() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    supabase.from('members').select('*').then(({ data }) => setMembers(data));
  }, []);
  return <div>{members.map(...)}</div>;
}

// ✅ Correcto: La llamada a Supabase vive en infrastructure/repositories o Redux thunk,
// el componente consume el hook de estado o caso de uso.
import { useMembers } from '@/ui/hooks/useMembers';

export function MemberList() {
  const { members, isLoading } = useMembers();
  if (isLoading) return <LoadingState />;
  return <MemberTable members={members} />;
}
```

#### Violación 2: Lógica de negocio hardcodeada en un router FastAPI
```python
# ❌ Incorrecto: api/routes/members.py
@router.post("/members")
async def create_member(data: dict):
    if data["plan"] == "15_days":
        valid_until = date.today() + timedelta(days=30)
    # ...
    supabase.table("members").insert(...).execute()

# ✅ Correcto: El router invoca el caso de uso CreateMemberUseCase
@router.post("/members", response_model=MemberResponse)
async def create_member(
    data: CreateMemberDTO,
    use_case: CreateMemberUseCase = Depends(get_create_member_use_case)
):
    return await use_case.execute(data)
```

