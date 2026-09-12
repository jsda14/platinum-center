import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  IdcardOutlined,
  CreditCardOutlined,
  CommentOutlined,
  LogoutOutlined,
  SettingOutlined,
  CalendarOutlined,
  TeamOutlined,
  LineChartOutlined,
  ShopOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { logout } from '../../../infrastructure/store/authSlice';
import { fetchMemberStatus } from '@/infrastructure/store/memberSlice';
import styles from './MemberLayout.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';
import { GymStatus } from '@/ui/components/GymStatus';

export function MemberLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.auth);
  const { member } = useAppSelector((state) => state.member);
  const hasActiveMember = !!member;

  const [activePage, setActivePage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const hasMovedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!profile?.id) return;
    dispatch(fetchMemberStatus(profile.id));
  }, [profile?.id]);

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
      path: '/portal/classes',
      label: 'Clases',
      icon: <CalendarOutlined />,
      isLocked: true,
    },
    {
      path: '/portal/trainer',
      label: 'Entrenador',
      icon: <TeamOutlined />,
      isLocked: true,
    },
    {
      path: '/portal/progress',
      label: 'Progreso',
      icon: <LineChartOutlined />,
      isLocked: true,
    },
    {
      path: '/portal/store',
      label: 'Tienda',
      icon: <ShopOutlined />,
      isLocked: true,
    },
    {
      path: '/portal/payments',
      label: 'Pagos',
      icon: <CreditCardOutlined />,
    },
    {
      path: '/portal/renewal',
      label: hasActiveMember ? 'Renovar' : 'Adquirir',
      icon: <CreditCardOutlined />,
    },
    {
      path: '/portal/suggestions',
      label: 'Buzón',
      icon: <CommentOutlined />,
    },
  ];

  const navPages = [
    navItems.slice(0, 4),
    navItems.slice(4, 8),
  ];

  // Switch page automatically when route changes
  useEffect(() => {
    const itemIndex = navItems.findIndex((item) => location.pathname === item.path);
    if (itemIndex >= 4) {
      setActivePage(1);
    } else if (itemIndex >= 0) {
      setActivePage(0);
    }
  }, [location.pathname]);

  // Pointer drag gestures (mouse + touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - startXRef.current;

    if (Math.abs(deltaX) > 6) {
      hasMovedRef.current = true;
    }

    // Apply edge resistance
    let appliedDelta = deltaX;
    if (activePage === 0 && deltaX > 0) {
      appliedDelta = deltaX * 0.2;
    } else if (activePage === 1 && deltaX < 0) {
      appliedDelta = deltaX * 0.2;
    }

    setDragOffset(appliedDelta);
  };

  const endDrag = (clientX: number) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const deltaX = clientX - startXRef.current;

    // Threshold of 35px to trigger page change
    if (deltaX < -35 && activePage === 0) {
      setActivePage(1);
    } else if (deltaX > 35 && activePage === 1) {
      setActivePage(0);
    }

    setDragOffset(0);

    if (hasMovedRef.current) {
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 120);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    endDrag(e.clientX);
  };

  const handlePointerCancel = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 120);
  };

  // Trackpad horizontal wheel support
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 25) {
      if (e.deltaX > 25 && activePage === 0) {
        setActivePage(1);
      } else if (e.deltaX < -25 && activePage === 1) {
        setActivePage(0);
      }
    }
  };

  const handleTabClick = (path: string) => {
    if (hasMovedRef.current) {
      return;
    }
    navigate(path);
  };

  return (
    <div className={styles['member-layout']}>
      <header className={styles['member-layout__header']}>
        <div className={styles['member-layout__brand']}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['member-layout__logo-image']}
          />
          <span className={styles['member-layout__logo-text']}>PLATINUM CENTER</span>
        </div>
        <div className={styles['member-layout__user']}>
          <span className={styles['member-layout__user-name']}>
            {profile?.full_name || 'Miembro'}
          </span>
          <button
            type="button"
            className={styles['member-layout__logout-button']}
            onClick={() => navigate('/portal/settings')}
            aria-label="Configuración"
            title="Configuración"
          >
            <SettingOutlined />
          </button>
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

      <div className={styles['member-layout__status-bar']}>
        <GymStatus />
      </div>

      <main className={styles['member-layout__content']}>
        <Outlet />
      </main>

      <div className={styles['member-layout__tabbar-container']}>
        {/* Mobile Nav Arrow Left */}
        {activePage > 0 && (
          <button
            type="button"
            className={`${styles['member-layout__arrow-btn']} ${styles['member-layout__arrow-btn--left']}`}
            onClick={() => setActivePage(0)}
            aria-label="Página anterior"
          >
            <LeftOutlined />
          </button>
        )}

        <div
          className={styles['member-layout__slider-wrapper']}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onWheel={handleWheel}
        >
          <div
            className={styles['member-layout__slider-track']}
            style={{
              transform: `translateX(calc(-${activePage * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {navPages.map((pageGroup, pIdx) => (
              <div
                key={pIdx}
                className={styles['member-layout__page']}
                role="navigation"
                aria-label={`Página ${pIdx + 1}`}
              >
                {pageGroup.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className={`${styles['member-layout__tab']} ${
                        isActive ? styles['member-layout__tab--active'] : ''
                      }`}
                      onClick={() => handleTabClick(item.path)}
                    >
                      <div className={styles['member-layout__tab-icon-wrapper']}>
                        <span className={styles['member-layout__tab-icon']}>{item.icon}</span>
                        {item.isLocked && (
                          <span className={styles['member-layout__tab-lock-badge']}>🔒</span>
                        )}
                      </div>
                      <span className={styles['member-layout__tab-label']}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Nav Arrow Right */}
        {activePage === 0 && (
          <button
            type="button"
            className={`${styles['member-layout__arrow-btn']} ${styles['member-layout__arrow-btn--right']}`}
            onClick={() => setActivePage(1)}
            aria-label="Página siguiente"
          >
            <RightOutlined />
          </button>
        )}

        {/* Mobile Page Indicator Dots */}
        <div className={styles['member-layout__dots']}>
          <button
            type="button"
            className={`${styles['member-layout__dot']} ${activePage === 0 ? styles['member-layout__dot--active'] : ''}`}
            onClick={() => setActivePage(0)}
            aria-label="Página 1"
          />
          <button
            type="button"
            className={`${styles['member-layout__dot']} ${activePage === 1 ? styles['member-layout__dot--active'] : ''}`}
            onClick={() => setActivePage(1)}
            aria-label="Página 2"
          />
        </div>
      </div>
    </div>
  );
}

export default MemberLayout;
