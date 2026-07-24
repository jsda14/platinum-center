import { useEffect, useRef } from 'react';
import styles from './BoldPaymentButton.module.css';

interface BoldPaymentButtonProps {
  orderId: string;
  amount: number; // in cents
  apiKey: string;
  integritySignature: string;
  metadata?: Record<string, string>;
}

export function BoldPaymentButton({
  orderId,
  amount,
  apiKey,
  integritySignature,
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
  }, [orderId, amount, apiKey, integritySignature, metadata]);

  return (
    <div
      ref={containerRef}
      className={styles['bold-payment-button']}
      aria-label="Contenedor del botón de pago de Bold"
    />
  );
}

export default BoldPaymentButton;
