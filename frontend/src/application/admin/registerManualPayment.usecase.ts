import { adminRepository, type ManualPaymentData, type ManualPaymentResult } from '../../infrastructure/supabase/admin.repository';
import { store } from '../../infrastructure/store/store';

export async function registerManualPayment(data: ManualPaymentData): Promise<ManualPaymentResult> {
  // 1. Registrar el pago y actualizar la membresía en Supabase
  const payment = await adminRepository.registerManualPayment(data);

  // Si la activación es futura, el backend ya NO activó el chip — no disparar
  // la reactivación aquí tampoco. El cron de activación programada se encarga
  // el día que llegue plan_start_date.
  if (payment.is_future_activation) {
    return payment;
  }

  try {
    // 2. Consultar el miembro para verificar si tiene chip asignado
    const member = await adminRepository.getMemberWithProfile(data.member_id);

    if (member.card_no) {
      // 3. Reactivar chip en inBio Pro a través del backend-cloud
      const state = store.getState();
      const token = state.auth.accessToken;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Llamada asíncrona no bloqueante (disparar y registrar en consola)
      fetch(`${apiUrl}/admin/reactivate-chip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ member_id: data.member_id })
      }).then((res) => {
        if (!res.ok) {
          console.warn('[CHIP] Error al solicitar la reactivación del chip en el torniquete.');
        } else {
          console.log('[CHIP] Solicitud de reactivación de chip enviada exitosamente.');
        }
      }).catch((err) => {
        console.error('[CHIP] Error de red al solicitar reactivación de chip:', err);
      });
    }
  } catch (err) {
    // Registramos el error de chip pero permitimos completar la ejecución del pago manual
    console.error('[CHIP] Error en el flujo de reactivación del chip RFID:', err);
  }

  return payment;
}
