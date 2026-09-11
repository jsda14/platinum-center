import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { updateMemberStatus } from '@/infrastructure/store/memberSlice';
import { useMemberStatusRealtime } from '../../../ui/hooks/useMemberStatusRealtime';
import { StatusNotification } from '../../../ui/components/StatusNotification/StatusNotification';
import { WifiOutlined, WarningOutlined } from '@ant-design/icons';
import { Tooltip, Button } from 'antd';
import styles from './MemberPortal.module.css';

export function MemberPortal() {
  const { profile } = useAppSelector((state) => state.auth);
  const { member, dayPass, isLoading, error } = useAppSelector((state) => state.member);
  const dispatch = useAppDispatch();
  const [toastStatus, setToastStatus] = useState<string | null>(null);

  const handleStatusChange = useCallback((newStatus: string) => {
    dispatch(updateMemberStatus(newStatus));
    setToastStatus(newStatus);
  }, [dispatch]);

  useMemberStatusRealtime(member?.id, handleStatusChange);

  const daysRemaining = useMemo(() => {
    if (!member?.end_date) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(member.end_date);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [member?.end_date]);

  if (isLoading) {
    return (
      <div className={styles['member-portal__loading']} role="status" aria-live="polite">
        Cargando portal...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['member-portal__error']} role="alert">
        <p className={styles['member-portal__error-message']}>{error}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className={styles['member-portal']} role="main">
        <header className={styles['member-portal__header']}>
          <h1 className={styles['member-portal__welcome']}>
            Hola, <span className="text-accent">{profile?.full_name}</span>
          </h1>
          <p className={styles['member-portal__subtitle']}>Estado de tu cuenta</p>
        </header>
        <div className={styles['member-portal__empty']}>
          <h2>Sin membresía activa</h2>
          <p>Aún no tienes una membresía activa. Ve a Adquirir para comenzar.</p>
        </div>
      </div>
    );
  }

  const is15Days = member.plan === '15_days';

  // Determine status color class and label
  let statusClass = styles['member-portal__badge--expired'];
  let statusLabel = 'Expirado';

  if (member.status === 'active') {
    if (daysRemaining > 5) {
      statusClass = styles['member-portal__badge--active'];
      statusLabel = 'Activo';
    } else {
      statusClass = styles['member-portal__badge--warning'];
      statusLabel = 'Próximo a vencer';
    }
  } else if (member.status === 'suspended') {
    statusClass = styles['member-portal__badge--expired'];
    statusLabel = 'Suspendido';
  }

  // Format plan names for display
  const planNames: Record<string, string> = {
    '1_day': '1 Día',
    '15_days': '15 Días Consumibles',
    '1_month': '1 Mes',
    '1_year': '1 Año',
  };
  const planDisplay = member.plan ? (planNames[member.plan] || member.plan) : 'Sin Plan';

  // Calculate dayPass progress values
  const daysUsed = dayPass?.days_used || 0;
  const daysTotal = dayPass?.days_total || 15;

  return (
    <div className={styles['member-portal']} role="main">
      <header className={styles['member-portal__header']}>
        <h1 className={styles['member-portal__welcome']}>
          Hola, <span className="text-accent">{profile?.full_name}</span>
        </h1>
        <p className={styles['member-portal__subtitle']}>Estado de tu cuenta</p>
      </header>

      <section className={styles['member-portal__card']} aria-labelledby="membership-title">
        <h2 id="membership-title" className="sr-only">Detalles de tu Membresía</h2>
        <div className={styles['member-portal__status-section']}>
          <span className={`${styles['member-portal__badge']} ${statusClass}`}>
            {statusLabel}
          </span>
          <div className={styles['member-portal__plan-name']}>{planDisplay}</div>
        </div>

        <div className={styles['member-portal__divider']} />

        <div className={styles['member-portal__info-grid']}>
          <div className={styles['member-portal__info-item']}>
            <span className={styles['member-portal__info-label']}>Fecha de Inicio</span>
            <span className={styles['member-portal__info-value']}>{member.start_date || 'N/A'}</span>
          </div>
          <div className={styles['member-portal__info-item']}>
            <span className={styles['member-portal__info-label']}>Fecha de Vencimiento</span>
            <span className={styles['member-portal__info-value']}>{member.end_date || 'N/A'}</span>
          </div>
        </div>

        <div className={styles['member-portal__divider']} />

        <div className={styles['member-portal__metrics']}>
          {is15Days ? (
            <div className={styles['member-portal__daypass']}>
              <div className={styles['member-portal__daypass-header']}>
                <span className={styles['member-portal__daypass-label']}>Días Consumidos</span>
                <span className={styles['member-portal__daypass-counter']}>
                  <strong>{daysUsed}</strong> de {daysTotal}
                </span>
              </div>
              <progress
                value={daysUsed}
                max={daysTotal}
                className={styles['member-portal__progress']}
                aria-label={`Días consumidos: ${daysUsed} de ${daysTotal}`}
              />
              <p className={styles['member-portal__daypass-hint']}>
                Tienes hasta el {member.end_date || 'N/A'} para consumir tus días restantes.
              </p>
            </div>
          ) : (
            <div className={styles['member-portal__countdown']}>
              <span className={styles['member-portal__countdown-number']}>{daysRemaining}</span>
              <span className={styles['member-portal__countdown-label']}>
                {daysRemaining === 1 ? 'Día restante' : 'Días restantes'}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className={`${styles['member-portal__chip-card']} ${member.card_no ? styles['member-portal__chip-card--has-chip'] : styles['member-portal__chip-card--no-chip']}`}>
        {member.card_no ? (
          <>
            <div className={styles['member-portal__chip-header']}>
              <div className={styles['member-portal__chip-badge-wrapper']}>
                <span className={`${styles['member-portal__chip-badge']} ${styles['member-portal__chip-badge--active']}`}>
                  <WifiOutlined className={styles['member-portal__chip-icon']} /> Chip activo
                </span>
              </div>
              <span className={styles['member-portal__chip-no']}>N.° #{member.card_no}</span>
            </div>
            <p className={styles['member-portal__chip-description']}>
              Tu acceso al gym está habilitado
            </p>
          </>
        ) : (
          <>
            <div className={styles['member-portal__chip-header']}>
              <div className={styles['member-portal__chip-badge-wrapper']}>
                <span className={`${styles['member-portal__chip-badge']} ${styles['member-portal__chip-badge--warning']}`}>
                  <WarningOutlined className={styles['member-portal__chip-icon']} /> Sin chip registrado
                </span>
              </div>
              <Tooltip title="El chip es la tarjeta física que te permite entrar al gym mediante el torniquete automático.">
                <Button type="link" size="small" className={styles['member-portal__chip-help-btn']}>
                  ¿Qué es esto?
                </Button>
              </Tooltip>
            </div>
            <p className={styles['member-portal__chip-description']}>
              Visita recepción para activar tu acceso físico
            </p>
          </>
        )}
      </section>

      {toastStatus && (
        <StatusNotification
          status={toastStatus}
          onClose={() => setToastStatus(null)}
        />
      )}
    </div>
  );
}

export default MemberPortal;
