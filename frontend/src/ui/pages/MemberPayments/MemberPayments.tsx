import { useEffect, useState } from 'react';
import { useAppSelector } from '../../../infrastructure/store/store';
import { getMemberPayments } from '../../../application/member/getMemberPayments.usecase';
import type { Payment } from '../../../domain/member/member.types';
import styles from './MemberPayments.module.css';

export function MemberPayments() {
  const { profile } = useAppSelector((state) => state.auth);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    setIsLoading(true);
    setError(null);
    getMemberPayments(profile.id)
      .then((res) => {
        setPayments(res);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error al obtener el historial de pagos';
        setError(message);
        setIsLoading(false);
      });
  }, [profile]);

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const planNames: Record<string, string> = {
    '1_day': 'Plan 1 Día',
    '15_days': 'Plan 15 Días Consumibles',
    '1_month': 'Plan 1 Mes',
    '1_year': 'Plan 1 Año',
  };

  const methodNames: Record<string, string> = {
    'cash': 'Efectivo',
    'nequi': 'Nequi',
    'daviplata': 'DaviPlata',
    'bold': 'Bold (Online)',
    'other': 'Otro',
  };

  const statusLabels: Record<string, string> = {
    'confirmed': 'Confirmado',
    'pending': 'Pendiente',
    'failed': 'Fallido',
  };

  const statusClasses: Record<string, string> = {
    'confirmed': styles['member-payments__badge--confirmed'],
    'pending': styles['member-payments__badge--pending'],
    'failed': styles['member-payments__badge--failed'],
  };

  if (isLoading) {
    return (
      <div className={styles['member-payments__loading']} role="status" aria-live="polite">
        Cargando historial de pagos...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['member-payments__error']} role="alert">
        <p className={styles['member-payments__error-message']}>{error}</p>
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className={styles['member-payments__empty']}>
        <h2>Sin pagos registrados</h2>
        <p>No tienes ningún historial de pagos registrado en el sistema.</p>
      </div>
    );
  }

  return (
    <div className={styles['member-payments']} role="main">
      <header className={styles['member-payments__header']}>
        <h1 className={styles['member-payments__title']}>Historial de Pagos</h1>
        <p className={styles['member-payments__subtitle']}>Consulta todos tus pagos y suscripciones</p>
      </header>

      <div className={styles['member-payments__list']}>
        {payments.map((payment) => {
          const statusVal = payment.status || 'pending';
          const planVal = payment.plan || 'other';
          const methodVal = payment.method || 'other';

          return (
            <div key={payment.id} className={styles['member-payments__card']}>
              <div className={styles['member-payments__card-header']}>
                <div>
                  <h3 className={styles['member-payments__plan']}>
                    {planNames[planVal] || planVal}
                  </h3>
                  <span className={styles['member-payments__amount']}>
                    {formatCOP(payment.amount)}
                  </span>
                </div>
                <span className={`${styles['member-payments__badge']} ${statusClasses[statusVal] || ''}`}>
                  {statusLabels[statusVal] || statusVal}
                </span>
              </div>

              <div className={styles['member-payments__divider']} />

              <div className={styles['member-payments__details']}>
                <div className={styles['member-payments__detail-item']}>
                  <span className={styles['member-payments__detail-label']}>Fecha de Pago</span>
                  <span className={styles['member-payments__detail-value']}>
                    {formatDate(payment.payment_date)}
                  </span>
                </div>
                <div className={styles['member-payments__detail-item']}>
                  <span className={styles['member-payments__detail-label']}>Método</span>
                  <span className={styles['member-payments__detail-value']}>
                    {methodNames[methodVal] || methodVal}
                  </span>
                </div>
                {payment.transaction_id && (
                  <div className={styles['member-payments__detail-item']}>
                    <span className={styles['member-payments__detail-label']}>ID Transacción</span>
                    <span className={styles['member-payments__detail-value']}>
                      {payment.transaction_id}
                    </span>
                  </div>
                )}
                {(payment.plan_start_date || payment.plan_end_date) && (
                  <div className={styles['member-payments__detail-item']}>
                    <span className={styles['member-payments__detail-label']}>Vigencia</span>
                    <span className={styles['member-payments__detail-value']}>
                      {payment.plan_start_date || 'N/A'} al {payment.plan_end_date || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default MemberPayments;
