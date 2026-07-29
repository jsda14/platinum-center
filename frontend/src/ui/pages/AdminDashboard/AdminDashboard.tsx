import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ConfigProvider,
  theme,
  Button,
  Tag,
  Table,
  Empty
} from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  WarningOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { supabase } from '../../../infrastructure/supabase/client';
import { getDashboardMetrics } from '../../../application/admin/getDashboardMetrics.usecase';
import type { DashboardMetrics } from '../../../infrastructure/supabase/admin.repository';

import styles from './AdminDashboard.module.css';

// Mappings & Constants
const PLAN_LABELS: Record<string, string> = {
  '1_day': '1 Día',
  '15_days': '15 Días Consumibles',
  '1_month': '1 Mes',
  '1_year': '1 Año'
};

const METHOD_LABELS: Record<string, string> = {
  'cash': 'Efectivo',
  'nequi': 'Nequi',
  'daviplata': 'DaviPlata',
  'bold': 'Bold (Tarjetas/PSE)',
  'other': 'Otro'
};

const PLAN_COLORS = [
  '#C41E3A', // primary
  '#D4A017', // accent
  '#22C55E', // status-active
  '#F59E0B'  // status-warning
];

const METHOD_COLORS: Record<string, string> = {
  cash: '#A0A0A0',      // gris
  nequi: '#3B82F6',     // azul
  daviplata: '#EF4444', // rojo
  bold: '#8B5CF6',      // morado
  other: '#F59E0B'      // naranja
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Sin fecha';
  return dateStr.split('T')[0];
};

