# SPEC: [SPEC-XXX] - [Nombre del Módulo o Feature]

### PROTOCOLO DE EJECUCIÓN AGÉNTICA (CERROJO ESTRICTO)

> Aplica a cualquier agente codificador (Claude, Gemini/Antigravity "Agy", Cursor, etc.). No es opcional.

1. **ALLOWLIST ABSOLUTA DE ARCHIVOS:** Únicamente tienes permiso de escritura sobre los archivos
   declarados en la Sección 1.1 (Archivos Autorizados). Cualquier otro archivo del repositorio tiene
   estado **BLOQUEADO para escritura**, sin excepción, aunque la sección "Prohibido modificar" no lo
   mencione explícitamente.
2. **GATE DE BLOQUEO (Stop Condition):** Si para resolver un error de compilación, tipos, linter o una
   referencia cruzada necesitas tocar un archivo fuera de la Allowlist:
   → **ABORTA INMEDIATAMENTE.** No lo corrijas por tu cuenta.
   → Emite literalmente: `[BLOCKED: Requiere cambios en <ruta_archivo>]` y cede el control al arquitecto.
3. **FASE 1 OBLIGATORIA (No-Write):** Antes de escribir o editar cualquier archivo, tu primer turno es de
   solo lectura: confirma que entendiste el diagnóstico (Sección 3) y los contratos (Sección 4), y
   enumera exactamente qué archivos de la Sección 1.1 vas a tocar y en qué orden (Sección 6). Espera
   aprobación explícita del arquitecto antes de usar herramientas de escritura.
4. **POLÍTICA DE NO-SUPOSICIÓN Y SCOPE CREEP:** Prohibido crear archivos helpers, utils o mocks no
   solicitados. Prohibido refactorizar código circundante, renombrar variables no relacionadas o
   modificar formato/estilo en líneas que no forman parte del cambio funcional. Cíñete al diff mínimo
   indispensable para satisfacer el contrato.
5. **BLOQUE DE EJECUCIÓN, NO TODO DE UNA:** Ejecuta únicamente el bloque de la Sección 6 que el
   arquitecto apruebe en ese turno. Al terminar un bloque, **detente y muestra el diff** — no continúes
   al siguiente bloque ni asumas aprobación implícita por la presencia de más pasos listados en el
   documento.
6. **COMANDOS DE GIT SEPARADOS:** Los comandos de `git commit`, `git push` y la edición de
   `specs/tasks/TASK_STATUS.md` NUNCA se ejecutan como parte de "terminar" un bloque de código. Van en
   el bloque de Cierre (Sección 6, último bloque), y solo se ejecutan cuando el arquitecto lo aprueba
   explícitamente después de validación funcional.
7. **VERIFICACIÓN DE INTEGRIDAD ANTES DE REPORTAR:** Antes de decir "listo" o "completado", ejecuta
   `git diff --name-only` y `git status --short`. Si aparece un archivo que NO está en la Sección 1.1:
   - Si es un archivo **modificado** (rastreado): revertirlo con `git restore <archivo>`.
   - Si es un archivo **nuevo** (no rastreado, aparece como `??` en `git status`): eliminarlo con
     `rm <archivo>` (`git checkout -- <archivo>` NO revierte archivos nuevos — no usar).
   No incluyas ese archivo en el diff que muestras al arquitecto.
8. **ARCHIVOS INTOCABLES SIEMPRE:** `backend-cloud/.env`, `frontend/.env.local`,
   `platinum-center-local/.env`, cualquier archivo de credenciales, `platinum-center-local/cloudflared.exe`.
   Nunca se modifican ni se incluyen en el diff, sin excepción, aunque no aparezcan en la Allowlist de
   esta SPEC puntual.

---

## 1. Alcance y Fronteras

* **Objetivo:** [Descripción precisa de 1 a 2 oraciones del cambio o funcionalidad]
* **SPEC ID:** SPEC-XXX
* **Repo:** [`platinum-center/frontend` / `platinum-center/backend-cloud` / `platinum-center-local`]
* **Tipo:** [Error / Tarea / Feature / Refactor]

### 1.1 Archivos Autorizados (ALLOWLIST)

* **Crear:**
  - `ruta/al/nuevo_archivo.tsx`
* **Modificar:**
  - `ruta/al/archivo_existente.tsx`
  - `ruta/al/archivo_existente.module.css`

> Cualquier archivo fuera de esta lista está BLOQUEADO para escritura — ver Cerrojo, punto 1 y 2.

* **Prohibido modificar (recordatorio explícito, no exhaustivo — la Allowlist ya es la única fuente de
  verdad):**
  - `frontend/src/infrastructure/api/*` (cliente HTTP compartido) — salvo que la SPEC sea justo sobre esto
  - `backend-cloud/src/infrastructure/supabase/client.py`
  - `backend-cloud/main.py` (registro de routers) — salvo autorización explícita para este ticket puntual
  - `*.env`, `*.env.local`, `*.env.example` con valores reales
  - `platinum-center-local/cloudflared.exe`, `platinum-center-local/commands.db`

### 1.2 Fuera de Alcance (Out-of-Scope / Non-Goals)

- [Exclusión explícita 1]
- [Exclusión explícita 2]

---

