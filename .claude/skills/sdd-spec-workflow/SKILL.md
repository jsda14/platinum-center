---
name: sdd-spec-workflow
description: >-
  Protocolo obligatorio de desarrollo para el proyecto Platinum Center (frontend + backend-cloud + Bridge).
  Exige Spec-Driven Development (SDD) con Cerrojo de Ejecución Agéntica estricto: allowlist de archivos,
  bloques detenibles, auditoría de diff. Utilizar siempre al iniciar, especificar, implementar, auditar o
  cerrar cualquier tarea técnica, bugfix o feature nueva. Sin dependencia de Jira ni de ninguna herramienta
  externa de tickets.
---

# SDD & Harness-Driven Workflow — Platinum Center

Este runbook define el protocolo de ingeniería obligatorio para todo asistente de IA y desarrollador en
los repos `platinum-center` y `platinum-center-local`. Es la adaptación sin Jira del flujo SDD validado
en otros proyectos (origen: `sdd-jira-workflow`) — aquí el rastreo de tareas es un contador local
(`SPEC-XXX`), no un sistema externo.

**Roles fijos del proyecto:** Claude (y el usuario) = arquitectos — diseñan, escriben y aprueban la SPEC.
Gemini / Antigravity CLI ("Agy") = ejecutor — codifica únicamente lo que la SPEC aprobada autoriza.
Comunicación entre Claude y Agy: `claude-to-agy.txt` / `agy-to-claude.txt` en la raíz del repo.

---

## 🔒 Cerrojo de Ejecución Agéntica (obligatorio para TODO agente codificador)

> Aplica sin excepción a Claude, Gemini/Antigravity (Agy), Cursor, Windsurf o cualquier otro asistente que
> codifique en estos repos. No es una sugerencia — es la Regla de Oro.

1. **ALLOWLIST ABSOLUTA:** El agente solo tiene permiso de escritura sobre los archivos listados en la
   Sección 1.1 de la SPEC ("Archivos Autorizados"). Todo lo demás está BLOQUEADO para escritura, incluso
   si no aparece explícitamente en "Prohibido modificar".
2. **GATE DE BLOQUEO (Stop Condition):** Si para resolver un error de build/lint/tipos el agente necesita
   tocar un archivo fuera de la allowlist, debe **abortar inmediatamente**, emitir
   `[BLOCKED: Requiere cambios en <ruta_archivo>]` y ceder el control al arquitecto — nunca corregirlo por
   su cuenta.
3. **FASE DE SOLO LECTURA ANTES DE ESCRIBIR:** El primer turno del agente sobre una SPEC aprobada es de
   solo lectura: confirma diagnóstico + contratos entendidos, enumera qué archivos va a tocar y en qué
   orden. Espera aprobación explícita antes de usar herramientas de escritura.
4. **NO SCOPE CREEP:** Prohibido crear helpers/mocks/utils no solicitados, refactorizar código circundante
   o tocar formato fuera del diff funcional mínimo.
5. **EJECUCIÓN POR BLOQUES, NUNCA ENCADENADA:** El agente ejecuta un bloque de la Sección 6 de la SPEC, se
   detiene, muestra el diff y espera aprobación explícita antes del siguiente bloque — la sola presencia
   de más pasos listados en el documento NO es autorización para continuar.
6. **GIT SEPARADO DEL CÓDIGO:** Commits y push van únicamente en el "Bloque Final — Cierre" de la SPEC, y
   solo se ejecutan tras aprobación explícita del arquitecto post-validación funcional. Nunca se disparan
   como efecto colateral de "terminar" un bloque de código.
7. **AUDITORÍA ANTES DE REPORTAR:** Antes de decir "listo", el agente corre `git diff --name-only` y
   `git status --short`. Si hay un archivo fuera de la allowlist: `git restore <archivo>` si está
   modificado, o `rm <archivo>` si es nuevo/no rastreado (`git checkout --` NO revierte archivos nuevos).
   Nunca lo incluye en el diff mostrado al arquitecto.
8. **ARCHIVOS INTOCABLES DE INFRAESTRUCTURA:** `backend-cloud/.env`, `frontend/.env.local`,
   `platinum-center-local/.env`, cualquier archivo de credenciales/secrets, y
   `platinum-center-local/cloudflared.exe` nunca se modifican, regeneran ni se incluyen en un diff — ni
   siquiera temporalmente. Si una herramienta los toca como efecto colateral, es un `[BLOCKED]` real.

