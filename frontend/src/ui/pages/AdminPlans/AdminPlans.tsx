import { useEffect, useState, useCallback } from 'react';
import {
  ConfigProvider,
  theme,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Empty,
  Space
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { z } from 'zod';

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { useAppSelector } from '../../../infrastructure/store/store';

// Import use cases
import { getPlans, updatePlan, createPlan } from '../../../application/admin/managePlans.usecase';
import type { Plan } from '../../../domain/member/member.types';

import styles from './AdminPlans.module.css';

// Price formatter helper
const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Automatic slug generator
const generateSlug = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, '_') // replace non-alphanumeric with _
    .replace(/^_+|_+$/g, ''); // trim underscores
};

// Zod Schema for Plan Validation
const planFormSchema = z.object({
  name: z.string().min(1, 'El nombre del plan es requerido'),
  price: z.coerce.number({ message: 'El precio debe ser un número' }).positive('El precio debe ser mayor a 0'),
  duration_days: z.coerce.number({ message: 'La duración debe ser un número' }).int('La duración debe ser un número entero').positive('La duración debe ser mayor a 0'),
  active: z.boolean().default(true)
});

export function AdminPlans() {
  const { profile } = useAppSelector(state => state.auth);
  const isSuperAdmin = profile?.role === 'super_admin';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form Hooks
  const [form] = Form.useForm();

  // Load Plans
  const loadPlans = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los planes';
      setError(msg);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Open modals handlers
  const openCreateModal = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      name: plan.name,
      price: plan.price,
      duration_days: plan.duration_days,
      active: plan.active
    });
    setIsModalOpen(true);
  };

  // Submit Handler (Create or Update)
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      
      // Validation with Zod
      const validation = planFormSchema.safeParse({
        name: values.name,
        price: values.price,
        duration_days: values.duration_days,
        active: !!values.active
      });

      if (!validation.success) {
        const firstErr = validation.error.issues[0]?.message || 'Datos de plan inválidos';
        message.error(firstErr);
        setIsSubmitting(false);
        return;
      }

      if (editingPlan) {
        // Update plan
        await updatePlan(editingPlan.id, {
          name: values.name,
          price: values.price,
          duration_days: values.duration_days,
          active: !!values.active
        });
        message.success('Plan actualizado exitosamente');
      } else {
        // Create plan
        const generatedSlug = generateSlug(values.name);
        await createPlan({
          name: values.name,
          slug: generatedSlug as any, // Cast to any to satisfy schema enum constraint if new slug is passed
          price: values.price,
          duration_days: values.duration_days,
          active: !!values.active
        });
        message.success('Nuevo plan creado exitosamente');
      }

      setIsModalOpen(false);
      form.resetFields();
      await loadPlans(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el plan';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando planes..." />;
  }

  if (error) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-plans__error-container']} role="alert">
          <h2 className={styles['admin-plans__error-title']}>Ocurrió un error</h2>
          <p className={styles['admin-plans__error-text']}>{error}</p>
          <Button className={styles['admin-plans__btn-retry']} onClick={() => loadPlans()}>
            Intentar de nuevo
          </Button>
        </div>
      </ConfigProvider>
    );
  }

  const columns = [
    {
      title: 'Nombre del Plan',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text}</span>
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Duración',
      dataIndex: 'duration_days',
      key: 'duration_days',
      render: (val: number) => `${val} días`
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => formatCOP(val)
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        <span className={`${styles['admin-plans__status-tag']} ${active ? styles['admin-plans__status-tag--active'] : styles['admin-plans__status-tag--inactive']}`}>
          {active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    ...(isSuperAdmin ? [
      {
        title: 'Acción',
        key: 'action',
        render: (_: unknown, record: Plan) => (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            className={styles['admin-plans__action-btn']}
            aria-label={`Editar plan ${record.name}`}
          />
        )
      }
    ] : [])
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
      {isSubmitting && <LoadingScreen message="Guardando..." />}

      <main className={styles['admin-plans']} role="main">
        <header className={styles['admin-plans__header']}>
          <h1 className={styles['admin-plans__title']}>Gestión de Planes</h1>
          <Space>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              onClick={() => loadPlans()}
              style={{ height: '42px', borderRadius: 'var(--radius-md)' }}
              aria-label="Actualizar lista de planes"
            >
              Recargar
            </Button>
            {isSuperAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
                className={styles['admin-plans__btn-create']}
                aria-label="Crear nuevo plan"
              >
                Nuevo Plan
              </Button>
            )}
          </Space>
        </header>

        {plans.length === 0 ? (
          <Empty description="No hay planes registrados en el gimnasio." />
        ) : (
          <div className={styles['admin-plans__table-wrapper']}>
            <Table
              dataSource={plans}
              columns={columns}
              rowKey="id"
              pagination={false}
            />
          </div>
        )}

        {/* Modal: Create/Edit Plan */}
        <Modal
          title={editingPlan ? 'Editar Plan de Membresía' : 'Crear Nuevo Plan de Membresía'}
          open={isModalOpen}
          onOk={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          okText={editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ active: true }}
          >
            <Form.Item
              name="name"
              label="Nombre del Plan"
              rules={[{ required: true, message: 'El nombre es obligatorio' }]}
            >
              <Input placeholder="Ej. 1 Mes VIP, Trimestral" />
            </Form.Item>

            <Form.Item
              name="price"
              label="Precio ($ COP)"
              rules={[
                { required: true, message: 'El precio es obligatorio' },
                { type: 'number', min: 0.01, message: 'El precio debe ser mayor a 0' }
              ]}
            >
              <InputNumber
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
                style={{ width: '100%' }}
                placeholder="Monto del plan"
              />
            </Form.Item>

            <Form.Item
              name="duration_days"
              label="Duración (días)"
              rules={[
                { required: true, message: 'La duración es obligatoria' },
                { type: 'number', min: 1, message: 'La duración debe ser mayor a 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Ej. 30, 365"
                precision={0}
              />
            </Form.Item>

            <Form.Item
              name="active"
              label="Estado Activo"
              valuePropName="checked"
            >
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          </Form>
        </Modal>

      </main>
    </ConfigProvider>
  );
}

export default AdminPlans;