## 2. Entorno y Dependencias Permitidas

* **Runtime / Versión:** [Node 20+ / Python 3.12 / React 19 / FastAPI — el que aplique]
* **Librerías autorizadas:** Solo dependencias ya listadas en `package.json` (frontend) o
  `requirements.txt` (backend-cloud / Bridge).
* **Regla estricta:** Prohibido instalar o importar paquetes externos no autorizados sin aprobación del
  arquitecto.

---

## 3. Diagnóstico y Causa Raíz

> Esta sección es la que más evita iteraciones fallidas — no la recortes. Si el diagnóstico se basa en
> evidencia real (código leído, logs de Railway/Bridge, respuesta de un endpoint), cítala aquí
> explícitamente en vez de asumir.

```
[Traza del problema: archivo → línea → por qué falla]
[Si aplica: qué se intentó antes y por qué no funcionó]
```

---

## 4. Contratos e Interfaces (Single Source of Truth)

### 4.1 [Archivo 1] — `ruta/al/archivo_1.tsx`

```tsx
// ANTES
// ...

// DESPUÉS
// ...
```

### 4.2 [Archivo 2] — `ruta/al/archivo_2.py`

```python
# ANTES
# ...

# DESPUÉS
# ...
```

---

## 5. Reglas de Negocio y Casos Borde

### 5.1 Reglas de Negocio (RN)
- **RN-01:** [Descripción de la regla principal].
- **RN-02:** [Comportamiento esperado ante condiciones específicas].

### 5.2 Casos Borde (CB)
- **CB-01 (Entrada nula / vacía):** [Comportamiento controlado sin fallar la UI/API].
- **CB-02 (Fechas / zona horaria):** [Si aplica: todo cálculo de vigencia se hace en `America/Bogota`
  (UTC-5), nunca en el reloj del cliente].
- **CB-03 (Bridge caído / sin internet):** [Si aplica: el flujo debe encolar en `pending_commands` y
  responder 200 con warning, nunca 500 — ver `specs/big-picture.md` §6].
- **CB-04 (Responsive / Breakpoints):** [Si aplica al frontend: comportamiento en anchos específicos].

---

## 6. Plan de Ejecución (Bloques Detenibles)

> Cada bloque termina con el agente mostrando el diff y esperando aprobación explícita del arquitecto —
> nunca encadenar bloques automáticamente (Cerrojo, punto 5).

### Bloque 1 — [Nombre del bloque, ej. "Contratos y schemas base"]
- [ ] **Paso 1:** [Tarea atómica]
- [ ] **Paso 2:** [Tarea atómica]
- [ ] **Detenerse:** Mostrar diff completo. `git diff --name-only`. Esperar aprobación.

### Bloque 2 — [Nombre del bloque]
- [ ] **Paso 3:** [Tarea atómica]
- [ ] **Detenerse:** Mostrar diff completo. `git diff --name-only`. Esperar validación funcional antes
  de continuar.

### Bloque Final — Cierre (Git, solo tras aprobación explícita)
- [ ] **Paso N:** `git diff --name-only` — confirmar que coincide EXACTAMENTE con la Sección 1.1. Si no,
  revertir el archivo extra primero.
- [ ] **Paso N+1:** Commit: `<tipo>(<módulo>): <descripción> (SPEC-XXX)`.
- [ ] **Paso N+2:** Actualizar `specs/tasks/TASK_STATUS.md` a `🟣 IN REVIEW` (y `specs/progress.md` si
  aplica a una fase del tracker general).

---

## 7. Verificación y Checklist de Salida

- [ ] **1. Perímetro de disco:** `git diff --name-only` arroja EXACTAMENTE la lista de la Sección 1.1 —
  ni un archivo más.
- [ ] **2. Validación funcional:** Caso principal verificado (navegador / Swagger / simulador del
  Bridge según el repo). Sin errores en consola DevTools / logs.
- [ ] **3. Sin regresiones:** Módulos/componentes vecinos no afectados.
- [ ] **4. Sin scope creep:** Sin helpers, mocks o refactors no solicitados.
- [ ] **5. Trazabilidad:** SPEC completada, `specs/tasks/TASK_STATUS.md` en `🟣 IN REVIEW`.

---

## 📎 Nota operativa: cómo invocar cada bloque (recorte de horizonte)

> No le pegues la SPEC completa a Agy pidiendo "ejecuta todo". Aunque el Cerrojo dice "un bloque a la
> vez", recortar explícitamente lo que el agente puede planificar en cada turno reduce aún más el riesgo
> de que infiera y ejecute pasos futuros por su cuenta.

Al iniciar cada bloque, en `claude-to-agy.txt` usa un mensaje corto que acote el alcance de ESE turno:

```
Lee la SPEC adjunta (specs/tasks/SPEC-XXX-<slug>.md). Formula el plan SOLO para el Bloque 1.
Ignora cualquier bloque posterior por ahora — no lo planifiques ni lo ejecutes.
```

Y al aprobar:

```
Plan aprobado. Ejecuta únicamente el Bloque 1. Detente al finalizar y muéstrame el diff en
agy-to-claude.txt.
```

Repite este patrón bloque por bloque hasta llegar al "Bloque Final — Cierre", que solo se invoca tras
validación funcional explícita.
