import { useGymStatus } from '@/ui/hooks/useGymStatus';
import styles from './GymStatus.module.css';

interface GymStatusProps {
  className?: string;
}

function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours24 = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours24)) return timeStr;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

export function GymStatus({ className = '' }: GymStatusProps) {
  const { status, isLoading, error } = useGymStatus();

  if (isLoading || error || !status) {
    return null;
  }

  let variant: 'open' | 'closing-soon' | 'closed' = 'closed';
  let label = '';

  if (status.is_open) {
    const mins = status.minutes_to_close;
    if (mins !== null && mins !== undefined && mins <= 120) {
      variant = 'closing-soon';
      if (mins < 60) {
        label = `Cerramos en ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
      } else {
        const hours = Math.floor(mins / 60);
        const rem = mins % 60;
        if (rem === 0) {
          label = `Cerramos en ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        } else {
          label = `Cerramos en ${hours}h ${rem}m`;
        }
      }
    } else {
      variant = 'open';
      const closeTime12h = formatTime12h(status.closes_at);
      label = closeTime12h ? `Abierto hasta las ${closeTime12h}` : 'Abierto';
    }
  } else {
    variant = 'closed';
    if (status.next_open_message) {
      label = status.next_open_message;
    } else if (status.next_open?.text) {
      label = status.next_open.text;
    } else if (status.opens_at) {
      label = `Abrimos a las ${formatTime12h(status.opens_at)}`;
    } else {
      label = status.message || 'Hoy cerramos';
    }
  }

  const variantClass =
    variant === 'open'
      ? styles['gym-status--open']
      : variant === 'closing-soon'
      ? styles['gym-status--closing-soon']
      : styles['gym-status--closed'];

  return (
    <div
      className={`${styles['gym-status']} ${variantClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className={styles['gym-status__dot']} aria-hidden="true" />
      <span className={styles['gym-status__text']}>{label}</span>
    </div>
  );
}

export default GymStatus;
