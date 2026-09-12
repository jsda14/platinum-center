import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/infrastructure/store/store';
import { setMember } from '@/infrastructure/store/memberSlice';
import { getActivePlans } from '@/application/member/getActivePlans.usecase';
import { memberRepository } from '@/infrastructure/supabase/member.repository';
import type { Plan, GroupPricing, MemberGroup } from '@/domain/member/member.types';
import {
  getGroupPricingBounds,
  calculateGroupPricingSummary
} from '@/domain/member/groupPricing.utils';
import { BoldPaymentButton } from '../../components/BoldPaymentButton/BoldPaymentButton';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import {
  CheckCircleOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserOutlined,
  DeleteOutlined,
  PlusOutlined,
  LoadingOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import styles from './MemberRenewal.module.css';

interface BoldPaymentIntentSession {
  order_id: string;
  signature: string;
  plan_slug: string;
  amount: number;
  member_id: string;
  created_at: number;
}

const SESSION_STORAGE_KEY = 'bold_payment_intent';
const INTENT_VALIDITY_MS = 60 * 60 * 1000; // 1 hora de validez

function getSavedPaymentIntent(): BoldPaymentIntentSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BoldPaymentIntentSession;
  } catch {
    return null;
  }
}

function savePaymentIntent(intent: BoldPaymentIntentSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(intent));
  } catch (e) {
    console.error('Error saving payment intent to sessionStorage', e);
  }
}

