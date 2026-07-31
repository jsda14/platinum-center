import { useEffect, useState, useCallback } from 'react';
import {
  ConfigProvider,
  theme,
  Form,
  Input,
  Select,
  Button,
  Table,
  Card,
  Modal,
  Tag,
  message,
  DatePicker,
  TimePicker
} from 'antd';
import {
  SendOutlined,
  EyeOutlined,
  HistoryOutlined,
  ReloadOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import {
  getCommunicationsHistory,
  sendBulkCommunication
} from '../../../application/admin/manageCommunications.usecase';
import LockedFeature from '@/ui/components/LockedFeature/LockedFeature';
import styles from './AdminCommunications.module.css';

const RECIPIENT_LABELS: Record<string, string> = {
  all: 'Todos los miembros',
  active: 'Miembros activos',
  expired: 'Miembros vencidos',
  expiring_soon: 'Próximos a vencer (7 días)'
};

const RECIPIENT_COLORS: Record<string, string> = {
  all: 'blue',
  active: 'green',
  expired: 'red',
  expiring_soon: 'orange'
};

export function AdminCommunications() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [previewBody, setPreviewBody] = useState<string>('');
  const [previewRecipient, setPreviewRecipient] = useState<string>('all');

  const [form] = Form.useForm();
  const bodyText = Form.useWatch('body', form) || '';

  const loadHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getCommunicationsHistory();
      setHistory(data);
    } catch (err: unknown) {
      console.error(err);
      setError('Error al cargar el historial de comunicados');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenPreview = async () => {
    try {
      const values = await form.validateFields();
      setPreviewSubject(values.subject);
      setPreviewBody(values.body);
      setPreviewRecipient(values.recipient_type);
      setIsPreviewOpen(true);
    } catch {
      message.error('Por favor completa el asunto y el cuerpo del mensaje antes de previsualizar');
    }
  };

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      
      Modal.confirm({
        title: '¿Confirmar envío masivo?',
        content: `Vas a enviar este comunicado a: ${RECIPIENT_LABELS[values.recipient_type]}. Esta acción no se puede deshacer.`,
        okText: 'Enviar ahora',
        cancelText: 'Cancelar',
        okButtonProps: { danger: false },
        maskClosable: false,
        onOk: async () => {
          setIsSubmitting(true);
          try {
            const result = await sendBulkCommunication(
              values.subject,
              values.body,
              values.recipient_type
            );
            
            message.success(`Comunicado enviado exitosamente a ${result.recipients_count || 0} destinatarios`);
            form.resetFields();
            setIsPreviewOpen(false);
            await loadHistory(false);
          } catch (err: any) {
            console.error(err);
            message.error(err.message || 'Ocurrió un error al enviar el comunicado');
          } finally {
            setIsSubmitting(false);
          }
        }
      });
    } catch {
      message.error('Completa todos los campos obligatorios antes de enviar');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando panel de comunicados..." />;
  }

  if (error) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-comm__error-container']} role="alert">
          <h2 className={styles['admin-comm__error-title']}>Ocurrió un error</h2>
          <p className={styles['admin-comm__error-text']}>{error}</p>
          <Button className={styles['admin-comm__btn-retry']} onClick={() => loadHistory()}>
            Intentar de nuevo
          </Button>
        </div>
      </ConfigProvider>
    );
  }

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'sent_at',
      key: 'sent_at',
      width: '20%',
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Asunto',
      dataIndex: 'subject',
      key: 'subject',
      width: '35%',
      render: (text: string) => <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{text}</span>
    },
    {
      title: 'Destinatarios',
      dataIndex: 'recipient_type',
      key: 'recipient_type',
      width: '20%',
      render: (type: string) => (
        <Tag color={RECIPIENT_COLORS[type] || 'default'}>
          {RECIPIENT_LABELS[type] || type}
        </Tag>
      )
    },
    {
      title: 'Enviados',
      dataIndex: 'recipients_count',
      key: 'recipients_count',
      width: '10%',
      render: (count: number) => <span style={{ fontWeight: 600 }}>{count}</span>
    },
    {
      title: 'Remitente',
      dataIndex: ['sent_by_profile', 'full_name'],
      key: 'sender',
      width: '15%',
      render: (val: string) => val || 'Sistema'
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
        }
      }}
    >
      {isSubmitting && <LoadingScreen message="Enviando comunicado masivo..." />}

      <main className={styles['admin-comm']} role="main">
        <header className={styles['admin-comm__header']}>
          <h1 className={styles['admin-comm__title']}>Comunicados Masivos</h1>
        </header>

        <div className={styles['admin-comm__grid']}>
          {/* Section: Redactar */}
          <Card className={styles['admin-comm__card']} title="Redactar Comunicado">
            <Form form={form} layout="vertical" initialValues={{ recipient_type: 'all' }}>
              <Form.Item
                name="subject"
                label="Asunto del mensaje"
                rules={[{ required: true, message: 'El asunto es obligatorio' }]}
              >
                <Input placeholder="Ej. ¡Mantenimiento de torniquetes programado!" />
              </Form.Item>

              <Form.Item
                name="recipient_type"
                label="Destinatarios"
                rules={[{ required: true, message: 'Selecciona los destinatarios' }]}
              >
                <Select
                  suffixIcon={<UsergroupAddOutlined />}
                  options={[
                    { label: 'Todos los miembros', value: 'all' },
                    { label: 'Solo miembros activos', value: 'active' },
                    { label: 'Solo miembros vencidos', value: 'expired' },
                    { label: 'Solo miembros próximos a vencer (7 días)', value: 'expiring_soon' }
                  ]}
                />
              </Form.Item>

              <LockedFeature.Section
                title="Programar comunicado"
                description="Programa tus comunicados para que se envíen automáticamente en la fecha y hora que elijas."
                blur={false}
              >
                <div className={styles['admin-comm__schedule-container']}>
                  <Form.Item label="Fecha de envío" className={styles['admin-comm__schedule-item']}>
                    <DatePicker disabled placeholder="Seleccionar fecha" className={styles['admin-comm__full-width']} />
                  </Form.Item>
                  <Form.Item label="Hora de envío" className={styles['admin-comm__schedule-item']}>
                    <TimePicker disabled placeholder="Seleccionar hora" format="HH:mm" className={styles['admin-comm__full-width']} />
                  </Form.Item>
                </div>
              </LockedFeature.Section>

              <Form.Item
                name="body"
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Cuerpo del mensaje</span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                      {bodyText.length} / 1000 caracteres
                    </span>
                  </div>
                }
                rules={[
                  { required: true, message: 'El cuerpo del mensaje es obligatorio' },
                  { max: 1000, message: 'El límite es de 1000 caracteres' }
                ]}
              >
                <Input.TextArea
                  rows={6}
                  maxLength={1000}
                  placeholder="Redacta el mensaje del comunicado. Se enviará con el diseño oficial de Platinum Center."
                />
              </Form.Item>

              <div className={styles['admin-comm__actions']}>
                <Button
                  icon={<EyeOutlined />}
                  onClick={handleOpenPreview}
                  className={styles['admin-comm__preview-btn']}
                >
                  Previsualizar
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  className={styles['admin-comm__send-btn']}
                >
                  Enviar Comunicado
                </Button>
              </div>
            </Form>
          </Card>

          {/* Section: Historial */}
          <Card
            className={styles['admin-comm__card']}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>
                  <HistoryOutlined /> Historial de Envíos
                </span>
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={() => loadHistory(false)}
                  aria-label="Actualizar historial"
                />
              </div>
            }
          >
            <div className={styles['admin-comm__table-wrapper']}>
              <Table
                dataSource={history}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </div>
          </Card>
        </div>

        {/* Modal: Preview del Email */}
        <Modal
          title="Vista previa del Comunicado"
          open={isPreviewOpen}
          onOk={handleSend}
          onCancel={() => setIsPreviewOpen(false)}
          okText="Confirmar y Enviar"
          cancelText="Cerrar Vista Previa"
          width={650}
          maskClosable={false}
        >
          <div className={styles['admin-comm__preview-meta']}>
            <strong>Destinatarios:</strong> {RECIPIENT_LABELS[previewRecipient]}
          </div>

          <div className={styles['admin-comm__email-template']}>
            {/* Header banner */}
            <div className={styles['admin-comm__email-header']}>
              <div className={styles['admin-comm__email-brand']}>PLATINUM CENTER</div>
              <div className={styles['admin-comm__email-tagline']}>Comunicado Oficial 📢</div>
            </div>

            {/* Content area */}
            <div className={styles['admin-comm__email-body']}>
              <h2 className={styles['admin-comm__email-subject']}>{previewSubject}</h2>
              <div className={styles['admin-comm__email-text']}>
                {previewBody.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={styles['admin-comm__email-footer']}>
              <p>Has recibido este correo como miembro de Gimnasio Platinum Center.</p>
              <p>Soporte y contacto: +57 300 123 4567 | info@platinumcenter.com</p>
              <p>© 2026 Platinum Center. Todos los derechos reservados.</p>
            </div>
          </div>
        </Modal>

      </main>
    </ConfigProvider>
  );
}

export default AdminCommunications;
