import type { ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IdcardOutlined,
  CreditCardOutlined,
  CommentOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { logout } from '../../../infrastructure/store/authSlice';
import styles from './MemberLayout.module.css';

interface MemberLayoutProps {
  children?: ReactNode;
}

export function MemberLayout({ children }: MemberLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    {
      path: '/portal',
      label: 'Membresía',
      icon: <IdcardOutlined />,
    },
    {
      path: '/portal/payments',
      label: 'Pagos',
      icon: <CreditCardOutlined />,
    },
    {
      path: '/portal/suggestions',
      label: 'Sugerencias',
      icon: <CommentOutlined />,
    },
  ];

  return (
    <div className={styles['member-layout']}>
      <header className={styles['member-layout__header']}>
        <div className={styles['member-layout__brand']}>
          <span className={styles['member-layout__logo']}>PLATINUM CENTER</span>
        </div>
        <div className={styles['member-layout__user']}>
          <span className={styles['member-layout__user-name']}>
            {profile?.full_name || 'Miembro'}
          </span>
          <button
            type="button"
            className={styles['member-layout__logout-button']}
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutOutlined />
          </button>
        </div>
      </header>

      <main className={styles['member-layout__content']}>
        {children || <Outlet />}
      </main>

      <nav className={styles['member-layout__tabbar']} role="navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              className={`${styles['member-layout__tab']} ${
                isActive ? styles['member-layout__tab--active'] : ''
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className={styles['member-layout__tab-icon']}>{item.icon}</span>
              <span className={styles['member-layout__tab-label']}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
