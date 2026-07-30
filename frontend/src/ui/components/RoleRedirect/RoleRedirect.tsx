import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../infrastructure/store/store';
import styles from './RoleRedirect.module.css';

interface RoleRedirectProps {}

export function RoleRedirect(_props: RoleRedirectProps = {}) {
  const { user, profile, loading } = useAppSelector((state) => state.auth);

  if (loading) {
    return (
      <div className={styles['role-redirect__loading']} role="status">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'receptionist') return <Navigate to="/reception" replace />;
  return <Navigate to="/portal" replace />;
}
