import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import styles from './CookieBanner.module.css';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem('platinum_center_cookies_accepted');
    if (consent !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('platinum_center_cookies_accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles['cookie-banner']} role="dialog" aria-labelledby="cookie-banner-title">
      <div className={styles['cookie-banner__content']}>
        <p className={styles['cookie-banner__text']}>
          Utilizamos cookies propias y de terceros para garantizar la mejor experiencia en nuestro portal.
          Al continuar navegando, aceptas el uso de cookies y nuestra{' '}
          <Link to="/politica-privacidad" className={styles['cookie-banner__link']}>
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
      <div className={styles['cookie-banner__actions']}>
        <Button
          type="primary"
          onClick={handleAccept}
          className={styles['cookie-banner__accept-btn']}
        >
          Aceptar
        </Button>
      </div>
    </div>
  );
}

export default CookieBanner;
