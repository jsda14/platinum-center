import { useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../infrastructure/store/store';
import { logout } from '../../../infrastructure/store/authSlice';
import styles from './AdminLayout.module.css';

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children?: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/admin'),
    },
    {
      key: '/admin/members',
      icon: <UserOutlined />,
      label: 'Miembros',
      onClick: () => navigate('/admin/members'),
    },
    {
      key: '/admin/payments',
      icon: <DollarOutlined />,
      label: 'Pagos',
      onClick: () => navigate('/admin/payments'),
    },
    {
      key: '/admin/config',
      icon: <SettingOutlined />,
      label: 'Configuración',
      onClick: () => navigate('/admin/config'),
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className={styles['admin-layout']}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={styles['admin-layout__sider']}
        theme="dark"
      >
        <div className={styles['admin-layout__logo-container']}>
          <h1 className={styles['admin-layout__logo']}>
            {collapsed ? 'PC' : 'PLATINUM CENTER'}
          </h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
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
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className={styles['admin-layout__user-info']}>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  icon={!profile?.avatar_url && <UserOutlined />}
                  className={styles['admin-layout__avatar']}
                />
                <div className={styles['admin-layout__user-details']}>
                  <span className={styles['admin-layout__user-name']}>
                    {profile?.full_name || 'Usuario Admin'}
                  </span>
                  <span className={styles['admin-layout__user-role']}>
                    {profile?.role === 'super_admin' ? 'Super Admin' : 'Recepción'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className={styles['admin-layout__content']}>
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
}
