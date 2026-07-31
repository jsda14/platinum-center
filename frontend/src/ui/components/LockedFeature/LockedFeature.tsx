import type { ReactNode } from 'react';
import { Button as AntdButton, Tooltip } from 'antd';
import { LockOutlined, WhatsAppOutlined, MailOutlined } from '@ant-design/icons';
import styles from './LockedFeature.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

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
  title: string;
  description: string;
  comingSoon?: boolean;
  blur?: boolean;
  children: ReactNode;
}

function LockedFeatureSection({
  title,
  description,
  comingSoon = true,
  blur = true,
  children
}: LockedFeatureSectionProps) {
  const badgeText = comingSoon ? 'PRÓXIMAMENTE' : 'UPGRADE';
  const badgeClass = comingSoon
    ? styles['locked-feature-section__badge--soon']
    : styles['locked-feature-section__badge--upgrade'];

  return (
    <div className={styles['locked-feature-section']}>
      <div
        className={`${styles['locked-feature-section__children']} ${
          blur ? styles['locked-feature-section__children--blurred'] : ''
        }`}
      >
        {children}
      </div>
      <div className={styles['locked-feature-section__overlay']}>
        <div className={styles['locked-feature-section__card']}>
          <LockOutlined className={styles['locked-feature-section__icon']} />
          <span className={`${styles['locked-feature-section__badge']} ${badgeClass}`}>
            {badgeText}
          </span>
          <h3 className={styles['locked-feature-section__title']}>{title}</h3>
          <p className={styles['locked-feature-section__description']}>{description}</p>
          <div className={styles['locked-feature-section__contact-actions']}>
            <AntdButton
              type="primary"
              icon={<WhatsAppOutlined />}
              href="https://wa.me/573057532192"
              target="_blank"
              rel="noopener noreferrer"
              className={styles['locked-feature-section__contact-btn--whatsapp']}
            >
              WhatsApp
            </AntdButton>
            <AntdButton
              icon={<MailOutlined />}
              href="mailto:jsda14@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles['locked-feature-section__contact-btn--email']}
            >
              Email
            </AntdButton>
          </div>
        </div>
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
  Badge: LockedFeatureBadge
};

export default LockedFeature;