const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Metrics
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const metrics = await getDashboardMetrics();
      setData(metrics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar métricas del dashboard';
      setError(msg);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);

    // Supabase Realtime subscription for live metrics
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        loadData(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  if (isLoading) {
    return <LoadingScreen message="Cargando métricas..." />;
  }

  if (error) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-dashboard__error-container']} style={{ textAlign: 'center', padding: '40px' }} role="alert">
          <h2 style={{ color: 'var(--color-status-expired)', fontFamily: 'var(--font-display)' }}>Error al cargar dashboard</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
          <Button type="primary" onClick={() => loadData(true)}>
            Reintentar
          </Button>
        </div>
      </ConfigProvider>
    );
  }

  if (!data) return null;

  // Table Columns for Row 3: Expiring Members
  const expiringColumns = [
    {
      title: 'Nombre',
      dataIndex: ['profiles', 'full_name'],
      key: 'fullName',
      render: (text: string) => <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text || 'Sin Nombre'}</span>
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (val: string) => PLAN_LABELS[val] || val || 'Sin Plan'
    },
    {
      title: 'Vence',
      dataIndex: 'end_date',
      key: 'endDate',
      render: (val: string) => formatDate(val)
    },
    {
      title: 'Acción',
      key: 'action',
      render: () => (
        <Button
          type="primary"
          className={styles['admin-dashboard__table-action-btn']}
          onClick={() => navigate(`/admin/payments`)}
          size="small"
        >
          Registrar
        </Button>
      )
    }
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#C41E3A',
          colorBgBase: '#1A1A1A',
          colorBgContainer: '#242424',
          colorBorder: '#3A3A3A',
          colorTextBase: '#FFFFFF',
          borderRadius: 8
        },
      }}
    >
      <main className={styles['admin-dashboard']} role="main">
        <header className={styles['admin-dashboard__header']}>
          <h1 className={styles['admin-dashboard__title']}>Dashboard de Control</h1>
        </header>

        {/* ROW 1: Summary Cards */}
        <section className={styles['admin-dashboard__summary-grid']} aria-label="Métricas de resumen">
          <div className={styles['dashboard-card']} style={{ '--card-color': 'var(--color-primary)' } as React.CSSProperties}>
            <div className={styles['dashboard-card__content']}>
              <span className={styles['dashboard-card__title']}>Miembros Activos</span>
              <span className={styles['dashboard-card__value']}>{data.totalActiveMembers}</span>
            </div>
            <div className={styles['dashboard-card__icon']}>
              <TeamOutlined />
            </div>
          </div>

          <div className={styles['dashboard-card']} style={{ '--card-color': 'var(--color-accent)' } as React.CSSProperties}>
            <div className={styles['dashboard-card__content']}>
              <span className={styles['dashboard-card__title']}>Ingresos del Mes</span>
              <span className={styles['dashboard-card__value']}>{formatCOP(data.monthlyRevenue)}</span>
            </div>
            <div className={styles['dashboard-card__icon']}>
              <DollarOutlined />
            </div>
          </div>

          <div className={styles['dashboard-card']} style={{ '--card-color': 'var(--color-status-warning)' } as React.CSSProperties}>
            <div className={styles['dashboard-card__content']}>
              <span className={styles['dashboard-card__title']}>Vence en 7 días</span>
              <span className={styles['dashboard-card__value']}>{data.expiringThisWeek.length}</span>
            </div>
            <div className={styles['dashboard-card__icon']}>
              <WarningOutlined />
            </div>
          </div>

          <div className={styles['dashboard-card']} style={{ '--card-color': 'var(--color-status-active)' } as React.CSSProperties}>
            <div className={styles['dashboard-card__content']}>
              <span className={styles['dashboard-card__title']}>Nuevos este Mes</span>
              <span className={styles['dashboard-card__value']}>{data.newMembersThisMonth}</span>
            </div>
            <div className={styles['dashboard-card__icon']}>
              <UserAddOutlined />
            </div>
          </div>
        </section>

        {/* ROW 2: Charts */}
        <section className={styles['admin-dashboard__charts-grid']} aria-label="Gráficas de métricas">
          
          {/* Monthly Revenue BarChart */}
          <div className={styles['chart-card']}>
            <h2 className={styles['chart-card__title']}>Ingresos Mensuales</h2>
            <div className={styles['chart-card__container']}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.revenueByMonth}>
                  <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2E2E2E', borderColor: '#3A3A3A', borderRadius: '8px' }}
                    labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--color-primary)' }}
                    formatter={(val) => [formatCOP(Number(val)), 'Ingreso']}
                  />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution PieChart */}
          <div className={styles['chart-card']}>
            <h2 className={styles['chart-card__title']}>Distribución de Planes</h2>
            <div className={styles['chart-card__container']}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.planDistribution.filter(p => p.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.planDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2E2E2E', borderColor: '#3A3A3A', borderRadius: '8px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Distribution PieChart */}
          <div className={styles['chart-card']}>
            <h2 className={styles['chart-card__title']}>Métodos de Pago</h2>
            <div className={styles['chart-card__container']}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.paymentMethodDistribution.filter(p => p.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.paymentMethodDistribution.map((entry) => (
                      <Cell key={`cell-${entry.method}`} fill={METHOD_COLORS[entry.method] || '#FFFFFF'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#2E2E2E', borderColor: '#3A3A3A', borderRadius: '8px' }}
                    itemStyle={{ color: '#FFFFFF' }}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ROW 3: Alert Lists */}
        <section className={styles['admin-dashboard__alerts-grid']} aria-label="Tablas y alertas operativas">
          
          {/* Expiring Soon Table */}
          <div className={styles['alert-card']}>
            <h2 className={styles['alert-card__title']}>Próximos a vencer (7 días)</h2>
            <div className={styles['admin-dashboard__table-wrapper']}>
              <Table
                dataSource={data.expiringThisWeek}
                columns={expiringColumns}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin vencimientos cercanos" /> }}
                size="small"
              />
            </div>
          </div>

          {/* Members Without RFID Chip */}
          <div className={styles['alert-card']}>
            <h2 className={styles['alert-card__title']}>Miembros Activos sin Chip</h2>
            {data.membersWithoutChip.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Todos los miembros activos tienen chip" />
            ) : (
              <ul className={styles['dashboard-list']}>
                {data.membersWithoutChip.slice(0, 5).map(member => (
                  <li key={member.id} className={styles['dashboard-list__item']}>
                    <div className={styles['dashboard-list__content']}>
                      <span className={styles['dashboard-list__primary']}>{member.profiles?.full_name}</span>
                      <span className={styles['dashboard-list__secondary']}>{member.profiles?.email}</span>
                    </div>
                    <Button
                      type="default"
                      className={styles['dashboard-list__action-btn']}
                      onClick={() => navigate(`/admin/members/${member.id}`)}
                      size="small"
                    >
                      Asignar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Payments Log */}
          <div className={styles['alert-card']}>
            <h2 className={styles['alert-card__title']}>Últimos 5 pagos</h2>
            {data.recentPayments.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay pagos recientes" />
            ) : (
              <ul className={styles['dashboard-list']}>
                {data.recentPayments.map(payment => {
                  let methodColor = 'default';
                  if (payment.method === 'nequi') methodColor = 'blue';
                  else if (payment.method === 'daviplata') methodColor = 'red';
                  else if (payment.method === 'bold') methodColor = 'purple';
                  else if (payment.method === 'other') methodColor = 'orange';

                  return (
                    <li key={payment.id} className={styles['dashboard-list__item']}>
                      <div className={styles['dashboard-list__content']}>
                        <span className={styles['dashboard-list__primary']}>
                          {payment.members?.profiles?.full_name || 'Miembro Registrado'}
                        </span>
                        <span className={styles['dashboard-list__secondary']}>
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-status-active)', fontSize: 'var(--font-size-sm)' }}>
                          {formatCOP(payment.amount)}
                        </span>
                        <Tag color={methodColor} style={{ marginRight: 0, fontSize: '10px', padding: '0 4px', lineHeight: '14px' }}>
                          {METHOD_LABELS[payment.method] || payment.method}
                        </Tag>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </ConfigProvider>
  );
}

export default AdminDashboard;
