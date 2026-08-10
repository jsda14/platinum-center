import { useEffect, useState, useCallback, useContext } from 'react';
import {
  ConfigProvider,
  theme,
  Tabs,
  Form,
  Input,
  Button,
  TimePicker,
  Table,
  InputNumber,
  Switch,
  Upload,
  message,
  Modal,
  Space,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  BgColorsOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import type { UploadProps } from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';

type UploadRequestOption = Parameters<NonNullable<UploadProps['customRequest']>>[0];

import { LoadingScreen } from '../../components/LoadingScreen/LoadingScreen';
import { supabase } from '../../../infrastructure/supabase/client';
import {
  getGymConfig,
  updateGymConfig,
  getGroupPricing,
  updateGroupPricing,
  createGroupPricing
} from '../../../application/admin/manageSettings.usecase';
import { getPlans } from '../../../application/admin/managePlans.usecase';
import type { GymConfig, PlanGroupPricing, Plan } from '../../../domain/member/member.types';
import LockedFeature from '@/ui/components/LockedFeature/LockedFeature';
import { useAppSelector } from '@/infrastructure/store/store';
import { RolesManagement } from './components/RolesManagement/RolesManagement';

import styles from './AdminSettings.module.css';

const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

interface DaySchedule {
  open: string;
  close: string;
  active: boolean;
}

interface GymSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const DEFAULT_SCHEDULE: GymSchedule = {
  monday: { open: '05:00', close: '22:00', active: true },
  tuesday: { open: '05:00', close: '22:00', active: true },
  wednesday: { open: '05:00', close: '22:00', active: true },
  thursday: { open: '05:00', close: '22:00', active: true },
  friday: { open: '05:00', close: '22:00', active: true },
  saturday: { open: '07:00', close: '20:00', active: true },
  sunday: { open: '08:00', close: '14:00', active: true }
};

const DAYS_ORDER: (keyof GymSchedule)[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

const DAY_LABELS: Record<keyof GymSchedule, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const parseTime = (timeStr: string) => {
  if (!timeStr) return null;
  return dayjs(timeStr, timeStr.split(':').length === 3 ? 'HH:mm:ss' : 'HH:mm');
};

export function AdminSettings() {
  const { profile } = useAppSelector((state) => state.auth);
  const isSuperAdmin = profile?.role === 'super_admin';

  const [_gymConfig, setGymConfig] = useState<GymConfig | null>(null);
  const [groupPricing, setGroupPricing] = useState<PlanGroupPricing[]>([]);
  const [_plans, setPlans] = useState<Plan[]>([]);
  const [schedule, setSchedule] = useState<GymSchedule>(DEFAULT_SCHEDULE);
  const [monthlyPlan, setMonthlyPlan] = useState<Plan | null>(null);

  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [initialValues, setInitialValues] = useState<{
    formValues: {
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
    };
    schedule: GymSchedule;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Logo upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Inline editing state for group pricing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm] = Form.useForm();

  // Modal state for adding group pricing
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
  const [addForm] = Form.useForm();

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load config, group pricing and plans
      const [configData, pricingData, plansData] = await Promise.all([
        getGymConfig(),
        getGroupPricing(),
        getPlans()
      ]);

      setGymConfig(configData);
      setGroupPricing(pricingData);
      setPlans(plansData);

      const mPlan = plansData.find(p => p.slug === '1_month');
      setMonthlyPlan(mPlan || null);

      if (configData) {
        setLogoUrl(configData.logo_url || null);
        
        const configWithSchedule = configData as GymConfig & { schedule?: GymSchedule };
        const dbSchedule = configWithSchedule.schedule;
        const activeSchedule = dbSchedule || DEFAULT_SCHEDULE;
        setSchedule(activeSchedule);

        const formVals = {
          name: configData.name,
          address: configData.address,
          phone: configData.phone,
          email: configData.email,
          website: configData.website
        };

        setTimeout(() => {
          form.setFieldsValue(formVals);
        }, 0);

        setInitialValues({
          formValues: formVals,
          schedule: activeSchedule
        });

        if (configData.logo_url) {
          setFileList([
            {
              uid: '-1',
              name: 'logo.png',
              status: 'done',
              url: configData.logo_url
            }
          ]);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Error al cargar la configuración del sistema');
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasUnsavedChanges = isEditingInfo && (
    form.isFieldsTouched() || 
    JSON.stringify(schedule) !== JSON.stringify(initialValues?.schedule)
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const { navigator } = useContext(NavigationContext);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const nav = navigator as any;
    const originalPush = nav.push;
    const originalReplace = nav.replace;

    nav.push = (to: any, state: any) => {
      Modal.confirm({
        title: '¿Salir sin guardar?',
        content: 'Tienes cambios sin guardar. Si sales ahora los perderás.',
        okText: 'Salir sin guardar',
        cancelText: 'Volver y guardar',
        okButtonProps: { danger: true },
        onOk: () => {
          nav.push = originalPush;
          nav.replace = originalReplace;
          setIsEditingInfo(false);
          originalPush(to, state);
        },
        onCancel: () => {
          // Do nothing
        }
      });
    };

    nav.replace = (to: any, state: any) => {
      Modal.confirm({
        title: '¿Salir sin guardar?',
        content: 'Tienes cambios sin guardar. Si sales ahora los perderás.',
        okText: 'Salir sin guardar',
        cancelText: 'Volver y guardar',
        okButtonProps: { danger: true },
        onOk: () => {
          nav.push = originalPush;
          nav.replace = originalReplace;
          setIsEditingInfo(false);
          originalReplace(to, state);
        },
        onCancel: () => {
          // Do nothing
        }
      });
    };

    const handlePopState = () => {
      // Revert URL to settings page immediately
      window.history.pushState(null, '', '/admin/settings');
      Modal.confirm({
        title: '¿Salir sin guardar?',
        content: 'Tienes cambios sin guardar. Si sales ahora los perderás.',
        okText: 'Salir sin guardar',
        cancelText: 'Volver y guardar',
        okButtonProps: { danger: true },
        onOk: () => {
          window.removeEventListener('popstate', handlePopState);
          setIsEditingInfo(false);
          window.history.back();
        },
        onCancel: () => {
          // Do nothing, URL is already reverted
        }
      });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      nav.push = originalPush;
      nav.replace = originalReplace;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigator, hasUnsavedChanges]);

  // Handle logo upload to Supabase Storage
  const handleLogoUpload = async (options: UploadRequestOption) => {
    const file = options.file as RcFile;
    const { onSuccess, onError } = options;
    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `gym/${fileName}`;

      // Upload file to Supabase storage bucket 'logos'
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: publicUrl
        }
      ]);
      if (onSuccess) {
        onSuccess(null, file as any);
      }
      message.success('Nuevo logo cargado temporalmente. Guarde la configuración para confirmar.');
    } catch (err: any) {
      console.error(err);
      if (onError) {
        onError(err);
      }
      message.error(`Error al subir logo: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Gym Config
  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      
      const updatedConfig = {
        name: values.name,
        address: values.address,
        phone: values.phone,
        email: values.email,
        website: values.website,
        logo_url: logoUrl,
        schedule: schedule
      };

      await updateGymConfig(updatedConfig as any);
      message.success('Configuración del gimnasio guardada correctamente');
      setIsEditingInfo(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Error al guardar configuración');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start inline editing
  const startEdit = (record: PlanGroupPricing) => {
    setEditingId(record.id);
    editForm.setFieldsValue({
      min_members: record.min_members,
      max_members: record.max_members,
      price_per_person: record.price_per_person,
      active: record.active
    });
  };

  // Cancel inline editing
  const cancelEdit = () => {
    setEditingId(null);
    editForm.resetFields();
  };

  // Save inline edit
  const saveInlineEdit = async (id: string) => {
    try {
      const values = await editForm.validateFields();
      
      if (values.max_members && values.max_members < values.min_members) {
        message.error('El número máximo de miembros no puede ser menor al mínimo');
        return;
      }

      setIsSubmitting(true);
      await updateGroupPricing(id, {
        min_members: values.min_members,
        max_members: values.max_members || null,
        price_per_person: values.price_per_person,
        active: !!values.active
      });

      message.success('Rango de precio grupal actualizado');
      setEditingId(null);
      
      // Reload pricing
      const pricingData = await getGroupPricing();
      setGroupPricing(pricingData);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Error al guardar precio grupal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete pricing range (by setting to inactive or deleting)
  const handleDeletePricing = async (id: string) => {
    Modal.confirm({
      title: '¿Estás seguro de desactivar este rango de precio?',
      content: 'El rango dejará de aplicarse para nuevas suscripciones grupales.',
      okText: 'Desactivar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      maskClosable: false,
      onOk: async () => {
        setIsSubmitting(true);
        try {
          await updateGroupPricing(id, { active: false });
          message.success('Rango desactivado correctamente');
          const pricingData = await getGroupPricing();
          setGroupPricing(pricingData);
        } catch (err: any) {
          message.error(err.message || 'Error al desactivar el rango');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // Save new group pricing range from modal
  const handleAddPricingRange = async () => {
    try {
      const values = await addForm.validateFields();
      
      if (!monthlyPlan) {
        message.error('No se pudo encontrar el plan mensual de referencia');
        return;
      }

      if (values.max_members && values.max_members < values.min_members) {
        message.error('El número máximo de miembros no puede ser menor al mínimo');
        return;
      }

      setIsSubmitting(true);
      await createGroupPricing({
        plan_id: monthlyPlan.id,
        min_members: values.min_members,
        max_members: values.max_members || null,
        price_per_person: values.price_per_person,
        active: true
      });

      message.success('Nuevo rango de precio grupal creado');
      setIsPricingModalOpen(false);
      addForm.resetFields();
      
      // Reload pricing
      const pricingData = await getGroupPricing();
      setGroupPricing(pricingData);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Error al crear precio grupal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando configuración..." />;
  }

  if (error) {
    return (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <div className={styles['admin-settings__error-container']} role="alert">
          <h2 className={styles['admin-settings__error-title']}>Ocurrió un error</h2>
          <p className={styles['admin-settings__error-text']}>{error}</p>
          <Button className={styles['admin-settings__btn-retry']} onClick={() => loadData()}>
            Intentar de nuevo
          </Button>
        </div>
      </ConfigProvider>
    );
  }

  // Define Columns for Group Pricing table
  const groupPricingColumns = [
    {
      title: 'Mínimo de personas',
      dataIndex: 'min_members',
      key: 'min_members',
      width: '20%',
      render: (val: number, record: PlanGroupPricing) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="min_members"
              className={styles['admin-settings__table-form-item']}
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <InputNumber min={1} precision={0} className={styles['admin-settings__full-width']} />
            </Form.Item>
          );
        }
        return `${val} ${val === 1 ? 'persona' : 'personas'}`;
      }
    },
    {
      title: 'Máximo de personas',
      dataIndex: 'max_members',
      key: 'max_members',
      width: '25%',
      render: (val: number | null, record: PlanGroupPricing) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="max_members"
              className={styles['admin-settings__table-form-item']}
            >
              <InputNumber min={1} precision={0} placeholder="Ilimitado" className={styles['admin-settings__full-width']} />
            </Form.Item>
          );
        }
        return val ? `${val} personas` : 'Sin límite (o más)';
      }
    },
    {
      title: 'Precio por persona',
      dataIndex: 'price_per_person',
      key: 'price_per_person',
      width: '25%',
      render: (val: number, record: PlanGroupPricing) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="price_per_person"
              className={styles['admin-settings__table-form-item']}
              rules={[{ required: true, message: 'Requerido' }]}
            >
              <InputNumber
                min={1000 as number}
                precision={0}
                className={styles['admin-settings__full-width']}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
              />
            </Form.Item>
          );
        }
        return formatCOP(val);
      }
    },
    {
      title: 'Estado',
      dataIndex: 'active',
      key: 'active',
      width: '15%',
      render: (active: boolean, record: PlanGroupPricing) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="active"
              valuePropName="checked"
              className={styles['admin-settings__table-form-item']}
            >
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          );
        }
        return (
          <span className={`${styles['admin-settings__status-tag']} ${active ? styles['admin-settings__status-tag--active'] : styles['admin-settings__status-tag--inactive']}`}>
            {active ? 'Activo' : 'Inactivo'}
          </span>
        );
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: '15%',
      render: (_: unknown, record: PlanGroupPricing) => {
        const isEditing = editingId === record.id;
        if (isEditing) {
          return (
            <Space size="middle">
              <Tooltip title="Guardar">
                <Button
                  type="text"
                  icon={<CheckOutlined className={styles['admin-settings__icon--active']} />}
                  onClick={() => saveInlineEdit(record.id)}
                  aria-label="Guardar cambios"
                />
              </Tooltip>
              <Tooltip title="Cancelar">
                <Button
                  type="text"
                  icon={<CloseOutlined className={styles['admin-settings__icon--expired']} />}
                  onClick={cancelEdit}
                  aria-label="Cancelar cambios"
                />
              </Tooltip>
            </Space>
          );
        }

        return (
          <Space size="middle">
            <Tooltip title="Editar rango">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => startEdit(record)}
                aria-label={`Editar rango ${record.min_members}`}
              />
            </Tooltip>
            {record.active && (
              <Tooltip title="Desactivar">
                <Button
                  type="text"
                  icon={<DeleteOutlined className={styles['admin-settings__icon--expired']} />}
                  onClick={() => handleDeletePricing(record.id)}
                  aria-label={`Desactivar rango ${record.min_members}`}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  const handleActiveChange = (day: keyof GymSchedule, checked: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], active: checked }
    }));
  };

  const handleOpenTimeChange = (day: keyof GymSchedule, time: dayjs.Dayjs | null) => {
    if (time) {
      setSchedule(prev => ({
        ...prev,
        [day]: { ...prev[day], open: time.format('HH:mm') }
      }));
    }
  };

  const handleCloseTimeChange = (day: keyof GymSchedule, time: dayjs.Dayjs | null) => {
    if (time) {
      setSchedule(prev => ({
        ...prev,
        [day]: { ...prev[day], close: time.format('HH:mm') }
      }));
    }
  };

  interface ScheduleRow {
    key: keyof GymSchedule;
    dayName: string;
    active: boolean;
    open: string;
    close: string;
  }

  const scheduleDataSource: ScheduleRow[] = DAYS_ORDER.map(dayKey => ({
    key: dayKey,
    dayName: DAY_LABELS[dayKey],
    active: schedule[dayKey]?.active ?? false,
    open: schedule[dayKey]?.open ?? '00:00',
    close: schedule[dayKey]?.close ?? '00:00'
  }));

  const scheduleColumns = [
    {
      title: 'Día',
      dataIndex: 'dayName',
      key: 'dayName',
      width: '25%',
      render: (text: string) => <strong style={{ color: 'var(--color-text-primary)' }}>{text}</strong>
    },
    {
      title: 'Abierto',
      dataIndex: 'active',
      key: 'active',
      width: '20%',
      render: (active: boolean, record: ScheduleRow) => (
        <Switch
          checked={active}
          onChange={(checked) => handleActiveChange(record.key, checked)}
          checkedChildren="Sí"
          unCheckedChildren="No"
          disabled={!isEditingInfo}
        />
      )
    },
    {
      title: 'Hora apertura',
      dataIndex: 'open',
      key: 'open',
      width: '27.5%',
      render: (open: string, record: ScheduleRow) => (
        <TimePicker
          value={open ? parseTime(open) : null}
          format="HH:mm"
          onChange={(time) => handleOpenTimeChange(record.key, time)}
          disabled={!isEditingInfo || !record.active}
          allowClear={false}
          className={styles['admin-settings__full-width']}
          placeholder="Apertura"
        />
      )
    },
    {
      title: 'Hora cierre',
      dataIndex: 'close',
      key: 'close',
      width: '27.5%',
      render: (close: string, record: ScheduleRow) => (
        <TimePicker
          value={close ? parseTime(close) : null}
          format="HH:mm"
          onChange={(time) => handleCloseTimeChange(record.key, time)}
          disabled={!isEditingInfo || !record.active}
          allowClear={false}
          className={styles['admin-settings__full-width']}
          placeholder="Cierre"
        />
      )
    }
  ];

  const tabItems = [
    {
      key: 'info',
      label: (
        <span className={styles['admin-settings__tab-label']}>
          <SettingOutlined className={styles['admin-settings__tab-icon']} />
          Información del Gym
        </span>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
          className={styles['admin-settings__form']}
        >
          <header className={styles['admin-settings__info-header']}>
            <h3 className={styles['admin-settings__info-title']}>
              Información General del Gimnasio
            </h3>
            <Button
              type="text"
              icon={isEditingInfo ? <CloseOutlined /> : <EditOutlined />}
              onClick={() => {
                if (isEditingInfo) {
                  if (initialValues) {
                    form.setFieldsValue(initialValues.formValues);
                    setSchedule(initialValues.schedule);
                    form.resetFields();
                  }
                }
                setIsEditingInfo(!isEditingInfo);
              }}
            >
              {isEditingInfo ? 'Cancelar' : 'Editar'}
            </Button>
          </header>

          <div className={styles['admin-settings__logo-section']}>
            <div className={styles['admin-settings__logo-card']}>
              <h3 className={styles['admin-settings__logo-title']}>Logo del Gimnasio</h3>
              <div className={styles['admin-settings__logo-preview-container']}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo del gimnasio"
                    className={styles['admin-settings__logo-preview']}
                  />
                ) : (
                  <div className={styles['admin-settings__logo-placeholder']}>
                    <span>Sin Logo</span>
                  </div>
                )}
              </div>
              <Upload
                customRequest={handleLogoUpload}
                fileList={fileList}
                showUploadList={false}
                disabled={!isEditingInfo}
                beforeUpload={(file) => {
                  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                  if (!isJpgOrPng) {
                    message.error('¡Solo puedes subir archivos JPG/PNG!');
                  }
                  const isLt2M = file.size / 1024 / 1024 < 2;
                  if (!isLt2M) {
                    message.error('¡La imagen debe pesar menos de 2MB!');
                  }
                  return isJpgOrPng && isLt2M;
                }}
              >
                <Button icon={<UploadOutlined />} className={styles['admin-settings__logo-btn']} disabled={!isEditingInfo}>
                  Subir nuevo logo
                </Button>
              </Upload>
            </div>

            <div className={styles['admin-settings__fields-grid']}>
              <Form.Item
                name="name"
                label="Nombre del gimnasio"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Platinum Center" disabled={!isEditingInfo} />
              </Form.Item>

              <Form.Item
                name="website"
                label="Sitio Web"
                rules={[{ type: 'url', message: 'Ingresa un sitio web válido (ej: https://example.com)' }]}
              >
                <Input prefix={<GlobalOutlined />} placeholder="Ej. https://platinumcenter.com" disabled={!isEditingInfo} />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Teléfono de contacto"
                rules={[
                  { required: true, message: 'El teléfono es obligatorio' },
                  { pattern: /^[0-9]{10}$/, message: 'El teléfono debe tener exactamente 10 dígitos' }
                ]}
              >
                <Input
                  type="tel"
                  maxLength={10}
                  onKeyPress={(e) => !/[0-9]/.test(e.key) && e.preventDefault()}
                  placeholder="Ej. 3001234567"
                  disabled={!isEditingInfo}
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="Correo electrónico"
                rules={[
                  { required: true, message: 'El correo electrónico es obligatorio' },
                  { type: 'email', message: 'Ingresa un correo electrónico válido' }
                ]}
              >
                <Input placeholder="Ej. info@platinumcenter.com" disabled={!isEditingInfo} />
              </Form.Item>

              <Form.Item
                name="address"
                label="Dirección"
                rules={[{ required: true, message: 'La dirección es obligatoria' }]}
                className={styles['admin-settings__fields-grid-full-width']}
              >
                <Input.TextArea rows={2} placeholder="Dirección completa de la sede" disabled={!isEditingInfo} />
              </Form.Item>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 className={styles['admin-settings__schedule-title']}>
              Horario de Operación
            </h3>
            <div className={styles['admin-settings__table-wrapper']}>
              <Table
                dataSource={scheduleDataSource}
                columns={scheduleColumns}
                pagination={false}
                rowKey="key"
                size="middle"
                bordered
              />
            </div>
          </div>

          <div className={styles['admin-settings__whatsapp-row']}>
            <span className={styles['admin-settings__whatsapp-label']}>
              WhatsApp Business 
              <LockedFeature.Badge />
            </span>
            <p className={styles['admin-settings__whatsapp-description']}>
              Próximamente podrás configurar tu número de WhatsApp Business para enviar notificaciones automáticas de vencimiento, confirmaciones de pago y comunicados a tus miembros.
            </p>
          </div>

          {isEditingInfo && (
            <footer className={styles['admin-settings__sticky-footer']}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                className={styles['admin-settings__save-btn']}
                loading={isSubmitting}
              >
                Guardar Configuración
              </Button>
            </footer>
          )}
        </Form>
      )
    },
    ...(isSuperAdmin ? [
      {
        key: 'roles',
        label: (
          <span className={styles['admin-settings__tab-label']}>
            <UserOutlined className={styles['admin-settings__tab-icon']} />
            Usuarios y Roles
          </span>
        ),
        children: <RolesManagement />
      }
    ] : []),
    {
      key: 'pricing',
      label: (
        <span className={styles['admin-settings__tab-label']}>
          <TeamOutlined className={styles['admin-settings__tab-icon']} />
          Precios Grupales
        </span>
      ),
      children: (
        <div className={styles['admin-settings__pricing-section']}>
          <header className={styles['admin-settings__pricing-header']}>
            <div>
              <h3 className={styles['admin-settings__tab-subtitle']}>Rangos de precios grupales</h3>
              <p className={styles['admin-settings__tab-description']}>
                <InfoCircleOutlined /> Define descuentos progresivos por cantidad de miembros. 
                <strong> Solo aplica para el Plan Mensual ({monthlyPlan?.name || 'Membresía Mensual'}).</strong>
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsPricingModalOpen(true)}
              className={styles['admin-settings__add-pricing-btn']}
              disabled={!monthlyPlan}
            >
              Agregar Rango
            </Button>
          </header>

          <div className={styles['admin-settings__table-wrapper']}>
            <Form form={editForm} component={false}>
              <Table
                dataSource={groupPricing}
                columns={groupPricingColumns}
                rowKey="id"
                pagination={false}
              />
            </Form>
          </div>
        </div>
      )
    },
    {
      key: 'appearance',
      label: (
        <span className={styles['admin-settings__tab-label']}>
          <BgColorsOutlined className={styles['admin-settings__tab-icon']} />
          Apariencia
        </span>
      ),
      children: (
        <div className={styles['admin-settings__appearance-section']}>
          <LockedFeature.Section
            title="Personalización de Colores y Tema"
            description="Personaliza los colores del portal, el logo en emails y el tema visual para alinearlo con tu marca corporativa."
            blur={true}
          >
            <div className={styles['appearance-preview']}>
              <div className={styles['appearance-preview__section']}>
                <h4 className={styles['appearance-preview__title']}>Paleta de Colores</h4>
                <div className={styles['appearance-preview__swatches']}>
                  <div className={styles['appearance-preview__swatch-item']}>
                    <div className={`${styles['appearance-preview__swatch']} ${styles['admin-settings__swatch--primary']}`} />
                    <span className={styles['appearance-preview__swatch-label']}>Color Primario</span>
                  </div>
                  <div className={styles['appearance-preview__swatch-item']}>
                    <div className={`${styles['appearance-preview__swatch']} ${styles['admin-settings__swatch--accent']}`} />
                    <span className={styles['appearance-preview__swatch-label']}>Color Accent</span>
                  </div>
                  <div className={styles['appearance-preview__swatch-item']}>
                    <div className={`${styles['appearance-preview__swatch']} ${styles['admin-settings__swatch--bg']}`} />
                    <span className={styles['appearance-preview__swatch-label']}>Color Fondo</span>
                  </div>
                </div>
              </div>
              
              <div className={styles['appearance-preview__section']}>
                <h4 className={styles['appearance-preview__title']}>Estilos de Componentes</h4>
                <div className={styles['appearance-preview__sliders']}>
                  <div className={styles['appearance-preview__slider-item']}>
                    <span className={styles['appearance-preview__slider-label']}>Esquinas redondeadas (Border Radius)</span>
                    <div className={styles['appearance-preview__slider-track']}>
                      <div className={`${styles['appearance-preview__slider-fill']} ${styles['admin-settings__slider-fill--40']}`} />
                      <div className={`${styles['appearance-preview__slider-thumb']} ${styles['admin-settings__slider-thumb--40']}`} />
                    </div>
                  </div>
                  <div className={styles['appearance-preview__slider-item']}>
                    <span className={styles['appearance-preview__slider-label']}>Espaciado de elementos (Padding)</span>
                    <div className={styles['appearance-preview__slider-track']}>
                      <div className={`${styles['appearance-preview__slider-fill']} ${styles['admin-settings__slider-fill--60']}`} />
                      <div className={`${styles['appearance-preview__slider-thumb']} ${styles['admin-settings__slider-thumb--60']}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </LockedFeature.Section>
        </div>
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
        }
      }}
    >
      {isSubmitting && <LoadingScreen message="Guardando cambios..." />}

      <main className={styles['admin-settings']} role="main">
        <header className={styles['admin-settings__header']}>
          <h1 className={styles['admin-settings__title']}>Configuración del Sistema</h1>
        </header>

        <div className={styles['admin-settings__tabs-wrapper']}>
          <Tabs items={tabItems} defaultActiveKey="info" type="card" />
        </div>

        {/* Modal for adding group pricing */}
        <Modal
          title="Agregar Rango de Precio Grupal"
          open={isPricingModalOpen}
          onOk={handleAddPricingRange}
          onCancel={() => {
            setIsPricingModalOpen(false);
            addForm.resetFields();
          }}
          okText="Agregar Rango"
          cancelText="Cancelar"
          destroyOnClose
          maskClosable={false}
        >
          <Form form={addForm} layout="vertical">
            <Form.Item
              name="min_members"
              label="Mínimo de personas"
              rules={[
                { required: true, message: 'El mínimo de personas es requerido' },
                { type: 'number', min: 1, message: 'Debe ser al menos 1' }
              ]}
              initialValue={2}
            >
              <InputNumber min={1} precision={0} className={styles['admin-settings__full-width']} placeholder="Ej. 3" />
            </Form.Item>

            <Form.Item
              name="max_members"
              label="Máximo de personas (opcional)"
            >
              <InputNumber min={1} precision={0} className={styles['admin-settings__full-width']} placeholder="Dejar en blanco para ilimitado" />
            </Form.Item>

            <Form.Item
              name="price_per_person"
              label="Precio por persona ($ COP)"
              rules={[
                { required: true, message: 'El precio es requerido' },
                { type: 'number', min: 1000, message: 'Debe ser al menos 1,000' }
              ]}
            >
              <InputNumber
                min={1000 as number}
                precision={0}
                className={styles['admin-settings__full-width']}
                placeholder="Precio unitario"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0}
              />
            </Form.Item>
          </Form>
        </Modal>
      </main>
    </ConfigProvider>
  );
}

export default AdminSettings;
