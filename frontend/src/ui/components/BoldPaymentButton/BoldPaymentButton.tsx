import { useEffect, useRef } from 'react';
import styles from './BoldPaymentButton.module.css';

interface BoldPaymentButtonProps {
  orderId: string;
  amount: number;
  apiKey: string;
  integritySignature: string;
  planName: string;
  redirectionUrl?: string;
  metadata?: Record<string, string>;
}

export function BoldPaymentButton({
  orderId,
  amount,
  apiKey,
  integritySignature,
  planName,
  redirectionUrl,
  metadata,
}: BoldPaymentButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous button content to avoid duplicates on re-render
    container.innerHTML = '';

    // Create the Bold payment script tag
    const script = document.createElement('script');
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    script.async = true;

    // Set standard and required data attributes
    script.setAttribute('data-bold-button', 'true');
    script.setAttribute('data-order-id', orderId);
    script.setAttribute('data-currency', 'COP');
    script.setAttribute('data-amount', amount.toString());
    script.setAttribute('data-api-key', apiKey);
    script.setAttribute('data-integrity-signature', integritySignature);
    script.setAttribute('data-description', `Renovación membresía ${planName}`);

    if (redirectionUrl) {
      script.setAttribute('data-redirection-url', redirectionUrl);
    }

    // If metadata is provided, serialize and set it as data-metadata
    if (metadata) {
      script.setAttribute('data-metadata', JSON.stringify(metadata));
    }

    // Append script to container to trigger rendering by Bold
    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [orderId, amount, apiKey, integritySignature, planName, redirectionUrl, metadata]);

  return (
    <div
      ref={containerRef}
      className={styles['bold-payment-button']}
      aria-label={`Botón de pago de Bold para el plan ${planName}`}
    />
  );
}

export default BoldPaymentButton;
