import { useState, useEffect, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TagOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { logout } from '../../../infrastructure/store/authSlice';
import styles from './AdminLayout.module.css';
import platinumLogo from '../../../assets/platinum-center-logo.png';

const { Header, Sider, Content } = Layout;

const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

interface AdminLayoutProps {
  children?: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const basePath = location.pathname.startsWith('/reception')
    ? '/reception'
    : '/admin';

  const menuItems = [
    ...(basePath === '/admin' ? [{
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/admin'),
    }] : []),
    {
      key: `${basePath}/members`,
      icon: <UserOutlined />,
      label: 'Miembros',
      onClick: () => navigate(`${basePath}/members`),
    },
    {
      key: `${basePath}/payments`,
      icon: <DollarOutlined />,
      label: 'Pagos',
      onClick: () => navigate(`${basePath}/payments`),
    },
    {
      key: `${basePath}/plans`,
      icon: <TagOutlined />,
      label: 'Planes',
      onClick: () => navigate(`${basePath}/plans`),
    },
    ...(basePath === '/admin' ? [
      {
        key: '/admin/settings',
        icon: <SettingOutlined />,
        label: 'Configuración',
        onClick: () => navigate('/admin/settings'),
      },
      {
        key: '/admin/communications',
        icon: <NotificationOutlined />,
        label: 'Comunicados',
        onClick: () => navigate('/admin/communications'),
      },
    ] : []),
  ];

  return (
    <Layout className={styles['admin-layout']}>
      {window.innerWidth < 768 && !collapsed && (
        <div 
          className={styles['admin-layout__overlay']} 
          onClick={() => setCollapsed(true)}
        />
      )}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={styles['admin-layout__sider']}
        theme="dark"
      >
        <div className={styles['admin-layout__logo-container']}>
          <img 
            src={platinumLogo} 
            alt="Platinum Center Logo" 
            className={styles['admin-layout__logo-image']}
          />
          {!collapsed && (
            <span className={styles['admin-layout__logo-text']}>
              PLATINUM CENTER
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[
            location.pathname.startsWith(`${basePath}/members`)
              ? `${basePath}/members`
              : location.pathname.startsWith(`${basePath}/payments`)
              ? `${basePath}/payments`
              : location.pathname.startsWith(`${basePath}/plans`)
              ? `${basePath}/plans`
              : location.pathname.startsWith('/admin/settings')
              ? '/admin/settings'
              : location.pathname.startsWith('/admin/communications')
              ? '/admin/communications'
              : basePath
          ]}
          items={menuItems}
          className={styles['admin-layout__menu']}
        />
      </Sider>
      <Layout className={styles['admin-layout__main']}>
        <Header className={styles['admin-layout__header']}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles['admin-layout__trigger']}
            aria-label="Alternar navegación"
          />
          <div className={styles['admin-layout__user']}>
            <Avatar
              className={styles['admin-layout__user-avatar']}
              shape="circle"
            >
              {getInitials(profile?.full_name || 'Usuario Admin')}
            </Avatar>
            <span className={styles['admin-layout__user-name']}>
              {profile?.full_name || 'Usuario Admin'}
            </span>
            <span className={styles['admin-layout__user-role']}>
              ({profile?.role === 'super_admin' ? 'Super Admin' : 'Recepción'})
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className={styles['admin-layout__logout-btn']}
              aria-label="Cerrar sesión"
            />
          </div>
        </Header>
        <Content className={styles['admin-layout__content']}>
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
}
