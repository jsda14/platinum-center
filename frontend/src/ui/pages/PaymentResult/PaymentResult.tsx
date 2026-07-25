import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleFilled, CloseCircleFilled, ClockCircleFilled } from '@ant-design/icons';
import platinumLogo from '../../../assets/platinum-center-logo.png';
import styles from './PaymentResult.module.css';

type OrderStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'FAILED';

interface StatusConfig {
  cardClass: string;
  iconContainerClass: string;
  icon: React.ReactNode;
  title: string;
  message: string;
  buttonText: string;
  buttonPath: string;
  buttonClass: string;
}

export function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawStatus = searchParams.get('bold-order-status') || 
                    searchParams.get('bold-tx-status') || '';
  const status = rawStatus.toUpperCase() as OrderStatus;
  const orderId = searchParams.get('bold-order-id') || '';

  const configMap: Record<OrderStatus, StatusConfig> = {
    APPROVED: {
      cardClass: styles['payment-result__card--approved'],
      iconContainerClass: styles['payment-result__icon-container--approved'],
      icon: <CheckCircleFilled className={styles['payment-result__icon']} />,
      title: '¡PAGO EXITOSO!',
      message: 'Tu membresía ha sido activada',
      buttonText: 'Ver mi membresía',
      buttonPath: '/portal',
      buttonClass: styles['payment-result__action--approved'],
    },
    REJECTED: {
      cardClass: styles['payment-result__card--rejected'],
      iconContainerClass: styles['payment-result__icon-container--rejected'],
      icon: <CloseCircleFilled className={styles['payment-result__icon']} />,
      title: 'PAGO RECHAZADO',
      message: 'No pudimos procesar tu pago. Intenta de nuevo.',
      buttonText: 'Reintentar',
      buttonPath: '/portal/renewal',
      buttonClass: styles['payment-result__action--rejected'],
    },
    PENDING: {
      cardClass: styles['payment-result__card--pending'],
      iconContainerClass: styles['payment-result__icon-container--pending'],
      icon: <ClockCircleFilled className={styles['payment-result__icon']} />,
      title: 'PAGO EN PROCESO',
      message: 'Tu pago está siendo verificado. Te notificaremos pronto.',
      buttonText: 'Ver mi membresía',
      buttonPath: '/portal',
      buttonClass: styles['payment-result__action--pending'],
    },
    FAILED: {
      cardClass: styles['payment-result__card--rejected'],
      iconContainerClass: styles['payment-result__icon-container--rejected'],
      icon: <CloseCircleFilled className={styles['payment-result__icon']} />,
      title: 'PAGO FALLIDO',
      message: 'No pudimos procesar tu pago. Intenta de nuevo.',
      buttonText: 'Reintentar',
      buttonPath: '/portal/renewal',
      buttonClass: styles['payment-result__action--rejected'],
    },
  };

  const currentConfig = configMap[status] || {
    cardClass: '',
    iconContainerClass: '',
    icon: <CloseCircleFilled className={styles['payment-result__icon']} />,
    title: 'ESTADO DESCONOCIDO',
    message: 'No pudimos determinar el estado de tu pago. Por favor, verifica tu portal.',
    buttonText: 'Ir al Portal',
    buttonPath: '/portal',
    buttonClass: '',
  };

  const handleButtonClick = () => {
    navigate(currentConfig.buttonPath);
  };

  return (
    <div className={styles['payment-result']} role="main">
      <div className={styles['payment-result__container']}>
        <img 
          src={platinumLogo} 
          alt="Platinum Center Logo" 
          className={styles['payment-result__logo']}
        />

        <div
          className={`${styles['payment-result__card']} ${currentConfig.cardClass}`}
          aria-labelledby="payment-result-title"
        >
          <div className={`${styles['payment-result__icon-container']} ${currentConfig.iconContainerClass}`}>
            {currentConfig.icon}
          </div>
          <h1 id="payment-result-title" className={styles['payment-result__title']}>
            {currentConfig.title}
          </h1>
          <p className={styles['payment-result__message']}>{currentConfig.message}</p>

          {orderId && (
            <div className={styles['payment-result__details']}>
              <span className={styles['payment-result__details-label']}>ID de Transacción</span>
              <span className={styles['payment-result__details-value']}>{orderId}</span>
            </div>
          )}

          <button
            type="button"
            className={`${styles['payment-result__action']} ${currentConfig.buttonClass}`}
            onClick={handleButtonClick}
            aria-label={currentConfig.buttonText}
          >
            {currentConfig.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentResult;
