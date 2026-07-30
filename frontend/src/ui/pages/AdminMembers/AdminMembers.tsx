import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Modal,
  Form,
  Select,
  Input,
  Button,
  Tag,
  message,
  Empty,
  InputNumber,
  ConfigProvider,
  theme
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { useAppSelector } from '../../../infrastructure/store/store';

// Import use cases
import { getMembers } from '../../../application/admin/getMembers.usecase';
import { createMember } from '../../../application/admin/createMember.usecase';
import { getActivePlans } from '../../../application/member/getActivePlans.usecase';

// Import types
import type { MemberWithProfile } from '../../../infrastructure/supabase/admin.repository';
import type { Plan } from '../../../domain/member/member.types';

// Import CSS
import styles from './AdminMembers.module.css';

// Plan and payment values/labels mapping
const PLAN_LABELS: Record<string, string> = {
  '1_day': '1 Día',
  '15_days': '15 Días Consumibles',
  '1_month': '1 Mes',
  '1_year': '1 Año'
};

const STATUS_LABELS: Record<string, string> = {
  'active': 'Activo',
  'expired': 'Vencido',
  'suspended': 'Suspendido'
};

export function AdminMembers() {
  const navigate = useNavigate();
  const { profile } = useAppSelector(state => state.auth);
  const isSuperAdmin = profile?.role === 'super_admin';

  // Main data states
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Form hooks
  const [createForm] = Form.useForm();

  // Load members data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersData, plansData] = await Promise.all([
        getMembers(),
        getActivePlans()
      ]);
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

  // Suggestions for pricing based on chosen plan in create mode
  const handleCreatePlanChange = (val: string) => {
    const plan = activePlans.find(p => p.slug === val);
    const suggestedPrice = plan ? plan.price : 0;
    createForm.setFieldsValue({ amount: suggestedPrice });
  };

  // Pre-fill create form when opening
  useEffect(() => {
    if (isCreateModalOpen && activePlans.length > 0) {
      const defaultPlan = activePlans.find(p => p.slug === '1_month') || activePlans[0];
      createForm.setFieldsValue({
        plan: defaultPlan.slug,
        amount: defaultPlan.price,
        paymentMethod: 'cash'
      });
    }
  }, [isCreateModalOpen, activePlans, createForm]);

  // Submit handlers
  const handleCreateSubmit = async () => {
    setIsSubmitting(true);
    try {
      const values = await createForm.validateFields();
      await createMember({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        plan: values.plan,
        paymentMethod: values.paymentMethod,
        amount: values.amount
      });
      message.success('Miembro registrado y activado exitosamente');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar miembro';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering local list logic
  const filteredData = members.filter((item) => {
    const fullName = item.profiles?.full_name || '';
    const email = item.profiles?.email || '';
    const matchesSearch =
      fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      email.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Table columns definition
  const columns = [
    {
      title: 'Nombre',
      dataIndex: ['profiles', 'full_name'],
      key: 'fullName',
      render: (text: string) => <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text || 'Sin Nombre'}</span>,
    },
    {
      title: 'Email',
      dataIndex: ['profiles', 'email'],
      key: 'email',
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (val: string) => PLAN_LABELS[val] || val || <span style={{ color: 'var(--color-text-secondary)' }}>Sin Plan</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (val: 'active' | 'expired' | 'suspended') => {
        let tagClass = styles['admin-members__status-tag--active'];
        if (val === 'expired') {
          tagClass = styles['admin-members__status-tag--expired'];
        } else if (val === 'suspended') {
          tagClass = styles['admin-members__status-tag--suspended'];
        }
        return (
          <span className={`${styles['admin-members__status-tag']} ${tagClass}`}>
            {STATUS_LABELS[val] || val}
          </span>
        );
      },
    },
    {
      title: 'Vencimiento',
      dataIndex: 'end_date',
      key: 'endDate',
      render: (date: string) => date || <span style={{ color: 'var(--color-text-secondary)' }}>Sin asignar</span>,
    },
    {
      title: 'Chip Asignado',
      dataIndex: 'card_no',
      key: 'cardNo',
      render: (card: string) => card ? (
        <Tag color="blue">{card}</Tag>
      ) : (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>Sin chip</span>
      ),
    },
  ];

  // ConfigProvider overrides default Antd inputs/tables to adapt dark aesthetics cleanly
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
      {isSubmitting && <LoadingScreen message="Procesando..." />}
      <main className={styles['admin-members']} role="main">
        <header className={styles['admin-members__header']}>
          <h1 className={styles['admin-members__title']}>Gestión de Miembros</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            className={styles['admin-members__btn-create']}
            aria-label="Nuevo miembro"
          >
            Nuevo Miembro
          </Button>
        </header>

        {/* Filters Section */}
        <section className={styles['admin-members__filters']} aria-label="Filtros de búsqueda">
          <Input
            placeholder="Buscar por nombre o email..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles['admin-members__search-input']}
            allowClear
          />
          <Select
            placeholder="Filtrar por estado"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            className={styles['admin-members__status-select']}
            allowClear
          >
            <Select.Option value="">Todos los estados</Select.Option>
            <Select.Option value="active">Activos</Select.Option>
            <Select.Option value="expired">Vencidos</Select.Option>
            <Select.Option value="suspended">Suspendidos</Select.Option>
          </Select>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={loadData}
            style={{ height: '40px', borderRadius: 'var(--radius-md)' }}
            aria-label="Actualizar datos"
          >
            Recargar
          </Button>
        </section>

        {/* Main Content Area */}
        {isLoading ? (
          <div className={styles['admin-members__loading-container']} role="status" aria-live="polite">
            <div className={styles['admin-members__loading-text']}>Cargando lista de miembros...</div>
          </div>
        ) : error ? (
          <div className={styles['admin-members__error-container']} role="alert">
            <h2 className={styles['admin-members__error-title']}>Ocurrió un error</h2>
            <p className={styles['admin-members__error-text']}>{error}</p>
            <Button
              className={styles['admin-members__btn-retry']}
              onClick={loadData}
            >
              Intentar de nuevo
            </Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className={styles['admin-members__empty-container']}>
            <Empty
              description={
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  No se encontraron miembros con los filtros aplicados.
                </span>
              }
            />
            {searchText || statusFilter ? (
              <Button
                type="default"
                onClick={() => {
                  setSearchText('');
                  setStatusFilter('');
                }}
                style={{ marginTop: 'var(--space-3)' }}
              >
                Limpiar filtros
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
                className={styles['admin-members__btn-create']}
                style={{ marginTop: 'var(--space-3)' }}
              >
                Registrar primer miembro
              </Button>
            )}
          </div>
        ) : (
          <div className={styles['admin-members__table-wrapper']}>
            <Table
              dataSource={filteredData}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                position: ['bottomCenter']
              }}
              onRow={(record) => ({
                onClick: () => {
                  navigate(`/admin/members/${record.id}`);
                },
                style: { cursor: 'pointer' }
              })}
            />
          </div>
        )}

        {/* Modal: Create Member */}
        <Modal
          title="Registrar Nuevo Miembro"
          open={isCreateModalOpen}
          onOk={handleCreateSubmit}
          onCancel={() => {
            setIsCreateModalOpen(false);
            createForm.resetFields();
          }}
          okText="Registrar"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form
            form={createForm}
            layout="vertical"
            initialValues={{
              paymentMethod: 'cash'
            }}
          >
            <Form.Item
              name="fullName"
              label="Nombre Completo"
              rules={[{ required: true, message: 'El nombre es obligatorio' }]}
            >
              <Input placeholder="Ej. Juan Pérez" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'El email es obligatorio' },
                { type: 'email', message: 'Ingresa un email válido' }
              ]}
            >
              <Input placeholder="Ej. juan@gmail.com" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Teléfono"
            >
              <Input placeholder="Ej. 3001234567 (opcional)" />
            </Form.Item>

            <Form.Item
              name="plan"
              label="Plan de Membresía"
              rules={[{ required: true, message: 'Selecciona un plan' }]}
            >
              <Select onChange={handleCreatePlanChange} placeholder="Selecciona un plan">
                {activePlans.map(plan => (
                  <Select.Option key={plan.id} value={plan.slug}>
                    {plan.name} (${plan.price.toLocaleString('es-CO')})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Método de Pago"
              rules={[{ required: true, message: 'Selecciona un método de pago' }]}
            >
              <Select>
                <Select.Option value="cash">Efectivo</Select.Option>
                <Select.Option value="nequi">Nequi</Select.Option>
                <Select.Option value="daviplata">DaviPlata</Select.Option>
                <Select.Option value="bold">Bold (Tarjetas/PSE)</Select.Option>
                <Select.Option value="other">Otro</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="amount"
              label="Monto Pagado ($ COP)"
              rules={[
                { required: true, message: 'El monto es obligatorio' },
                { type: 'number', min: 0, message: 'El monto debe ser positivo' }
              ]}
            >
              <InputNumber
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                style={{ width: '100%' }}
                placeholder="Monto pagado"
              />
            </Form.Item>
          </Form>
        </Modal>


      </main>
    </ConfigProvider>
  );
}

export default AdminMembers;
