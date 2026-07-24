import { useEffect, useState } from 'react';
import styles from './BoldPaymentButton.module.css';

declare global {
  interface Window {
    BoldCheckout: any;
  }
}

interface BoldPaymentButtonProps {
  orderId: string;
  amount: number;
  apiKey: string;
  integritySignature: string;
  planName: string;
  metadata?: Record<string, string>;
}

export function BoldPaymentButton({
  orderId,
  amount,
  apiKey,
  integritySignature,
  planName,
  metadata,
}: BoldPaymentButtonProps) {
  const [checkout, setCheckout] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Check if the script is already added in the document
    const existingScript = document.querySelector(
      'script[src="https://checkout.bold.co/library/boldPaymentButton.js"]'
    );

    const handleScriptLoad = () => {
      setIsScriptLoaded(true);
    };

    const handleScriptError = () => {
      setLoadError(true);
    };

    if (existingScript) {
      if (window.BoldCheckout) {
        setIsScriptLoaded(true);
      } else {
        existingScript.addEventListener('load', handleScriptLoad);
        existingScript.addEventListener('error', handleScriptError);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
      script.async = true;
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.querySelector(
        'script[src="https://checkout.bold.co/library/boldPaymentButton.js"]'
      );
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !window.BoldCheckout) return;

    try {
      // Configure BoldCheckout instance
      const checkoutConfig: any = {
        orderId,
        currency: 'COP',
        amount: amount.toString(),
        apiKey,
        integritySignature,
        description: `Renovación membresía ${planName}`,
      };

      if (metadata) {
        checkoutConfig.metadata = metadata;
        checkoutConfig.customData = metadata;
      }

      const instance = new window.BoldCheckout(checkoutConfig);
      setCheckout(instance);
    } catch (err) {
      console.error('Error al inicializar BoldCheckout:', err);
    }
  }, [isScriptLoaded, orderId, amount, apiKey, integritySignature, planName, metadata]);

  const handlePayClick = () => {
    if (checkout) {
      checkout.open();
    } else {
      console.error('El objeto checkout no está listo aún');
    }
  };

  if (loadError) {
    return (
      <div className={styles['bold-payment-button__error']}>
        Error al cargar la pasarela de pagos.
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles['bold-payment-button__action']}
      onClick={handlePayClick}
      disabled={!checkout}
      aria-label={`Pagar ahora renovación membresía ${planName}`}
    >
      {checkout ? 'Pagar ahora' : 'Cargando pasarela...'}
    </button>
  );
}

export default BoldPaymentButton;