Este cerrojo está integrado en [SPEC_TEMPLATE.md](./resources/SPEC_TEMPLATE.md) — toda SPEC nueva lo trae
por defecto en su encabezado.

---

## 🚀 Cómo activar este protocolo según el agente

| Agente | Cómo se activa |
|--------|---------------|
| **Claude Code** | Automático — esta skill se carga al trabajar en `platinum-center` o `platinum-center-local` |
| **Cursor / Windsurf** | Automático si leen este archivo o `AGENTS.md` en la raíz |
| **Gemini / Antigravity CLI ("Agy")** | Claude pega el **Prompt de Arranque** de abajo dentro de `claude-to-agy.txt` junto con la SPEC, cada vez que delega una tarea nueva |

---

## 📋 Prompt de Arranque para Agy (pegar en `claude-to-agy.txt` junto con la SPEC)

```
Eres el agente ejecutor del proyecto Platinum Center. Vas a implementar la SPEC adjunta bajo un
CERROJO DE EJECUCIÓN ESTRICTO — no es opcional:

1. Solo tienes permiso de escritura sobre los archivos de la Allowlist (Sección 1.1) de la SPEC.
   Todo lo demás es SOLO LECTURA, sin excepción.
2. Si para resolver un error necesitas tocar un archivo fuera de la Allowlist: ABORTA. Responde en
   agy-to-claude.txt con `[BLOCKED: Requiere cambios en <ruta_archivo>]` y espera instrucciones —
   nunca lo corrijas por tu cuenta.
3. Tu primer turno es de SOLO LECTURA: confirma en agy-to-claude.txt que entendiste el diagnóstico
   (Sección 3) y los contratos (Sección 4) de la SPEC, y enumera los archivos exactos que vas a
   tocar y en qué orden (Sección 6). Espera aprobación explícita antes de escribir código.
4. No crees helpers/mocks/utils no solicitados. No refactorices código circundante fuera del diff
   mínimo funcional.
5. Ejecuta UN bloque de la Sección 6 a la vez. Al terminar un bloque: DETENTE, reporta el diff
   completo en agy-to-claude.txt, y espera aprobación explícita antes del siguiente bloque.
6. Los comandos de git commit/push SOLO se ejecutan en el bloque de Cierre, tras aprobación
   explícita después de validación funcional — nunca antes.
7. Antes de reportar "listo": corre `git diff --name-only` y `git status --short`. Si hay un
   archivo fuera de la Allowlist, revierte (`git restore <archivo>`) o elimina (`rm <archivo>` si
   es nuevo) antes de reportar — no lo incluyas en lo que muestras.
8. Nunca toques archivos `.env`, `.env.local`, credenciales ni `cloudflared.exe`.

REGLA DE ORO: Nunca generes, modifiques ni elimines código de producción sin SPEC aprobada.

Confirma que entendiste el protocolo y el contenido de la SPEC, y dime qué archivos vas a tocar
antes de escribir nada.
```

---

## 🛑 LA REGLA DE ORO (The Golden Rule)
> **PROHIBIDO modificar o crear archivos en `frontend/src/`, `backend-cloud/src/` o
> `platinum-center-local/src/` sin antes tener una SPEC aprobada formalmente por el arquitecto en
> `specs/tasks/SPEC-XXX-<slug>.md`.**
> Ninguna línea de código de producción se escribe hasta que el alcance, los contratos y los archivos
> autorizados estén congelados y auditados conjuntamente.

---

## 📋 Protocolo de 4 Fases (sin Jira)

### Fase 1: Redacción y Auditoría de la SPEC (SDD)
1. Asignar el siguiente número correlativo consultando `specs/tasks/TASK_STATUS.md` (el último `SPEC-XXX`
   + 1). Los números **nunca se saltan ni se inventan fuera de secuencia**.
2. Instanciar la plantilla [SPEC_TEMPLATE.md](./resources/SPEC_TEMPLATE.md) en:
   `specs/tasks/SPEC-XXX-<slug-tarea>.md`
