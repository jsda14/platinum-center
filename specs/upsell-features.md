# Funcionalidades Upsell — Platinum Center

## Concepto
Funcionalidades que existen en el sistema pero están visualmente 
bloqueadas para el cliente. Se muestran como "Próximamente" con 
una descripción atractiva que genera expectativa.

El objetivo es que Sevastián vea el potencial y quiera contratar 
el upgrade. No se usa lenguaje de venta agresivo — solo se muestra 
lo que viene.

## Filosofía de implementación
- El componente existe y está construido
- Se envuelve en un <LockedFeature> wrapper
- Muestra overlay con mensaje "Próximamente"
- Botón discreto: "Quiero saber más" → WhatsApp o email de contacto
- NO dice "paga más" — dice "próximamente disponible"

## Componente LockedFeature (por crear)
```tsx
interface LockedFeatureProps {
  title: string
  description: string
  children: ReactNode
}
// Renderiza children con overlay oscuro encima
// Card con título, descripción y botón de contacto
```

## Funcionalidades a bloquear

### 1. Personalización de colores y tema
**Ubicación:** /admin/settings → Tab "Apariencia"
**Estado:** Placeholder ya existe
**Mensaje:** "Personaliza los colores del portal, el logo en emails 
y el tema visual para alinearlo con tu marca."
**Valor:** Alta — diferenciador visual

### 2. Notificaciones por WhatsApp
**Ubicación:** /admin/settings → Tab "Notificaciones"  
**Estado:** Por crear
**Mensaje:** "Envía recordatorios de vencimiento y confirmaciones 
de pago directamente al WhatsApp de tus miembros."
**Valor:** Alto — canal preferido en Colombia

### 3. Programar comunicados
**Ubicación:** /admin/communications
**Estado:** Por agregar al formulario existente
**Mensaje:** "Programa tus comunicados para que se envíen 
automáticamente en la fecha y hora que elijas."
**Valor:** Medio

### 4. Exportar reportes PDF/Excel
**Ubicación:** /admin → Dashboard
**Estado:** Por crear botón
**Mensaje:** "Descarga reportes mensuales de ingresos, miembros 
activos y pagos en PDF o Excel."
**Valor:** Alto — Sevastián querrá esto para contabilidad

### 5. Reserva de clases grupales
**Ubicación:** Portal del miembro + Panel admin
**Estado:** No existe aún
**Mensaje:** "Tus miembros podrán reservar cupo en clases grupales, 
ver el horario semanal y recibir recordatorios automáticos."
**Valor:** Muy alto — requiere desarrollo significativo

### 6. Seguimiento de progreso físico
**Ubicación:** Portal del miembro
**Estado:** No existe aún
**Mensaje:** "Registro de peso, medidas y evolución física. 
Tus miembros podrán ver su progreso mes a mes."
**Valor:** Alto — retención de miembros

### 7. App móvil nativa
**Ubicación:** Banner en el portal del miembro
**Estado:** No existe
**Mensaje:** "Accede a tu membresía desde una app nativa 
para iOS y Android."
**Valor:** Muy alto — requiere desarrollo significativo

### 8. Membresías grupales con precios por volumen
**Ubicación:** /portal/group (por crear en Fase 5)
**Estado:** Diseñado en specs/group-memberships.md
**Mensaje:** "Trae a tus amigos y pagan menos todos. 
Precios especiales para grupos de 2 o más personas."
**Valor:** Alto — ya contemplado en el negocio

## Orden de implementación sugerido
1. Componente LockedFeature (base para todo)
2. Exportar reportes — alto impacto, relativamente simple
3. WhatsApp — requiere contratar API de WhatsApp Business
4. Personalización de colores — impacto visual inmediato
5. Programar comunicados — mejora lo que ya existe
6. Clases grupales — desarrollo mayor
7. App móvil — proyecto separado

## Contacto para upgrades
Por definir con Sevastián:
- WhatsApp del desarrollador
- Email de contacto
- Formulario de interés

## Fase de implementación
Esta fase es interna — se implementa gradualmente 
después de la Fase 6 (QA + Deploy + Capacitación).
No tiene fecha fija — depende del interés de Sevastián.
