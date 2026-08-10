import type { ReactNode } from 'react';
import { Outlet, Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children?: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles['auth-layout']}>
      <div className={styles['auth-layout__container']}>
        {children || <Outlet />}
      </div>
      <footer className={styles['auth-layout__footer']} role="contentinfo">
        <p className={styles['auth-layout__copyright']}>
          © {currentYear} Platinum Center. Todos los derechos reservados.
        </p>
        <div className={styles['auth-layout__links']}>
          <Link to="/terminos" className={styles['auth-layout__link']}>
            Términos y Condiciones
          </Link>
          <span className={styles['auth-layout__separator']}>•</span>
          <Link to="/politica-privacidad" className={styles['auth-layout__link']}>
            Política de Privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}
