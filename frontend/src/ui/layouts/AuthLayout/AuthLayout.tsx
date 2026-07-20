import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children?: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles['auth-layout']}>
      <div className={styles['auth-layout__container']}>
        {children || <Outlet />}
      </div>
    </div>
  );
}
