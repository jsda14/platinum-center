import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../infrastructure/store/store';
import type { UserRole } from '../../../domain/member/member.types';
import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return (
      <div className={styles['protected-route__loading']} role="status">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'receptionist') return <Navigate to="/reception" replace />;
    return <Navigate to="/portal" replace />;
  }

  return children ? <>{children}</> : null;
}