3. Completar con rigurosidad las 7 secciones (más el bloque de Cerrojo del encabezado, ya incluido en la
   plantilla):
   * **1. Alcance y Fronteras:** **Allowlist absoluta** de archivos modificables/creables (Sección 1.1) y
     exclusiones explícitas (Sección 1.2). La Allowlist es la única fuente de verdad.
   * **2. Entorno y Dependencias:** Solo librerías existentes en `package.json` / `requirements.txt`.
     Prohibido instalar paquetes sin aval de arquitectura.
   * **3. Diagnóstico y Causa Raíz:** Traza concreta del problema — archivo, línea, por qué falla. Citar
     evidencia real (código leído, logs, respuesta de endpoint) en vez de asumir.
   * **4. Contratos e Interfaces:** Props, DTOs/schemas Pydantic/Zod y firmas de funciones antes y después.
   * **5. Reglas de Negocio y Casos Borde:** Comportamiento detallado — especial cuidado con fechas en
     `America/Bogota (UTC-5)`, estados de membresía, y fallback hacia el Bridge (`pending_commands`).
   * **6. Plan de Ejecución por Bloques:** Bloques pequeños que se detienen a mostrar diff y esperar
     aprobación — nunca un único plan encadenado.
   * **7. Checklist de Salida:** Criterios medibles para aceptar la tarea, incluyendo verificación de
     perímetro de disco.
4. Registrar la tarea en `specs/tasks/TASK_STATUS.md` en estado `🔵 IN PROGRESS`.
5. **Auditoría conjunta:** Claude presenta la SPEC al usuario y solicita aprobación explícita antes de
   codificar o de delegarla a Agy.

---

### Fase 2: Rama Git Aislada
Todo SPEC se trabaja en su propia rama limpia:
```powershell
git checkout -b fix/SPEC-XXX-<slug>   # Para correcciones de bugs
git checkout -b feat/SPEC-XXX-<slug>  # Para nuevas funcionalidades
```

---

### Fase 3: Implementación Guiada (Harness-Driven, por bloques)
Ver Cerrojo de Ejecución Agéntica al inicio de este documento:
1. Ejecutar UN bloque a la vez de la **Sección 6** (Plan de Ejecución) en estricto orden secuencial.
2. Modificar **únicamente** los archivos listados en la Allowlist de la **Sección 1.1**.
3. Si surge ambigüedad o se requiere tocar un archivo fuera de la Allowlist:
   **[BLOCKED] — DETENERSE INMEDIATAMENTE** y solicitar aclaración. No asumir, no corregir por cuenta
   propia.
4. Al terminar cada bloque: mostrar el diff completo y **esperar aprobación explícita** antes de iniciar
   el siguiente bloque.
5. Validar funcionalmente (navegador local `localhost:5173`, `http://localhost:8000/health`, Swagger de
   FastAPI, o el simulador del Bridge en `platinum-center-local` según el caso).

---

### Fase 4: Puerta de Calidad, Commit Atómico y Cierre

> **Regla de estados:** Un commit NO cierra una tarea. El flujo obligatorio es:
> `🔵 IN PROGRESS` → commit → `🟣 IN REVIEW` → validación del arquitecto → `🟢 DONE`
> El agente ejecutor **nunca** marca `🟢 DONE` — ese estado solo lo asigna el arquitecto.

1. **Auditoría de diff:**
   ```powershell
   git status
   git diff --name-only
   ```
   Verificar que el 100% de los archivos modificados pertenezcan a la Allowlist de la SPEC.
2. **Commit Atómico:**
   Formato obligatorio:
   ```powershell
   git add <archivos_autorizados>
   git commit -m "<tipo>(<modulo>): <descripcion breve imperativa> (SPEC-XXX)"
   ```
   *(Ejemplo: `fix(zkteco): normalizar card_no sin ceros iniciales en lookup (SPEC-012)`)*
3. **Actualización de Estado:**
   * Actualizar `specs/tasks/TASK_STATUS.md` a `🟣 IN REVIEW`.
   * Si la tarea toca algo del tracker de fases del proyecto, reflejarlo también en
     `specs/progress.md`.
4. **Push** (solo si el arquitecto lo pide explícitamente):
   ```powershell
   git push origin <nombre-de-rama>
   ```
   El PR lo abre el desarrollador manualmente.