export function MemberRenewal() {
  const { profile } = useAppSelector((state) => state.auth);
  const { member } = useAppSelector((state) => state.member);
  const dispatch = useAppDispatch();

  // Mode: Individual vs Grupal
  const [renewalMode, setRenewalMode] = useState<'individual' | 'group'>('individual');

  // Shared / Individual states
  const [plans, setPlans] = useState<Plan[]>([]);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);
  const memberId = member?.id || createdMemberId;
  const hasMember = !!member || !!createdMemberId;
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  const checkoutSectionRef = useRef<HTMLDivElement>(null);

  // States for Bold payment (individual)
  const [orderId, setOrderId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group renewal states
  const [groupPricing, setGroupPricing] = useState<GroupPricing[]>([]);
  const [myGroups, setMyGroups] = useState<MemberGroup[]>([]);
  const [groupSelectionMode, setGroupSelectionMode] = useState<'new' | 'saved'>('new');
  const [selectedSavedGroupId, setSelectedSavedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [friendEmails, setFriendEmails] = useState<string[]>(['']);
  const [emailValidationState, setEmailValidationState] = useState<
    Record<number, { loading: boolean; valid?: boolean; name?: string; memberId?: string; error?: string }>
  >({});
  const [saveGroupForFuture, setSaveGroupForFuture] = useState(true);

  // Group payment intent states
  const [groupOrderId, setGroupOrderId] = useState<string | null>(null);
  const [groupSignature, setGroupSignature] = useState<string | null>(null);
  const [isGeneratingGroupSignature, setIsGeneratingGroupSignature] = useState(false);
  const [groupCheckoutError, setGroupCheckoutError] = useState<string | null>(null);

  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [activePlans, groupPricingData] = await Promise.all([
        getActivePlans(),
        memberRepository.getGroupPricing().catch(() => [] as GroupPricing[])
      ]);
      setPlans(activePlans);
      setGroupPricing(groupPricingData);

      if (profile) {
        try {
          const savedGroups = await memberRepository.getMyGroups();
          setMyGroups(savedGroups);
          if (savedGroups.length > 0) {
            setSelectedSavedGroupId(savedGroups[0].id);
          }
        } catch {
          // Si falla cargar grupos, simplemente deja lista vacía
          setMyGroups([]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los planes disponibles';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const scrollToCheckout = useCallback(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setShowScrollIndicator(true);
      setTimeout(() => {
        setShowScrollIndicator(false);
      }, 3000);

      setTimeout(() => {
        checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, []);

  const handleChangePlan = () => {
    setSelectedPlan(null);
    setOrderId(null);
    setSignature(null);
    setError(null);
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!profile) return;

    setSelectedPlan(plan);
    setError(null);
    scrollToCheckout();

    let targetMemberId = memberId;
    if (!targetMemberId) {
      const m = await memberRepository.getOrCreateMemberByProfileId(profile.id);
      targetMemberId = m.id;
      setCreatedMemberId(m.id);
      dispatch(setMember(m));
    }

    const now = Date.now();
    const savedIntent = getSavedPaymentIntent();

    // Reutilizar si existe un intent en sessionStorage que:
    // 1. Sea del mismo plan_slug
    // 2. Tenga menos de 1 hora de antigüedad (created_at)
    if (
      savedIntent &&
      savedIntent.plan_slug === plan.slug &&
      now - savedIntent.created_at < INTENT_VALIDITY_MS
    ) {
      setOrderId(savedIntent.order_id);
      setSignature(savedIntent.signature);
      return;
    }

    // Si no cumple -> generar nuevo intent y guardarlo en sessionStorage reemplazando el anterior
    setOrderId(null);
    setSignature(null);
    setIsGeneratingSignature(true);
    setIsSubmitting(true);

    try {
      const newOrderId =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const amountInPesos = Math.round(plan.price);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const intentResponse = await fetch(`${apiUrl}/bold/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: newOrderId,
          member_id: targetMemberId,
          plan_slug: plan.slug,
          amount: amountInPesos,
        }),
      });

      if (!intentResponse.ok) {
        throw new Error('No se pudo registrar la intención de pago en el servidor');
      }

      const response = await fetch(
        `${apiUrl}/bold/integrity-signature?order_id=${newOrderId}&amount=${amountInPesos}&currency=COP`
      );

      if (!response.ok) {
        throw new Error('No se pudo generar la firma de seguridad en el servidor');
      }

      const data = await response.json();
      const newSignature = data.signature;

      setOrderId(newOrderId);
      setSignature(newSignature);

      savePaymentIntent({
        order_id: newOrderId,
        signature: newSignature,
        plan_slug: plan.slug,
        amount: amountInPesos,
        member_id: targetMemberId,
        created_at: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar el intento de pago';
      setError(msg);
    } finally {
      setIsGeneratingSignature(false);
      setIsSubmitting(false);
    }
  };

  // Group handling helpers
  const handleFriendEmailChange = (index: number, val: string) => {
    const updatedEmails = [...friendEmails];
    updatedEmails[index] = val;
    setFriendEmails(updatedEmails);

    // Reset current generated intent
    setGroupOrderId(null);
    setGroupSignature(null);
    setGroupCheckoutError(null);

    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setEmailValidationState((prev) => ({
        ...prev,
        [index]: { loading: false }
      }));
      return;
    }

    if (trimmed.toLowerCase() === profile?.email?.toLowerCase()) {
      setEmailValidationState((prev) => ({
        ...prev,
        [index]: { loading: false, valid: false, error: 'Este es tu propio correo' }
      }));
      return;
    }

    const isDuplicate = updatedEmails.some(
      (e, i) => i !== index && e.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEmailValidationState((prev) => ({
        ...prev,
        [index]: { loading: false, valid: false, error: 'Correo repetido en la lista' }
      }));
      return;
    }

    setEmailValidationState((prev) => ({
      ...prev,
      [index]: { loading: true }
    }));

    debounceTimers.current[index] = setTimeout(async () => {
      try {
        const res = await memberRepository.validateMemberEmail(trimmed);
        if (res.valid && res.member_id) {
          setEmailValidationState((prev) => ({
            ...prev,
            [index]: {
              loading: false,
              valid: true,
              name: res.full_name,
              memberId: res.member_id
            }
          }));
        } else {
          setEmailValidationState((prev) => ({
            ...prev,
            [index]: {
              loading: false,
              valid: false,
              error: 'Miembro no registrado en Platinum Center'
            }
          }));
        }
      } catch {
        setEmailValidationState((prev) => ({
          ...prev,
          [index]: {
            loading: false,
            valid: false,
            error: 'Error al validar correo'
          }
        }));
      }
    }, 450);
  };

  const { minPersons, maxPersons } = getGroupPricingBounds(groupPricing);

  const handleAddFriend = () => {
    if (friendEmails.length < maxPersons - 1) {
      setFriendEmails([...friendEmails, '']);
      setGroupOrderId(null);
      setGroupSignature(null);
    }
  };

  const handleRemoveFriend = (index: number) => {
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }
    const updatedEmails = friendEmails.filter((_, i) => i !== index);
    setFriendEmails(updatedEmails);

    const updatedValidations: Record<number, { loading: boolean; valid?: boolean; name?: string; memberId?: string; error?: string }> = {};
    updatedEmails.forEach((_, newIdx) => {
      const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
      if (emailValidationState[oldIdx]) {
        updatedValidations[newIdx] = emailValidationState[oldIdx];
      }
    });
    setEmailValidationState(updatedValidations);
    setGroupOrderId(null);
    setGroupSignature(null);
  };

  // Group members and totals calculation
  const selectedSavedGroup = myGroups.find((g) => g.id === selectedSavedGroupId);
  const savedGroupMembers = selectedSavedGroup?.member_group_members || [];
  const savedGroupCount = savedGroupMembers.length;
  const savedGroupMemberIds = savedGroupMembers.map((m) => m.member_id);

  const validFriendEntries = friendEmails
    .map((email, idx) => ({ email: email.trim(), validation: emailValidationState[idx] }))
    .filter((entry) => entry.email !== '' && entry.validation?.valid && entry.validation?.memberId);

  const hasInvalidFriend = friendEmails.some((email, idx) => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    const v = emailValidationState[idx];
    return !v || v.loading || v.valid === false;
  });

  const isNewGroupComplete = !hasInvalidFriend && validFriendEntries.length >= 1;
  const newGroupTotalMembers = 1 + validFriendEntries.length;

  const currentTotalGroupMembers =
    groupSelectionMode === 'saved' ? savedGroupCount : newGroupTotalMembers;

  const groupSummary = calculateGroupPricingSummary(groupPricing, currentTotalGroupMembers);
  const activeGroupTier = groupSummary.tier;
  const totalGroupAmount = groupSummary.totalAmount;

  const canProceedGroup =
    groupSelectionMode === 'saved'
      ? savedGroupCount >= minPersons && savedGroupCount <= maxPersons && !!activeGroupTier
      : isNewGroupComplete && newGroupTotalMembers >= minPersons && newGroupTotalMembers <= maxPersons && !!activeGroupTier;

  const handleProceedGroupPayment = async () => {
    if (!profile || !canProceedGroup || !activeGroupTier) return;

    setIsGeneratingGroupSignature(true);
    setGroupCheckoutError(null);
    setGroupOrderId(null);
    setGroupSignature(null);

    try {
      let targetMemberId = memberId;
      if (!targetMemberId) {
        const m = await memberRepository.getOrCreateMemberByProfileId(profile.id);
        targetMemberId = m.id;
        setCreatedMemberId(m.id);
        dispatch(setMember(m));
      }

      let finalMemberIds: string[] = [];
      if (groupSelectionMode === 'saved') {
        finalMemberIds = [...savedGroupMemberIds];
        if (!finalMemberIds.includes(targetMemberId)) {
          finalMemberIds.unshift(targetMemberId);
        }
      } else {
        finalMemberIds = [
          targetMemberId,
          ...validFriendEntries.map((e) => e.validation!.memberId!)
        ];

        if (saveGroupForFuture) {
          try {
            const friendEmailsList = validFriendEntries.map((e) => e.email);
            await memberRepository.createGroup({
              name: newGroupName.trim() || `Grupo de ${profile.full_name || 'Platinum'}`,
              emails: [profile.email, ...friendEmailsList]
            });
            const refreshed = await memberRepository.getMyGroups();
            setMyGroups(refreshed);
          } catch (saveErr) {
            console.warn('No se pudo guardar el grupo para uso futuro:', saveErr);
          }
        }
      }

      const newOrderId =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      await memberRepository.createGroupPaymentIntent({
        order_id: newOrderId,
        plan_slug: '1_month',
        amount: totalGroupAmount,
        member_ids: finalMemberIds
      });

      const sigRes = await fetch(
        `${apiUrl}/bold/integrity-signature?order_id=${newOrderId}&amount=${totalGroupAmount}&currency=COP`
      );
      if (!sigRes.ok) {
        throw new Error('No se pudo generar la firma de seguridad para el pago grupal');
      }
      const sigData = await sigRes.json();

      setGroupOrderId(newOrderId);
      setGroupSignature(sigData.signature);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al preparar el pago grupal';
      setGroupCheckoutError(msg);
    } finally {
      setIsGeneratingGroupSignature(false);
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

  const getPlanBenefits = (slug: string): string[] => {
    switch (slug) {
      case '1_day':
        return [
          'Acceso ilimitado por 24 horas',
          'Uso de zonas de fuerza y cardio',
          'Sin costos de inscripción',
          'Casillero de día gratuito',
        ];
      case '15_days':
        return [
          '15 días de acceso consumibles',
          'Válido por 30 días calendario',
          'Uso de zonas de fuerza y cardio',
          'Ideal para viajeros o rutinas flexibles',
          'Casillero de día gratuito',
        ];
      case '1_month':
        return [
          'Acceso ilimitado por 30 días',
          'Uso de todas las zonas del gym',
          'Clases grupales incluidas',
          'Valoración física inicial',
          'Casillero de día gratuito',
        ];
      case '1_year':
        return [
          'Acceso ilimitado por 365 días',
          'El mejor precio del mercado',
          'Uso de todas las zonas del gym',
          'Clases grupales ilimitadas',
          '2 Valoraciones físicas al año',
          '1 Invitación gratis al mes',
        ];
      default:
        return [
          'Uso de todas las instalaciones del gimnasio',
          'Acceso ilimitado durante la vigencia del plan',
        ];
    }
  };

  const redirectionUrl = import.meta.env.VITE_APP_URL
    ? `${import.meta.env.VITE_APP_URL}/portal/payment-result`
    : 'https://platinum-center-git-develop-gymplatinumcenter-6828s-projects.vercel.app/portal/payment-result';

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
      {isSubmitting && <LoadingScreen message="Iniciando transacción segura..." />}
      <header className={styles['member-renewal__header']}>
        <h1 className={styles['member-renewal__title']}>
          {hasMember ? 'Renueva tu Membresía' : 'Adquiere tu Membresía'}
        </h1>
        <p className={styles['member-renewal__subtitle']}>
          Selecciona tu modalidad preferida: individual o grupal con tarifa reducida para ti y tus amigos.
        </p>

        {/* Modalidad Selector */}
        <div className={styles['member-renewal__tabs-container']} role="tablist" style={{ marginTop: '16px' }}>
          <button
            type="button"
            role="tab"
            aria-selected={renewalMode === 'individual'}
            className={`${styles['member-renewal__tab-btn']} ${
              renewalMode === 'individual' ? styles['member-renewal__tab-btn--active'] : ''
            }`}
            onClick={() => {
              setRenewalMode('individual');
              setError(null);
            }}
          >
            <UserOutlined /> Membresía Individual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={renewalMode === 'group'}
            className={`${styles['member-renewal__tab-btn']} ${
              renewalMode === 'group' ? styles['member-renewal__tab-btn--active'] : ''
            }`}
            onClick={() => {
              setRenewalMode('group');
              setError(null);
            }}
          >
            <TeamOutlined /> Membresía Grupal ({minPersons}-{maxPersons} personas)
          </button>
        </div>
      </header>

      {/* VISTA INDIVIDUAL */}
      {renewalMode === 'individual' ? (
        <div
          className={`${styles['member-renewal__content']} ${
            selectedPlan ? styles['member-renewal__content--with-summary'] : ''
          }`}
        >
          <div
            className={`${styles['member-renewal__plans-grid']} ${
              !selectedPlan ? styles['member-renewal__plans-grid--full'] : ''
            }`}
          >
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
                  {plan.slug === '1_year' && (
                    <span className={styles['member-renewal__popular-badge']}>MEJOR VALOR</span>
                  )}
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
                    disabled={isGeneratingSignature}
                    onClick={() => handleSelectPlan(plan)}
                    aria-label={`Seleccionar plan ${plan.name}`}
                  >
                    {isSelected ? '✓ Plan Seleccionado' : 'Seleccionar Plan'}
                  </button>
                </article>
              );
            })}
          </div>

          {selectedPlan && (
            <aside
              ref={checkoutSectionRef}
              className={styles['member-renewal__summary-wrapper']}
              aria-labelledby="checkout-summary-title"
            >
              <div className={styles['member-renewal__checkout-box']}>
                <div className={styles['member-renewal__checkout-header']}>
                  <div className={styles['member-renewal__checkout-header-main']}>
                    <h2 id="checkout-summary-title" className={styles['member-renewal__checkout-title']}>
                      Resumen de Compra
                    </h2>
                    <span className={styles['member-renewal__checkout-badge']}>Paso Final</span>
                  </div>
                  <button
                    type="button"
                    className={styles['member-renewal__change-plan-button']}
                    onClick={handleChangePlan}
                    aria-label="Cambiar plan seleccionado"
                  >
                    Cambiar plan
                  </button>
                </div>

                <div className={styles['member-renewal__checkout-details']}>
                  <div className={styles['member-renewal__checkout-row']}>
                    <span className={styles['member-renewal__checkout-label']}>Plan seleccionado:</span>
                    <span className={styles['member-renewal__checkout-val']}>
                      {selectedPlan.name}
                    </span>
                  </div>
                  <div className={styles['member-renewal__checkout-row']}>
                    <span className={styles['member-renewal__checkout-label']}>Monto total:</span>
                    <span className={styles['member-renewal__checkout-price']}>
                      {formatCOP(selectedPlan.price)}
                    </span>
                  </div>
                </div>

                <div className={styles['member-renewal__divider']} />

                <div className={styles['member-renewal__security']}>
                  <SafetyOutlined className={styles['member-renewal__security-icon']} />
                  <span className={styles['member-renewal__security-text']}>
                    Pago seguro procesado por Bold. Acepta PSE, Tarjetas de Crédito, Nequi y DaviPlata.
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
                      planName={selectedPlan.name}
                      redirectionUrl={redirectionUrl}
                      metadata={{
                        reference: orderId,
                        member_id: memberId,
                        plan: selectedPlan.slug,
                      }}
                    />
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* VISTA GRUPAL */
        <div className={styles['member-renewal__group-view']}>
          {/* Banner explicativo */}
          <div className={styles['member-renewal__group-banner']}>
            <TeamOutlined className={styles['member-renewal__group-banner-icon']} />
            <div className={styles['member-renewal__group-banner-body']}>
              <h2 className={styles['member-renewal__group-banner-title']}>
                ¡Entrena en grupo y obtén descuento exclusivo mensual!
              </h2>
              <p className={styles['member-renewal__group-banner-desc']}>
                Reúne de {minPersons} a {maxPersons} miembros de Platinum Center. Una sola persona realiza el pago del total
                del grupo y la membresía mensual de 30 días se activa de inmediato para cada integrante.
              </p>
            </div>
          </div>

          {/* Pricing Tiers Display */}
          <div className={styles['member-renewal__group-tiers']}>
            {groupPricing.map((tier, idx) => {
              const isTierActive =
                currentTotalGroupMembers >= tier.min_members &&
                currentTotalGroupMembers <= tier.max_members;
              return (
                <div
                  key={idx}
                  className={`${styles['member-renewal__group-tier-card']} ${
                    isTierActive ? styles['member-renewal__group-tier-card--active'] : ''
                  }`}
                >
                  <span className={styles['member-renewal__group-tier-badge']}>
                    {tier.min_members === tier.max_members
                      ? `${tier.min_members} Personas`
                      : `${tier.min_members} a ${tier.max_members} Personas`}
                  </span>
                  <span className={styles['member-renewal__group-tier-price']}>
                    {formatCOP(tier.price_per_person)}
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>
                      {' '}/ persona
                    </span>
                  </span>
                  <span className={styles['member-renewal__group-tier-detail']}>
                    Total mensual: {formatCOP(tier.price_per_person * tier.min_members)} COP
                  </span>
                </div>
              );
            })}
          </div>

          {/* Content Layout */}
          <div
            className={`${styles['member-renewal__content']} ${styles['member-renewal__content--with-summary']}`}
          >
            {/* Left: Configuration */}
            <div className={styles['member-renewal__group-config-card']}>
              {myGroups.length > 0 && (
                <div className={styles['member-renewal__subtabs']}>
                  <button
                    type="button"
                    className={`${styles['member-renewal__subtab-btn']} ${
                      groupSelectionMode === 'new' ? styles['member-renewal__subtab-btn--active'] : ''
                    }`}
                    onClick={() => {
                      setGroupSelectionMode('new');
                      setGroupOrderId(null);
                      setGroupSignature(null);
                    }}
                  >
                    Nuevo Grupo
                  </button>
                  <button
                    type="button"
                    className={`${styles['member-renewal__subtab-btn']} ${
                      groupSelectionMode === 'saved' ? styles['member-renewal__subtab-btn--active'] : ''
                    }`}
                    onClick={() => {
                      setGroupSelectionMode('saved');
                      if (!selectedSavedGroupId && myGroups[0]) {
                        setSelectedSavedGroupId(myGroups[0].id);
                      }
                      setGroupOrderId(null);
                      setGroupSignature(null);
                    }}
                  >
                    Mis Grupos Guardados ({myGroups.length})
                  </button>
                </div>
              )}

              {groupSelectionMode === 'saved' && myGroups.length > 0 ? (
                <div className={styles['member-renewal__form-section']}>
                  <div className={styles['member-renewal__field-label']}>
                    Selecciona uno de tus grupos guardados:
                  </div>
                  <div className={styles['member-renewal__saved-groups-grid']}>
                    {myGroups.map((g) => {
                      const isSelected = selectedSavedGroupId === g.id;
                      const gMembers = g.member_group_members || [];
                      return (
                        <div
                          key={g.id}
                          className={`${styles['member-renewal__saved-group-card']} ${
                            isSelected ? styles['member-renewal__saved-group-card--selected'] : ''
                          }`}
                          onClick={() => {
                            setSelectedSavedGroupId(g.id);
                            setGroupOrderId(null);
                            setGroupSignature(null);
                          }}
                        >
                          <p className={styles['member-renewal__saved-group-name']}>{g.name}</p>
                          <p className={styles['member-renewal__saved-group-members']}>
                            {gMembers.length} integrantes:{' '}
                            {gMembers
                              .map((m) => m.members?.profiles?.full_name || 'Miembro')
                              .join(', ')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className={styles['member-renewal__form-section']}>
                  <div className={styles['member-renewal__field-group']}>
                    <label className={styles['member-renewal__field-label']} htmlFor="group-name-input">
                      Nombre del Grupo (Opcional)
                    </label>
                    <input
                      id="group-name-input"
                      type="text"
                      placeholder="Ej: Los Guerreros"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={styles['member-renewal__text-input']}
                    />
                  </div>

                  <div className={styles['member-renewal__members-list']}>
                    {/* Member 1: Organizer (You) */}
                    <div className={styles['member-renewal__member-row']}>
                      <div className={styles['member-renewal__member-row-header']}>
                        <span className={styles['member-renewal__member-index']}>
                          Miembro 1 (Tú - Pagador)
                        </span>
                        <span className={styles['member-renewal__validation-badge--valid']}>
                          ✓ Confirmado
                        </span>
                      </div>
                      <div className={styles['member-renewal__member-creator-info']}>
                        <UserOutlined style={{ color: 'var(--color-accent)' }} />
                        <span className={styles['member-renewal__member-creator-name']}>
                          {profile?.full_name || 'Tú'}
                        </span>
                        <span className={styles['member-renewal__member-creator-email']}>
                          ({profile?.email})
                        </span>
                      </div>
                    </div>

                    {/* Friend rows */}
                    {friendEmails.map((email, idx) => {
                      const val = emailValidationState[idx];
                      return (
                        <div key={idx} className={styles['member-renewal__member-row']}>
                          <div className={styles['member-renewal__member-row-header']}>
                            <span className={styles['member-renewal__member-index']}>
                              Miembro {idx + 2}
                            </span>
                            {friendEmails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFriend(idx)}
                                className={styles['member-renewal__btn-remove']}
                                title="Eliminar este miembro"
                              >
                                <DeleteOutlined />
                              </button>
                            )}
                          </div>
                          <div className={styles['member-renewal__member-row-body']}>
                            <input
                              type="email"
                              placeholder="correo@ejemplo.com del miembro registrado"
                              value={email}
                              onChange={(e) => handleFriendEmailChange(idx, e.target.value)}
                              className={styles['member-renewal__text-input']}
                            />
                          </div>
                          {val?.loading && (
                            <span
                              className={`${styles['member-renewal__validation-badge']} ${styles['member-renewal__validation-badge--loading']}`}
                            >
                              <LoadingOutlined /> Verificando correo de miembro...
                            </span>
                          )}
                          {!val?.loading && val?.valid && (
                            <span
                              className={`${styles['member-renewal__validation-badge']} ${styles['member-renewal__validation-badge--valid']}`}
                            >
                              <CheckCircleOutlined />{' '}
                              {val.name ? `${val.name} (Miembro válido)` : 'Miembro válido'}
                            </span>
                          )}
                          {!val?.loading && val?.valid === false && (
                            <span
                              className={`${styles['member-renewal__validation-badge']} ${styles['member-renewal__validation-badge--invalid']}`}
                            >
                              <CloseCircleOutlined /> {val.error || 'Correo no válido'}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {friendEmails.length < maxPersons - 1 && (
                      <button
                        type="button"
                        onClick={handleAddFriend}
                        className={styles['member-renewal__add-member-btn']}
                      >
                        <PlusOutlined /> Agregar otro miembro ({friendEmails.length + 1} de {maxPersons})
                      </button>
                    )}
                  </div>

                  <label className={styles['member-renewal__checkbox-label']}>
                    <input
                      type="checkbox"
                      checked={saveGroupForFuture}
                      onChange={(e) => setSaveGroupForFuture(e.target.checked)}
                    />
                    <span>Guardar este grupo para futuras renovaciones</span>
                  </label>
                </div>
              )}
            </div>

            {/* Right: Group Summary & Bold Checkout */}
            <aside className={styles['member-renewal__summary-wrapper']}>
              <div className={styles['member-renewal__checkout-box']}>
                <div className={styles['member-renewal__checkout-header']}>
                  <div className={styles['member-renewal__checkout-header-main']}>
                    <h2 className={styles['member-renewal__checkout-title']}>
                      Resumen Membresía Grupal
                    </h2>
                    <span className={styles['member-renewal__checkout-badge']}>30 Días</span>
                  </div>
                </div>

                <div className={styles['member-renewal__checkout-details']}>
                  <div className={styles['member-renewal__checkout-row']}>
                    <span className={styles['member-renewal__checkout-label']}>Plan:</span>
                    <span className={styles['member-renewal__checkout-val']}>Membresía Mensual</span>
                  </div>
                  <div className={styles['member-renewal__checkout-row']}>
                    <span className={styles['member-renewal__checkout-label']}>Integrantes:</span>
                    <span className={styles['member-renewal__checkout-val']}>
                      {currentTotalGroupMembers}{' '}
                      {currentTotalGroupMembers === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                  {activeGroupTier && (
                    <div className={styles['member-renewal__checkout-row']}>
                      <span className={styles['member-renewal__checkout-label']}>Tarifa por persona:</span>
                      <span className={styles['member-renewal__checkout-val']}>
                        {formatCOP(activeGroupTier.price_per_person)}
                      </span>
                    </div>
                  )}
                  <div className={styles['member-renewal__checkout-row']}>
                    <span className={styles['member-renewal__checkout-label']}>Monto total del grupo:</span>
                    <span className={styles['member-renewal__checkout-price']}>
                      {formatCOP(totalGroupAmount)}
                    </span>
                  </div>
                </div>

                <div className={styles['member-renewal__divider']} />

                <div className={styles['member-renewal__security']}>
                  <SafetyOutlined className={styles['member-renewal__security-icon']} />
                  <span className={styles['member-renewal__security-text']}>
                    Un solo pago total. Al confirmarse, se activa el mes completo para cada uno de los{' '}
                    {currentTotalGroupMembers} integrantes.
                  </span>
                </div>

                {groupCheckoutError && (
                  <div className={styles['member-renewal__checkout-error']} role="alert">
                    {groupCheckoutError}
                  </div>
                )}

                {isGeneratingGroupSignature && (
                  <div className={styles['member-renewal__loading-signature']}>
                    Preparando pasarela de pago grupal...
                  </div>
                )}

                {!groupSignature ? (
                  <button
                    type="button"
                    className={styles['member-renewal__btn-proceed-group']}
                    disabled={!canProceedGroup || isGeneratingGroupSignature}
                    onClick={handleProceedGroupPayment}
                  >
                    {currentTotalGroupMembers < minPersons
                      ? 'Agrega al menos 1 amigo para pagar'
                      : !canProceedGroup
                      ? 'Completa los correos válidos'
                      : `Pagar Membresía Grupal (${formatCOP(totalGroupAmount)})`}
                  </button>
                ) : (
                  <div className={styles['member-renewal__payment-button-wrapper']}>
                    <BoldPaymentButton
                      orderId={groupOrderId!}
                      amount={Math.round(totalGroupAmount)}
                      apiKey={import.meta.env.VITE_BOLD_API_KEY}
                      integritySignature={groupSignature}
                      planName={`Membresía Grupal (${currentTotalGroupMembers} personas)`}
                      redirectionUrl={redirectionUrl}
                      metadata={{
                        reference: groupOrderId!,
                        member_id: memberId!,
                        plan: '1_month',
                        group_member_ids: (groupSelectionMode === 'saved'
                          ? savedGroupMemberIds
                          : [
                              memberId!,
                              ...validFriendEntries.map((e) => e.validation!.memberId!)
                            ]
                        ).join(',')
                      }}
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {showScrollIndicator && (
        <div className={styles['member-renewal__scroll-indicator']}>
          <span>👇 Desliza para pagar</span>
        </div>
      )}
    </div>
  );
}

export default MemberRenewal;
