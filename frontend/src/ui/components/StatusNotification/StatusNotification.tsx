import { useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import styles from './StatusNotification.module.css';

interface StatusNotificationProps {
 status: string;
 onClose: () => void;
}

export function StatusNotification({ status, onClose }: StatusNotificationProps) {
 useEffect(() => {
  const timer = setTimeout(() => {
   onClose();
  }, 5000);

  return () => clearTimeout(timer);
 }, [onClose]);

 let statusClass = '';
 let message = '';

 if (status === 'active') {
  statusClass = styles['status-notification--active'];
  message = '¡Tu membresía está activa! 🎉';
 } else if (status === 'expired') {
  statusClass = styles['status-notification--expired'];
  message = 'Tu membresía ha vencido. Renueva aquí.';
 } else if (status === 'suspended') {
  statusClass = styles['status-notification--suspended'];
  message = 'Tu membresía ha sido suspendida.';
 } else {
  return null;
 }

 return (
  <div
   className={`${styles['status-notification']} ${statusClass}`}
   role="alert"
   aria-live="assertive"
  >
   <div className={styles['status-notification__content']}>
    <p className={styles['status-notification__message']}>{message}</p>
   </div>
   <button
    type="button"
    className={styles['status-notification__close-button']}
    onClick={onClose}
    aria-label="Cerrar notificación"
   >
    <CloseOutlined />
   </button>
  </div>
 );
}
export default StatusNotification;
