import { useEffect, useState, useRef } from 'react';
import {
  Table,
  Select,
  Button,
  Tag,
  Input,
  Empty,
  ConfigProvider,
  theme,
  DatePicker,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { adminRepository, type AccessLogEntry } from '../../../infrastructure/supabase/admin.repository';
import { formatDateTime } from '@/utils/date';
import dayjs, { type Dayjs } from 'dayjs';
import styles from './AdminAccessLogs.module.css';

const { RangePicker } = DatePicker;

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  granted: { label: 'PERMITIDO', color: 'success' },
  denied: { label: 'DENEGADO', color: 'warning' },
  unknown: { label: 'DESCONOCIDO', color: 'error' },
};

export function AdminAccessLogs() {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [cardNoFilter, setCardNoFilter] = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = async (overrides?: { card_no?: string; name?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminRepository.getAccessLogs({
        card_no: (overrides?.card_no ?? cardNoFilter) || undefined,
        name: (overrides?.name ?? nameFilter) || undefined,
        event_type: (eventTypeFilter as any) || undefined,
        date_from: dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined,
        date_to: dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined,
        page,
        page_size: pageSize,
      });
      setEntries(response.results);
      setTotal(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el registro de ingresos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, eventTypeFilter, dateRange]);

  // Nota: antes este handler llamaba a loadData() sin argumentos dentro del
  // setTimeout, y loadData() leía cardNoFilter/nameFilter desde el closure
  // capturado en el render anterior al de la última tecla — es decir, siempre
  // un carácter atrasado respecto a lo que el usuario realmente escribió. Por
  // eso una búsqueda exacta (card_no) casi nunca matcheaba. Ahora se pasa el
  // valor recién tecleado (el de e.target.value, no el del estado de React)
  // directo a loadData, evitando depender de un closure que puede estar viejo.
  const handleTextFilterChange = (
    key: 'card_no' | 'name',
    setter: (v: string) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setter(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadData({ [key]: value });
    }, 400);
  };

  const columns = [
    {
      title: 'Hora',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Miembro',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (val: string, record: AccessLogEntry) => (
        <span style={{ color: record.member_id ? 'var(--color-text-primary)' : 'var(--color-status-expired)', fontWeight: record.member_id ? 500 : 600 }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Card No',
      dataIndex: 'card_no',
      key: 'card_no',
    },
    {
      title: 'User ID (dispositivo)',
      dataIndex: 'zkteco_user_id',
      key: 'zkteco_user_id',
      render: (val: string | null) => val || '—',
    },
    {
      title: 'Evento',
      dataIndex: 'event_type',
      key: 'event_type',
      render: (val: string) => {
        const meta = EVENT_TYPE_LABELS[val] || { label: val.toUpperCase(), color: 'default' };
        return <Tag color={meta.color} style={{ fontWeight: 500 }}>{meta.label}</Tag>;
      },
    },
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
          borderRadius: 8,
        },
      }}
    >
      <main className={styles['admin-access-logs']} role="main">
        <header className={styles['admin-access-logs__header']}>
          <h1 className={styles['admin-access-logs__title']}>Registro de Ingresos</h1>
        </header>

        <section className={styles['admin-access-logs__filters']} aria-label="Filtros de ingresos">
          <Input
            placeholder="Buscar por card_no"
            value={cardNoFilter}
            onChange={handleTextFilterChange('card_no', setCardNoFilter)}
            className={styles['admin-access-logs__filter-input']}
            prefix={<SearchOutlined />}
            allowClear
          />

          <Input
            placeholder="Buscar por nombre"
            value={nameFilter}
            onChange={handleTextFilterChange('name', setNameFilter)}
            className={styles['admin-access-logs__filter-input']}
            prefix={<SearchOutlined />}
            allowClear
          />

          <Select
            placeholder="Tipo de evento"
            value={eventTypeFilter}
            onChange={(val) => {
              setEventTypeFilter(val);
              setPage(1);
            }}
            className={styles['admin-access-logs__filter-select']}
            allowClear
          >
            <Select.Option value="">Todos</Select.Option>
            <Select.Option value="granted">Permitido</Select.Option>
            <Select.Option value="denied">Denegado</Select.Option>
            <Select.Option value="unknown">Desconocido</Select.Option>
          </Select>

          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={(vals) => {
              setDateRange(vals as [Dayjs, Dayjs] | null);
              setPage(1);
            }}
            presets={[
              { label: 'Hoy', value: [dayjs(), dayjs()] },
              { label: 'Últimos 7 días', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
            ]}
          />

          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => { void loadData(); }}
            disabled={isLoading}
          >
            Refrescar
          </Button>
        </section>

        {isLoading ? (
          <div className={styles['admin-access-logs__loading-container']} role="status" aria-live="polite">
            <div className={styles['admin-access-logs__loading-text']}>Cargando registro de ingresos...</div>
          </div>
        ) : error ? (
          <div className={styles['admin-access-logs__error-container']} role="alert">
            <h2 className={styles['admin-access-logs__error-title']}>Ocurrió un error</h2>
            <p className={styles['admin-access-logs__error-text']}>{error}</p>
            <Button className={styles['admin-access-logs__btn-retry']} onClick={() => { void loadData(); }}>
              Intentar de nuevo
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles['admin-access-logs__empty-container']}>
            <Empty description={<span style={{ color: 'var(--color-text-secondary)' }}>No hay ingresos con los filtros seleccionados.</span>} />
          </div>
        ) : (
          <div className={styles['admin-access-logs__table-wrapper']}>
            <div className={styles['admin-access-logs__page-indicator']}>
              Página {page} de {Math.max(1, Math.ceil(total / pageSize))} · {total} ingresos
            </div>
            <Table
              dataSource={entries}
              columns={columns}
              rowKey="id"
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: false,
                position: ['topCenter', 'bottomCenter'],
                onChange: (p) => setPage(p),
              }}
            />
          </div>
        )}
      </main>
    </ConfigProvider>
  );
}

export default AdminAccessLogs;
