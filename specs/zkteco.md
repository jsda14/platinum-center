# ZKTeco — Integración Push SDK (Protocolo iClock/ADMS)

## Hardware
- Dispositivo: **inBio Pro** (4 lectores/puertas)
- Conexión: LAN (cable Ethernet, IP fija dentro del gym)
- Identificación de miembros: **tarjeta RFID** (no huella dactilar)
- Software ZKTeco instalado en el PC del gym: ZKAccess o BioTime

## Arquitectura de comunicación

```
Miembro pasa tarjeta
        ↓
Lector físico → inBio Pro (decisión: granted o denied)
        ↓
inBio Pro hace POST → FastAPI local (evento de acceso)
        ↓
FastAPI local → Railway (evento limpio)
        ↓
Railway → Supabase (access_logs)

--- flujo inverso (membresía vence o se activa) ---

Supabase pg_cron detecta cambio de status
        ↓
Webhook → Railway → Cloudflare Tunnel URL
        ↓
FastAPI local encola comando
        ↓
inBio Pro hace GET /iclock/getrequest → recibe comando
        ↓
inBio Pro ejecuta (activa o revoca tarjeta)
        ↓
inBio Pro confirma → POST /iclock/devicecmd
```

> ⚠️ El inBio Pro es el **cliente HTTP** — él inicia las peticiones.
> Tu FastAPI local NO empuja comandos directamente; los encola y espera que el panel los recoja.

---

## Endpoints del FastAPI local (Repo: `platinum-center-local`)

### GET `/iclock/cdata` — Inicialización
El panel se conecta al arrancar o reconectarse. Responde configuración en **texto plano** (no JSON).

```
Respuesta esperada:
RegistryCode=1
ServerVersion=2.4.1
ServerName=FastAPILocalBridge
PushVersion=2.0.2
Registry=1
```

---

### POST `/iclock/cdata` — Eventos de acceso
El panel envía lecturas de tarjetas en lote. Payload en **texto plano**.

```
Formato de cada línea:
USERID=99 CardNo=1234567890 Time=2026-07-18 17:15:00 State=0 Verify=1
```

Lógica:
1. Parsear línea por línea con regex (no JSON)
2. Extraer `CardNo` y `Time`
3. Para plan `15_days`: verificar `days_used < days_total` en `member_day_passes`
4. Enviar evento limpio a Railway en background task
5. Responder `OK` para que el panel limpie su memoria interna

---

### GET `/iclock/getrequest` — Cola de comandos
El panel hace polling cada pocos segundos preguntando si hay órdenes.

```
Si hay comando en cola:
C:101:DATA UPDATE USERINFO PIN=99\tName=Juan\tCardNo=1234567890\tPri=0

Si no hay nada:
OK
```

---

### POST `/iclock/devicecmd` — Confirmación de ejecución
El panel confirma si ejecutó el comando exitosamente.

```
Payload: Return=0  (0 = éxito, otro = error)
```

Lógica: eliminar el comando confirmado de la cola y registrar en log local.

---

## Casos de negocio → comandos ZKTeco

| Status del miembro | Comando enviado al panel |
|---|---|
| `active` (nuevo o renovado) | `DATA UPDATE USERINFO PIN={id}\tName={name}\tCardNo={card_no}\tPri=0` |
| `expired` / `suspended` | `DATA UPDATE USERINFO PIN={id}\tName={name}\tCardNo=0\tPri=0` |
| `exhausted` (15_days agotados) | `DATA UPDATE USERINFO PIN={id}\tName={name}\tCardNo=0\tPri=0` |
| Tarjeta desconocida | Sin comando — el panel rechaza nativamente, solo se loguea en `access_logs` |

> ⚠️ `CardNo=0` revoca el acceso sin borrar al usuario. El historial queda intacto.

---

## Lógica especial — plan `15_days`

Al recibir un evento `granted` para un miembro con plan `15_days`:

```
Verificar member_day_passes:
  ¿days_used < days_total? Y ¿NOW() < valid_until?
        ↓ SÍ
  Registrar entrada en access_logs
  Incrementar days_used + 1
        ↓
  ¿days_used == days_total?
        ↓ SÍ
  status = 'exhausted'
  Encolar comando CardNo=0 → inBio Pro
        ↓ NO
  Acceso permitido, sin cambios
```

---

## Cola de comandos

- **MVP:** lista en memoria (`COMMAND_QUEUE = []`)
- **Producción:** persistir en SQLite local para sobrevivir reinicios del PC

---

## Variables de entorno requeridas (`.env` en el PC del gym)

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxx
RAILWAY_URL=https://tu-api-railway.app
INBIO_IP=192.168.x.x        # IP local del inBio Pro en la red del gym
TUNNEL_SECRET=xxxx           # para autenticar llamadas entrantes de Railway
```

---

## Cloudflare Tunnel

- Herramienta: `cloudflared`
- Expone `http://localhost:8000` del PC del gym con una URL pública fija
- Sin necesidad de IP pública ni apertura de puertos en el router
- Costo: **$0** (plan gratuito de Cloudflare)
- En producción: instalar como servicio de Windows para arranque automático

```bash
cloudflared service install
```

---

## Checklist visita presencial al gym (Fase 4)

### Antes de salir de casa
- [ ] Repo `platinum-center-local` corriendo sin errores en tu PC
- [ ] `cloudflared.exe` descargado para Windows
- [ ] Script `.bat` de instalación listo
- [ ] URL de Railway anotada
- [ ] USB con: repo, cloudflared.exe, Python installer

### En el PC del gym
- [ ] Identificar IP del inBio Pro en el software ZKTeco
- [ ] Verificar Python instalado (`python --version`)
- [ ] Copiar repo y crear `.env` con credenciales reales
- [ ] Correr FastAPI: `uvicorn main:app --host 0.0.0.0 --port 8000`
- [ ] Verificar `/docs` en el navegador del gym
- [ ] Instalar y correr cloudflared → anotar URL pública generada
- [ ] Actualizar `GYM_TUNNEL_URL` en Railway
- [ ] Configurar URL del servidor Push en software ZKTeco del gym
- [ ] Verificar primera conexión: `GET /iclock/cdata` en los logs
- [ ] Exportar lista de miembros (PIN + CardNo) y mapear en Supabase
- [ ] Prueba real con tarjeta física
- [ ] Probar activación y revocación con `/mock/webhook-supabase`
- [ ] Instalar cloudflared como servicio Windows
- [ ] Configurar FastAPI para arranque automático (NSSM o tarea programada)
- [ ] Reiniciar PC y verificar que todo vuelve solo

### Antes de salir
- [ ] Todo corre sin intervención manual
- [ ] Sevastián sabe que el PC no se debe apagar mientras el gym opere
- [ ] SN del inBio Pro anotado
- [ ] Mapeo de IDs guardado en Supabase
