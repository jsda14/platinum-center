import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Tag,
  Space,
  message,
  ConfigProvider,
  theme,
  Progress,
  Table,
  InputNumber,
  Avatar
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CreditCardOutlined,
  StopOutlined,
  DollarOutlined,
  IdcardOutlined
} from '@ant-design/icons';

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { useAppSelector } from '../../../infrastructure/store/store';

// Import use cases
import { getMemberDetail } from '../../../application/admin/getMemberDetail.usecase';
import { updateMember } from '../../../application/admin/updateMember.usecase';
import { assignChip } from '../../../application/admin/assignChip.usecase';
import { registerManualPayment } from '../../../application/admin/registerManualPayment.usecase';
import { getActivePlans } from '../../../application/member/getActivePlans.usecase';

// Import repository for direct profile updates
import { adminRepository, type MemberDetail } from '../../../infrastructure/supabase/admin.repository';
import type { Plan } from '../../../domain/member/member.types';

// Import CSS Modules style
import styles from './AdminMemberDetail.module.css';

// Mappings
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

const METHOD_LABELS: Record<string, string> = {
  'cash': 'Efectivo',
  'nequi': 'Nequi',
  'daviplata': 'DaviPlata',
  'bold': 'Bold (Tarjetas/PSE)',
  'other': 'Otro'
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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

export function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAppSelector(state => state.auth);
  const isSuperAdmin = profile?.role === 'super_admin';

  // Core States
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Visibilities
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isChipModalOpen, setIsChipModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Forms hooks
  const [editForm] = Form.useForm();
  const [chipForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  // Fetch Member data
  const loadDetail = useCallback(async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const [detailData, plansData] = await Promise.all([
        getMemberDetail(id),
        getActivePlans()
      ]);
      setDetail(detailData);
      setActivePlans(plansData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el detalle del miembro';
      setError(msg);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [id, loadDetail]);

  // Pre-fill Forms when modals open
  const openEditModal = () => {
    if (!detail) return;
    editForm.setFieldsValue({
      fullName: detail.member.profiles?.full_name,
      email: detail.member.profiles?.email,
      phone: detail.member.profiles?.phone
    });
    setIsEditModalOpen(true);
  };

  const openChipModal = () => {
    if (!detail) return;
    chipForm.setFieldsValue({
      card_no: detail.member.card_no
    });
    setIsChipModalOpen(true);
  };

  const openPaymentModal = () => {
    if (activePlans.length > 0) {
      const defaultPlan = activePlans.find(p => p.slug === '1_month') || activePlans[0];
      paymentForm.setFieldsValue({
        plan: defaultPlan.slug,
        amount: defaultPlan.price,
        paymentMethod: 'cash'
      });
    }
    setIsPaymentModalOpen(true);
  };

  // Pricing Auto-Suggestion on Plan Change
  const handlePaymentPlanChange = (val: string) => {
    const plan = activePlans.find(p => p.slug === val);
    const suggestedPrice = plan ? plan.price : 0;
    paymentForm.setFieldsValue({ amount: suggestedPrice });
  };

  // Submit handlers
  const handleEditSubmit = async () => {
    if (!detail || !id) return;
    const profileId = detail.member.profile_id;
    if (!profileId) {
      message.error('El miembro no posee un perfil asociado');
      return;
    }

    setIsSubmitting(true);
    try {
      const values = await editForm.validateFields();
      await adminRepository.updateMemberInfo(id, profileId, {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone
      });
      message.success('Información de contacto actualizada exitosamente');
      setIsEditModalOpen(false);
      await loadDetail(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar perfil';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChipSubmit = async () => {
    if (!id || !detail) return;
    setIsSubmitting(true);
    try {
      const values = await chipForm.validateFields();
      await assignChip({
        member_id: id,
        card_no: values.card_no,
        full_name: detail.member.profiles?.full_name || 'Miembro',
        sn: 'AJYX215160006'
      });
      message.success('Chip RFID asignado exitosamente');
      setIsChipModalOpen(false);
      await loadDetail(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar chip';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = () => {
    if (!detail || !id) return;
    Modal.confirm({
      title: '¿Suspender membresía?',
      content: `¿Estás seguro de que deseas suspender la membresía de ${detail.member.profiles?.full_name || ''}? El acceso físico del miembro será revocado de inmediato.`,
      okText: 'Sí, suspender',
      okType: 'danger',
      cancelText: 'Cancelar',
      maskClosable: false,
      onOk: async () => {
        setIsSubmitting(true);
        try {
          await updateMember(id, { status: 'suspended' });
          message.success('Membresía suspendida con éxito');
          await loadDetail(false);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al suspender membresía';
          message.error(msg);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handlePaymentSubmit = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const values = await paymentForm.validateFields();
      await registerManualPayment({
        member_id: id,
        plan: values.plan,
        amount: values.amount,
        method: values.paymentMethod
      });
      message.success('Pago manual registrado y membresía actualizada');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      await loadDetail(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el pago';
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper calculation for remaining days
  const getDaysRemaining = (endDateStr?: string | null) => {
    if (!endDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Handle Loading
  if (isLoading) {
    return <LoadingScreen message="Cargando detalle..." />;
  }

  // Handle Error
  if (error) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-member-detail__error-container']} role="alert">
          <h2 className={styles['admin-member-detail__error-title']}>Ocurrió un error</h2>
          <p className={styles['admin-member-detail__error-text']}>{error}</p>
          <Space>
            <Button
              className={styles['admin-member-detail__back-btn']}
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/members')}
            >
              Volver a la lista
            </Button>
            <Button
              className={styles['admin-member-detail__btn-retry']}
              onClick={() => loadDetail()}
            >
              Intentar de nuevo
            </Button>
          </Space>
        </div>
      </ConfigProvider>
    );
  }

  // Handle Not Found
  if (!detail) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-member-detail__not-found-container']}>
          <h2 className={styles['admin-member-detail__not-found-title']}>Miembro no encontrado</h2>
          <p className={styles['admin-member-detail__not-found-text']}>El registro del miembro con ID especificado no existe o fue eliminado.</p>
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/members')}
            className={styles['admin-member-detail__btn--primary']}
          >
            Volver a la lista de miembros
          </Button>
        </div>
      </ConfigProvider>
    );
  }

  const { member, payments, dayPass } = detail;
  const daysRemaining = member.plan === '15_days' && dayPass
    ? dayPass.days_total - dayPass.days_used
    : getDaysRemaining(member.end_date);

  const daysLabel = member.plan === '15_days' ? 'Días Restantes (Pases)' : 'Días Restantes';

  // Payment History Table definition
  const paymentColumns = [
    {
      title: 'Fecha',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (val: string) => formatDate(val)
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (val: string) => PLAN_LABELS[val] || val || 'Sin plan'
    },
    {
      title: 'Monto',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => formatCOP(val)
    },
    {
      title: 'Método',
      dataIndex: 'method',
      key: 'method',
      render: (val: string) => {
        let color = 'default';
        if (val === 'nequi') color = 'blue';
        else if (val === 'daviplata') color = 'red';
        else if (val === 'bold') color = 'purple';
        else if (val === 'other') color = 'orange';

        return <Tag color={color}>{METHOD_LABELS[val] || val || 'Desconocido'}</Tag>;
      }
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => {
        let color = 'default';
        let label = val || 'Desconocido';
        if (val === 'confirmed') {
          color = 'success';
          label = 'Confirmado';
        } else if (val === 'pending') {
          color = 'warning';
          label = 'Pendiente';
        } else if (val === 'failed') {
          color = 'error';
          label = 'Fallido';
        }
        return <Tag color={color}>{label}</Tag>;
      }
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
      {isSubmitting && <LoadingScreen message="Procesando operación..." />}
      
      <main className={styles['admin-member-detail']} role="main">
        <header className={styles['admin-member-detail__header']}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/members')}
            className={styles['admin-member-detail__back-btn']}
            aria-label="Volver a la lista de miembros"
          >
            Volver a miembros
          </Button>
          <h1 className={styles['admin-member-detail__title']}>Detalle del Miembro</h1>
        </header>

        <section className={styles['admin-member-detail__grid']}>
          
          {/* COLUMN LEFT: Member Profile Info */}
          <div className={styles['admin-member-detail__left-col']}>
            <div className={styles['admin-member-detail__card']}>
              <div className={styles['admin-member-detail__avatar-container']}>
                <Avatar className={styles['admin-member-detail__avatar']}>
                  {getInitials(member.profiles?.full_name)}
                </Avatar>
              </div>

              <div className={styles['admin-member-detail__info-group']}>
                <div className={styles['admin-member-detail__info-item']}>
                  <span className={styles['admin-member-detail__info-label']}>Nombre completo</span>
                  <span className={styles['admin-member-detail__info-value']}>{member.profiles?.full_name || 'Sin nombre registrado'}</span>
                </div>
                <div className={styles['admin-member-detail__info-item']}>
                  <span className={styles['admin-member-detail__info-label']}>Email</span>
                  <span className={styles['admin-member-detail__info-value']}>{member.profiles?.email || 'Sin email registrado'}</span>
                </div>
                <div className={styles['admin-member-detail__info-item']}>
                  <span className={styles['admin-member-detail__info-label']}>Teléfono</span>
                  <span className={styles['admin-member-detail__info-value']}>{member.profiles?.phone || 'Sin teléfono'}</span>
                </div>
                
                {isSuperAdmin && (
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={openEditModal}
                    className={styles['admin-member-detail__btn']}
                    aria-label="Editar información de contacto"
                  >
                    Editar información
                  </Button>
                )}
              </div>

              {/* RFID Chip Section */}
              <div className={styles['admin-member-detail__chip-section']}>
                <span className={styles['admin-member-detail__info-label']}>Tarjeta RFID (Chip)</span>
                {member.card_no ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className={styles['admin-member-detail__chip-badge']}>
                      <IdcardOutlined style={{ marginRight: '6px' }} />
                      Card No: {member.card_no}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      PIN Torniquete: {member.zkteco_user_id || 'Sin PIN'}
                    </span>
                  </div>
                ) : (
                  <span className={`${styles['admin-member-detail__chip-badge']} ${styles['admin-member-detail__chip-badge--unassigned']}`}>
                    Sin chip asignado
                  </span>
                )}
                
                <Button
                  type="default"
                  icon={<CreditCardOutlined style={{ color: 'var(--color-accent)' }} />}
                  onClick={openChipModal}
                  className={`${styles['admin-member-detail__btn']} ${styles['admin-member-detail__btn--accent']}`}
                  aria-label={member.card_no ? "Cambiar tarjeta RFID" : "Asignar tarjeta RFID"}
                >
                  {member.card_no ? 'Cambiar chip' : 'Asignar chip'}
                </Button>
              </div>

              {/* Actions Section */}
              <div className={styles['admin-member-detail__actions']}>
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={openPaymentModal}
                  className={`${styles['admin-member-detail__btn']} ${styles['admin-member-detail__btn--primary']}`}
                  aria-label="Registrar un pago manual"
                >
                  Registrar pago
                </Button>

                {member.status !== 'suspended' && (
                  <Button
                    type="default"
                    danger
                    icon={<StopOutlined />}
                    onClick={handleSuspend}
                    className={`${styles['admin-member-detail__btn']} ${styles['admin-member-detail__btn--danger']}`}
                    aria-label="Suspender membresía del miembro"
                  >
                    Suspender membresía
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN RIGHT: Membership State and Payment History */}
          <div className={styles['admin-member-detail__right-col']} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Membership Details Card */}
            <div className={styles['admin-member-detail__card']}>
              <div className={styles['admin-member-detail__status-section']}>
                <h2 className={styles['admin-member-detail__card-title']} style={{ borderBottom: 'none', paddingBottom: 0 }}>Membresía Actual</h2>
                
                <span className={`${styles['admin-member-detail__status-tag']} ${styles[`admin-member-detail__status-tag--${member.status}`]}`}>
                  {STATUS_LABELS[member.status] || member.status}
                </span>
              </div>

              <div className={styles['admin-member-detail__days-display']}>
                <span className={styles['admin-member-detail__days-number']}>{daysRemaining}</span>
                <span className={styles['admin-member-detail__days-label']}>{daysLabel}</span>
              </div>

              {member.plan === '15_days' && dayPass && (
                <div className={styles['admin-member-detail__progress-container']}>
                  <div className={styles['admin-member-detail__progress-label']}>
                    <span>Días consumidos</span>
                    <span className={styles['admin-member-detail__progress-text']}>{dayPass.days_used} / 15</span>
                  </div>
                  <Progress
                    percent={Math.round((dayPass.days_used / 15) * 100)}
                    strokeColor="var(--color-primary)"
                    trailColor="var(--color-border)"
                    showInfo={false}
                    status={dayPass.days_used >= 15 ? "exception" : "normal"}
                  />
                </div>
              )}

              <div className={styles['admin-member-detail__membership-details']}>
                <div className={styles['admin-member-detail__membership-row']}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Plan actual</span>
                  <span style={{ fontWeight: 500 }}>{PLAN_LABELS[member.plan || ''] || member.plan || 'Sin plan'}</span>
                </div>
                <div className={styles['admin-member-detail__membership-row']}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Fecha de inicio</span>
                  <span>{formatDate(member.start_date)}</span>
                </div>
                <div className={styles['admin-member-detail__membership-row']}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Fecha de vencimiento</span>
                  <span>{formatDate(member.end_date)}</span>
                </div>
              </div>
            </div>

            {/* Payment History Card */}
            <div className={styles['admin-member-detail__card']}>
              <h2 className={styles['admin-member-detail__card-title']}>Historial de Pagos</h2>
              
              <div className={styles['admin-member-detail__payments-table-wrapper']}>
                <Table
                  dataSource={payments}
                  columns={paymentColumns}
                  rowKey="id"
                  pagination={payments.length > 5 ? { pageSize: 5, showSizeChanger: false, position: ['bottomCenter'] } : false}
                  locale={{ emptyText: 'No hay pagos registrados para este miembro' }}
                />
              </div>
            </div>

          </div>
        </section>

        {/* MODAL: Edit Profile Information */}
        <Modal
          title="Editar Información de Miembro"
          open={isEditModalOpen}
          onOk={handleEditSubmit}
          onCancel={() => setIsEditModalOpen(false)}
          okText="Guardar"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form form={editForm} layout="vertical">
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

            <Form.Item name="phone" label="Teléfono">
              <Input placeholder="Ej. 3001234567" />
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL: Assign/Change RFID Chip */}
        <Modal
          title={member.card_no ? "Cambiar Chip RFID" : "Asignar Chip RFID"}
          open={isChipModalOpen}
          onOk={handleChipSubmit}
          onCancel={() => setIsChipModalOpen(false)}
          okText="Asignar"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form form={chipForm} layout="vertical">
            <Form.Item
              name="card_no"
              label="Número de Tarjeta RFID (Chip)"
              rules={[{ required: true, message: 'El número de tarjeta es obligatorio' }]}
            >
              <Input placeholder="Ej. 1234567890" allowClear />
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL: Register Manual Payment */}
        <Modal
          title="Registrar Pago Manual"
          open={isPaymentModalOpen}
          onOk={handlePaymentSubmit}
          onCancel={() => setIsPaymentModalOpen(false)}
          okText="Registrar Pago"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form form={paymentForm} layout="vertical">
            <Form.Item
              name="plan"
              label="Plan de Membresía"
              rules={[{ required: true, message: 'Selecciona un plan' }]}
            >
              <Select onChange={handlePaymentPlanChange} placeholder="Selecciona un plan">
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

export default AdminMemberDetail;
