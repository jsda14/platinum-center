import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button as AntdButton, Tooltip, Modal } from 'antd';
import { LockOutlined, WhatsAppOutlined, MailOutlined, RocketOutlined } from '@ant-design/icons';
import styles from './LockedFeature.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

// Modal helper for admin action clicks
export function showUpgradeModal(customMessage?: string) {
  Modal.info({
    icon: <LockOutlined style={{ color: 'var(--color-accent)', fontSize: '24px' }} />,
    title: (
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.5px' }}>
        Función Premium
      </span>
    ),
    content: (
      <div style={{ marginTop: '12px' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
          {customMessage || 'Esta función requiere un upgrade. Contáctanos para activarla.'}
        </p>
      </div>
    ),
    okText: 'Contactar por WhatsApp',
    okButtonProps: {
      icon: <WhatsAppOutlined />,
      style: {
        backgroundColor: '#25D366',
        borderColor: '#25D366',
        color: '#ffffff',
        fontWeight: 600,
        height: '36px',
        borderRadius: '8px',
      },
    },
    onOk: () => {
      window.open('https://wa.me/573057532192', '_blank');
    },
    centered: true,
    maskClosable: true,
  });
}

// Modal helper for member action clicks (informative, no contact/upgrade required)
export function showComingSoonModal(customMessage?: string) {
  Modal.info({
    icon: <RocketOutlined style={{ color: 'var(--color-accent)', fontSize: '24px' }} />,
    title: (
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', letterSpacing: '0.5px' }}>
        ¡Próximamente!
      </span>
    ),
    content: (
      <div style={{ marginTop: '12px' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
          {customMessage || 'Esta función estará disponible próximamente en tu portal de miembro. ¡Estamos trabajando para habilitarla muy pronto!'}
        </p>
      </div>
    ),
    okText: 'Entendido',
    okButtonProps: {
      style: {
        backgroundColor: 'var(--color-primary)',
        borderColor: 'var(--color-primary)',
        color: '#ffffff',
        fontWeight: 600,
        height: '38px',
        borderRadius: '8px',
        padding: '0 24px',
      },
    },
    centered: true,
    maskClosable: true,
  });
}

// Sub-Component 1: Button
interface LockedFeatureButtonProps {
  title: string;
  description: string;
  className?: string;
  icon?: ReactNode;
}

function LockedFeatureButton({ title, description, className, icon }: LockedFeatureButtonProps) {
  return (
    <Tooltip
      title={
        <div>
          <div className={styles['locked-feature-tooltip__title']}>{title}</div>
          <div className={styles['locked-feature-tooltip__description']}>{description}</div>
        </div>
      }
    >
      <AntdButton
        disabled
        icon={icon !== undefined ? icon : <LockOutlined />}
        className={`${styles['locked-feature-button']} ${className || ''}`}
      >
        {title}
      </AntdButton>
    </Tooltip>
  );
}

// Sub-Component 2: Section
interface LockedFeatureSectionProps {
  title?: string;
  description?: string;
  comingSoon?: boolean;
  blur?: boolean;
  children: ReactNode;
  showFloatingBadge?: boolean;
  variant?: 'admin' | 'member';
}

function LockedFeatureSection({
  children,
  showFloatingBadge = true,
  variant,
}: LockedFeatureSectionProps) {
  const location = useLocation();
  const isMember = variant ? variant === 'member' : location.pathname.startsWith('/portal');

  return (
    <div className={styles['locked-feature-section']}>
      {showFloatingBadge && (
        <div className={styles['locked-feature-section__badge-container']}>
          {isMember ? (
            <div className={styles['locked-feature-section__member-banner']}>
              <div className={styles['locked-feature-section__badge-info']}>
                <RocketOutlined className={styles['locked-feature-section__member-icon']} />
                <span className={styles['locked-feature-section__member-title']}>Próximamente</span>
                <span className={styles['locked-feature-section__member-sub']}>
                  Estamos preparando esta sección para tu membresía
                </span>
              </div>
              <span className={styles['locked-feature-section__member-pill']}>Muy pronto</span>
            </div>
          ) : (
            <div className={styles['locked-feature-section__floating-badge']}>
              <div className={styles['locked-feature-section__badge-info']}>
                <LockOutlined className={styles['locked-feature-section__badge-icon']} />
                <span className={styles['locked-feature-section__badge-text']}>Función Premium</span>
              </div>
              <a
                href="https://wa.me/573057532192"
                target="_blank"
                rel="noopener noreferrer"
                className={styles['locked-feature-section__badge-btn']}
              >
                Contactar
              </a>
            </div>
          )}
        </div>
      )}
      <div className={styles['locked-feature-section__children']}>
        {children}
      </div>
    </div>
  );
}

// Sub-Component 3: Page
interface LockedFeaturePageProps {
  title: string;
  description: string;
  comingSoon?: boolean;
  icon?: ReactNode;
}

function LockedFeaturePage({
  title,
  description,
  comingSoon = true,
  icon
}: LockedFeaturePageProps) {
  const badgeText = comingSoon ? 'PRÓXIMAMENTE' : 'UPGRADE';
  const badgeClass = comingSoon
    ? styles['locked-feature-page__badge--soon']
    : styles['locked-feature-page__badge--upgrade'];

  return (
    <div className={styles['locked-feature-page']} role="main">
      <div className={styles['locked-feature-page__container']}>
        <img
          src={platinumLogo}
          alt="Logo Platinum Center"
          className={styles['locked-feature-page__logo']}
        />
        {icon ? (
          <div className={styles['locked-feature-page__icon']}>{icon}</div>
        ) : (
          <LockOutlined className={styles['locked-feature-page__icon']} />
        )}
        <span className={`${styles['locked-feature-page__badge']} ${badgeClass}`}>
          {badgeText}
        </span>
        <h1 className={styles['locked-feature-page__title']}>{title}</h1>
        <p className={styles['locked-feature-page__description']}>{description}</p>
        <div className={styles['locked-feature-page__contact-actions']}>
          <AntdButton
            type="primary"
            icon={<WhatsAppOutlined />}
            href="https://wa.me/573057532192"
            target="_blank"
            rel="noopener noreferrer"
            className={styles['locked-feature-page__contact-btn--whatsapp']}
          >
            WhatsApp
          </AntdButton>
          <AntdButton
            icon={<MailOutlined />}
            href="mailto:jsda14@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles['locked-feature-page__contact-btn--email']}
          >
            Email
          </AntdButton>
        </div>
      </div>
    </div>
  );
}

// Sub-Component 4: Badge
interface LockedFeatureBadgeProps {
  comingSoon?: boolean;
}

function LockedFeatureBadge({ comingSoon = true }: LockedFeatureBadgeProps) {
  const text = comingSoon ? 'PRÓXIMAMENTE' : 'UPGRADE';
  const badgeClass = comingSoon
    ? styles['locked-feature-badge--soon']
    : styles['locked-feature-badge--upgrade'];

  return (
    <span className={`${styles['locked-feature-badge']} ${badgeClass}`}>
      {text}
    </span>
  );
}

// Raíz Composed Component object
export const LockedFeature = {
  Button: LockedFeatureButton,
  Section: LockedFeatureSection,
  Page: LockedFeaturePage,
  Badge: LockedFeatureBadge,
  showUpgradeModal,
  showComingSoonModal,
};

export default LockedFeature;
