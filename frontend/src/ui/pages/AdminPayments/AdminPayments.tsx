import { useEffect, useState } from 'react';
import {
  Table,
  Modal,
  Form,
  Select,
  Button,
  Tag,
  message,
  Empty,
  InputNumber,
  ConfigProvider,
  theme,
  Input
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { adminRepository, type MemberWithProfile } from '../../../infrastructure/supabase/admin.repository';
import { registerManualPayment } from '../../../application/admin/registerManualPayment.usecase';
import { getActivePlans } from '../../../application/member/getActivePlans.usecase';
import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import type { Plan, Payment } from '../../../domain/member/member.types';
import styles from './AdminPayments.module.css';

// Methods and status mapping
const METHOD_LABELS: Record<string, string> = {
  'cash': 'Efectivo',
  'nequi': 'Nequi',
  'daviplata': 'DaviPlata',
  'bold': 'Bold (Online)',
  'other': 'Otro'
};

const PLAN_LABELS: Record<string, string> = {
  '1_day': '1 Día',
  '15_days': '15 Días Consumibles',
  '1_month': '1 Mes',
  '1_year': '1 Año'
};

export function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  
  // Loading & submit states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(''); // 'today', 'week', 'month'

  // Modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerForm] = Form.useForm();

  // Success details modal
  const [successPayment, setSuccessPayment] = useState<Payment | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paymentsData, membersData, plansData] = await Promise.all([
        adminRepository.getPayments(),
        adminRepository.getMembers(),
        getActivePlans()
      ]);
      setPayments(paymentsData);
      setMembers(membersData);
      setActivePlans(plansData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanChange = (val: string) => {
    const plan = activePlans.find(p => p.slug === val);
    const price = plan ? plan.price : 0;
    registerForm.setFieldsValue({ amount: price });
  };

  const handleRegisterSubmit = async () => {
    setIsSubmitting(true);
    try {
      const values = await registerForm.validateFields();
      
      const paymentResult = await registerManualPayment({
        member_id: values.member_id,
        plan: values.plan,
        amount: values.amount,
        method: values.method,
        notes: values.notes
      });

      message.success('Pago manual registrado con éxito');
      setSuccessPayment(paymentResult);
      setIsRegisterModalOpen(false);
      registerForm.resetFields();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el pago';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Local filtering logic
  const filteredPayments = payments.filter((payment) => {
    // 1. Method filter
    if (methodFilter && payment.method !== methodFilter) {
      return false;
    }

    // 2. Date filter
    if (dateFilter) {
      const paymentDate = new Date(payment.payment_date);
      const today = new Date();

      if (dateFilter === 'today') {
        return paymentDate.toDateString() === today.toDateString();
      }

      if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        return paymentDate >= oneWeekAgo;
      }

      if (dateFilter === 'month') {
        return (
          paymentDate.getMonth() === today.getMonth() &&
          paymentDate.getFullYear() === today.getFullYear()
        );
      }
    }

    return true;
  });

  const columns = [
    {
      title: 'Miembro',
      dataIndex: ['members', 'profiles', 'full_name'],
      key: 'member_name',
      render: (_: any, record: any) => {
        const profile = record.members?.profiles;
        return (
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {profile?.full_name || 'Sin nombre'}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {profile?.email || 'Sin correo'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (val: string) => PLAN_LABELS[val] || val
    },
    {
      title: 'Monto COP',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `$ ${val.toLocaleString('es-CO')}`
    },
    {
      title: 'Método',
      dataIndex: 'method',
      key: 'method',
      render: (val: string) => METHOD_LABELS[val] || val
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'confirmed') color = 'success';
        if (status === 'pending') color = 'warning';
        if (status === 'failed') color = 'error';

        const tagText = status === 'confirmed' ? 'Confirmado'
                    : status === 'pending' ? 'Pendiente'
                    : 'Fallido';

        return (
          <Tag color={color} style={{ fontWeight: 500 }}>
            {tagText.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: 'Fecha de Registro',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (val: string) => new Date(val).toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
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
      {isSubmitting && <LoadingScreen message="Procesando registro..." />}
      <main className={styles['admin-payments']} role="main">
        <header className={styles['admin-payments__header']}>
          <h1 className={styles['admin-payments__title']}>Registro de Pagos</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsRegisterModalOpen(true)}
            className={styles['admin-payments__btn-register']}
          >
            Registrar Pago Manual
          </Button>
        </header>

        {/* Filters */}
        <section className={styles['admin-payments__filters']} aria-label="Filtros de pagos">
          <Select
            placeholder="Filtrar por método"
            value={methodFilter}
            onChange={(val) => setMethodFilter(val)}
            className={styles['admin-payments__filter-select']}
            allowClear
          >
            <Select.Option value="">Todos los métodos</Select.Option>
            <Select.Option value="cash">Efectivo</Select.Option>
            <Select.Option value="nequi">Nequi</Select.Option>
            <Select.Option value="daviplata">DaviPlata</Select.Option>
            <Select.Option value="bold">Bold (Online)</Select.Option>
            <Select.Option value="other">Otro</Select.Option>
          </Select>

          <Select
            placeholder="Filtrar por fecha"
            value={dateFilter}
            onChange={(val) => setDateFilter(val)}
            className={styles['admin-payments__filter-select']}
            allowClear
          >
            <Select.Option value="">Todas las fechas</Select.Option>
            <Select.Option value="today">Hoy</Select.Option>
            <Select.Option value="week">Últimos 7 días</Select.Option>
            <Select.Option value="month">Este mes</Select.Option>
          </Select>

          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={loadData}
            disabled={isLoading}
          >
            Refrescar
          </Button>
        </section>

        {/* Table */}
        {isLoading ? (
          <div className={styles['admin-payments__loading-container']} role="status" aria-live="polite">
            <div className={styles['admin-payments__loading-text']}>Cargando lista de pagos...</div>
          </div>
        ) : error ? (
          <div className={styles['admin-payments__error-container']} role="alert">
            <h2 className={styles['admin-payments__error-title']}>Ocurrió un error</h2>
            <p className={styles['admin-payments__error-text']}>{error}</p>
            <Button className={styles['admin-payments__btn-retry']} onClick={loadData}>
              Intentar de nuevo
            </Button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className={styles['admin-payments__empty-container']}>
            <Empty description={<span style={{ color: 'var(--color-text-secondary)' }}>No se registraron pagos con los filtros seleccionados.</span>} />
          </div>
        ) : (
          <div className={styles['admin-payments__table-wrapper']}>
            <Table
              dataSource={filteredPayments}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                position: ['bottomCenter']
              }}
            />
          </div>
        )}

        {/* Modal: Register Manual Payment */}
        <Modal
          title="Registrar Pago Manual"
          open={isRegisterModalOpen}
          onOk={handleRegisterSubmit}
          onCancel={() => {
            setIsRegisterModalOpen(false);
            registerForm.resetFields();
          }}
          okText="Registrar"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form form={registerForm} layout="vertical">
            <Form.Item
              name="member_id"
              label="Buscar Miembro"
              rules={[{ required: true, message: 'Selecciona un miembro' }]}
            >
              <Select
                showSearch
                placeholder="Buscar por nombre o email..."
                optionFilterProp="label"
                options={members.map((m) => ({
                  value: m.id,
                  label: `${m.profiles?.full_name || 'Sin nombre'} (${m.profiles?.email || 'sin email'})`
                }))}
              />
            </Form.Item>

            <Form.Item
              name="plan"
              label="Plan Adquirido"
              rules={[{ required: true, message: 'Selecciona un plan' }]}
            >
              <Select placeholder="Selecciona un plan" onChange={handlePlanChange}>
                {activePlans.map((plan) => (
                  <Select.Option key={plan.id} value={plan.slug}>
                    {plan.name} (${plan.price.toLocaleString('es-CO')})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="amount"
              label="Monto Recibido ($ COP)"
              rules={[
                { required: true, message: 'Ingresa el monto' },
                { type: 'number', min: 0, message: 'El monto debe ser positivo' }
              ]}
            >
              <InputNumber
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0)}
                style={{ width: '100%' }}
                placeholder="Monto"
              />
            </Form.Item>

            <Form.Item
              name="method"
              label="Método de Pago"
              rules={[{ required: true, message: 'Selecciona el método de pago' }]}
            >
              <Select placeholder="Selecciona método">
                <Select.Option value="cash">Efectivo</Select.Option>
                <Select.Option value="nequi">Nequi</Select.Option>
                <Select.Option value="daviplata">DaviPlata</Select.Option>
                <Select.Option value="other">Otro</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="notes" label="Notas / Observación (Opcional)">
              <Input.TextArea placeholder="Notas adicionales del pago..." rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal: Success Details (Nueva fecha de vencimiento) */}
        <Modal
          title={<span style={{ color: 'var(--color-status-active)' }}>✓ Pago Manual Registrado Exitosamente</span>}
          open={!!successPayment}
          onOk={() => setSuccessPayment(null)}
          onCancel={() => setSuccessPayment(null)}
          footer={[
            <Button key="ok" type="primary" onClick={() => setSuccessPayment(null)}>
              Entendido
            </Button>
          ]}
          maskClosable={false}
          centered
          width={450}
        >
          {successPayment && (
            <div>
              <p>El pago de la membresía ha sido confirmado y procesado con éxito en el sistema.</p>
              <div className={styles['admin-payments__success-details']}>
                <p style={{ margin: '4px 0' }}>
                  <strong>Monto:</strong> $ {successPayment.amount.toLocaleString('es-CO')}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Plan:</strong> {PLAN_LABELS[successPayment.plan || ''] || successPayment.plan}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Inicio de Vigencia:</strong> {successPayment.plan_start_date ? new Date(successPayment.plan_start_date).toLocaleDateString('es-CO') : 'Inmediato'}
                </p>
                <p style={{ margin: '4px 0', fontSize: '15px', color: 'var(--color-accent)' }}>
                  <strong>Nueva Fecha de Vencimiento:</strong> {successPayment.plan_end_date ? new Date(successPayment.plan_end_date).toLocaleDateString('es-CO') : 'No especificada'}
                </p>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </ConfigProvider>
  );
}

export default AdminPayments;
