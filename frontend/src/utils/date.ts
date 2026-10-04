/**
 * Utilidades centralizadas de formato de fechas.
 * Siempre recibe strings ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss) o undefined/null.
 *
 * Estándar visual:
 *   - formatDate        → DD/MM/YYYY              (vigencias, vencimientos)
 *   - formatDateTime    → DD/MM/YYYY HH:mm         (pagos, registros con hora)
 *   - formatDateLong    → 20 de octubre de 2026    (sugerencias, mensajes)
 */

const LOCALE = 'es-CO';

/**
 * Parsea un string ISO a Date evitando el desfase de zona horaria.
 * "2026-10-20" sin hora se interpreta como UTC medianoche, lo que en
 * UTC-5 aparece como "19/10/2026". Añadir T00:00:00 lo fija a local.
 */
export function parseLocal(dateStr: string): Date {
  // Si solo es fecha (YYYY-MM-DD), agregar hora para evitar UTC offset
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00`);
  }
  return new Date(dateStr);
}

/** DD/MM/YYYY — para fechas de inicio, vencimiento, plan */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sin fecha';
  const d = parseLocal(dateStr);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** DD/MM/YYYY HH:mm — para timestamps de pagos y registros */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Sin fecha';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 20 de octubre de 2026 — para mensajes y sugerencias */
export function formatDateLong(dateStr?: string | null): string {
  if (!dateStr) return 'Sin fecha';
  const d = parseLocal(dateStr);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
