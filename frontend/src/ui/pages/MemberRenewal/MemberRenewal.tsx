import { useEffect, useState } from 'react';
import { useAppSelector } from '../../../infrastructure/store/store';
import { getActivePlans } from '../../../application/member/getActivePlans.usecase';
import { getMemberStatus } from '../../../application/member/getMemberStatus.usecase';
import type { Plan } from '../../../domain/member/member.types';
import { BoldPaymentButton } from '../../components/BoldPaymentButton/BoldPaymentButton';
import { CheckCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import styles from './MemberRenewal.module.css';

export function MemberRenewal() {
  const { profile } = useAppSelector((state) => state.auth);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // States for Bold payment
  const [orderId, setOrderId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch active plans from Supabase
        const activePlans = await getActivePlans();
        setPlans(activePlans);

        // Fetch current member details via the application use case to get the member ID
        const statusResult = await getMemberStatus(profile.id);
        setMemberId(statusResult.member.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar los planes disponibles';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [profile]);

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan);
    setOrderId(null);
    setSignature(null);
    setIsGeneratingSignature(true);
    setError(null);

    try {
      // 1. Generate unique order ID
      const newOrderId = window.crypto && window.crypto.randomUUID 
        ? window.crypto.randomUUID() 
        : `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setOrderId(newOrderId);

      // 2. Plan price in COP pesos (e.g. 60000)
      const amountInPesos = Math.round(plan.price);

      // 3. Request signature from the backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/bold/integrity-signature?order_id=${newOrderId}&amount=${amountInPesos}&currency=COP`
      );

      if (!response.ok) {
        throw new Error('No se pudo generar la firma de seguridad en el servidor');
      }

      const data = await response.json();
      setSignature(data.signature);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar el intento de pago';
      setError(msg);
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Predefined premium benefits based on plan type slug
  const getPlanBenefits = (slug: string): string[] => {
    switch (slug) {
      case '1_day':
        return [
          'Acceso ilimitado por 24 horas',
          'Uso de zonas de fuerza y cardio',
          'Sin costos de inscripción',
          'Casillero de día gratuito'
        ];
      case '15_days':
        return [
          '15 días de acceso consumibles',
          'Válido por 30 días calendario',
          'Uso de zonas de fuerza y cardio',
          'Ideal para viajeros o rutinas flexibles',
          'Casillero de día gratuito'
        ];
      case '1_month':
        return [
          'Acceso ilimitado por 30 días',
          'Uso de todas las zonas del gym',
          'Clases grupales incluidas',
          'Valoración física inicial',
          'Casillero de día gratuito'
        ];
      case '1_year':
        return [
          'Acceso ilimitado por 365 días',
          'El mejor precio del mercado',
          'Uso de todas las zonas del gym',
          'Clases grupales ilimitadas',
          '2 Valoraciones físicas al año',
          '1 Invitación gratis al mes'
        ];
      default:
        return [
          'Uso de todas las instalaciones del gimnasio',
          'Acceso ilimitado durante la vigencia del plan'
        ];
    }
  };

  if (isLoading) {
    return (
      <div className={styles['member-renewal__loading']} role="status" aria-live="polite">
        Cargando planes disponibles...
      </div>
    );
  }

  if (error && !selectedPlan) {
    return (
      <div className={styles['member-renewal__error']} role="alert">
        <p className={styles['member-renewal__error-message']}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles['member-renewal']} role="main">
      <header className={styles['member-renewal__header']}>
        <h1 className={styles['member-renewal__title']}>Renueva tu Membresía</h1>
        <p className={styles['member-renewal__subtitle']}>
          Selecciona el plan que mejor se adapte a tus objetivos y continúa entrenando en Platinum Center.
        </p>
      </header>

      <div className={styles['member-renewal__grid']}>
        {plans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          const benefits = getPlanBenefits(plan.slug);

          return (
            <article
              key={plan.id}
              className={`${styles['member-renewal__card']} ${
                isSelected ? styles['member-renewal__card--selected'] : ''
              }`}
            >
              <div className={styles['member-renewal__card-header']}>
                <h3 className={styles['member-renewal__plan-name']}>{plan.name}</h3>
                <div className={styles['member-renewal__price-container']}>
                  <span className={styles['member-renewal__price']}>
                    {formatCOP(plan.price)}
                  </span>
                </div>
              </div>

              <div className={styles['member-renewal__divider']} />

              <ul className={styles['member-renewal__benefits']}>
                {benefits.map((benefit, index) => (
                  <li key={index} className={styles['member-renewal__benefit-item']}>
                    <CheckCircleOutlined className={styles['member-renewal__benefit-icon']} />
                    <span className={styles['member-renewal__benefit-text']}>{benefit}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`${styles['member-renewal__select-button']} ${
                  isSelected ? styles['member-renewal__select-button--selected'] : ''
                }`}
                onClick={() => handleSelectPlan(plan)}
                aria-label={`Seleccionar plan ${plan.name}`}
              >
                {isSelected ? 'Plan Seleccionado' : 'Seleccionar Plan'}
              </button>
            </article>
          );
        })}
      </div>

      {selectedPlan && (
        <section
          className={styles['member-renewal__checkout']}
          aria-labelledby="checkout-summary-title"
        >
          <div className={styles['member-renewal__checkout-box']}>
            <h2 id="checkout-summary-title" className={styles['member-renewal__checkout-title']}>
              Resumen de Compra
            </h2>
            <div className={styles['member-renewal__checkout-row']}>
              <span className={styles['member-renewal__checkout-label']}>Plan a adquirir:</span>
              <span className={styles['member-renewal__checkout-val']}>
                {selectedPlan.name}
              </span>
            </div>
            <div className={styles['member-renewal__checkout-row']}>
              <span className={styles['member-renewal__checkout-label']}>Total a pagar:</span>
              <span className={styles['member-renewal__checkout-price']}>
                {formatCOP(selectedPlan.price)}
              </span>
            </div>

            <div className={styles['member-renewal__divider']} />

            <div className={styles['member-renewal__security']}>
              <SafetyOutlined className={styles['member-renewal__security-icon']} />
              <span className={styles['member-renewal__security-text']}>
                Pago seguro procesado por Bold. Acepta PSE, tarjetas de crédito, Nequi y DaviPlata.
              </span>
            </div>

            {isGeneratingSignature && (
              <div className={styles['member-renewal__loading-signature']}>
                Generando transacción segura...
              </div>
            )}

            {error && (
              <div className={styles['member-renewal__checkout-error']} role="alert">
                {error}
              </div>
            )}

            {signature && orderId && memberId && (
              <div className={styles['member-renewal__payment-button-wrapper']}>
                <BoldPaymentButton
                  orderId={orderId}
                  amount={Math.round(selectedPlan.price)}
                  apiKey={import.meta.env.VITE_BOLD_API_KEY}
                  integritySignature={signature}
                  metadata={{
                    member_id: memberId,
                    plan: selectedPlan.slug,
                  }}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default MemberRenewal;
