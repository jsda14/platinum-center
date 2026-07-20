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
