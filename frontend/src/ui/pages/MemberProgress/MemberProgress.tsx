import { Input, Button, Table, ConfigProvider, theme } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LockedFeature, showComingSoonModal } from '@/ui/components/LockedFeature';
import styles from './MemberProgress.module.css';

interface ProgressHistoryItem {
  id: string;
  date: string;
  weight: number;
  bodyFat: number;
  chest: number;
  waist: number;
  arm: number;
}

const MOCK_CHART_DATA = [
  { month: 'Abr', peso: 79.2 },
  { month: 'May', peso: 78.5 },
  { month: 'Jun', peso: 77.3 },
  { month: 'Jul', peso: 76.8 },
  { month: 'Ago', peso: 75.4 },
  { month: 'Sep', peso: 74.5 },
];

const MOCK_HISTORY: ProgressHistoryItem[] = [
  {
    id: 'h-1',
    date: '10/09/2026',
    weight: 74.5,
    bodyFat: 14.8,
    chest: 104,
    waist: 78,
    arm: 37,
  },
  {
    id: 'h-2',
    date: '15/07/2026',
    weight: 76.8,
    bodyFat: 16.5,
    chest: 103,
    waist: 81,
    arm: 36.5,
  },
  {
    id: 'h-3',
    date: '20/05/2026',
    weight: 78.5,
    bodyFat: 18.2,
    chest: 102,
    waist: 84,
    arm: 36,
  },
];

export function MemberProgress() {
  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (val: string) => (
        <span className={styles['member-progress__date-badge']}>{val}</span>
      ),
    },
    {
      title: 'Peso (kg)',
      dataIndex: 'weight',
      key: 'weight',
      render: (val: number) => (
        <span className={styles['member-progress__metric-highlight']}>{val} kg</span>
      ),
    },
    {
      title: '% Grasa',
      dataIndex: 'bodyFat',
      key: 'bodyFat',
      render: (val: number) => <span>{val}%</span>,
    },
    {
      title: 'Pecho',
      dataIndex: 'chest',
      key: 'chest',
      render: (val: number) => <span>{val} cm</span>,
    },
    {
      title: 'Cintura',
      dataIndex: 'waist',
      key: 'waist',
      render: (val: number) => <span>{val} cm</span>,
    },
    {
      title: 'Brazo',
      dataIndex: 'arm',
      key: 'arm',
      render: (val: number) => <span>{val} cm</span>,
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className={styles['member-progress']} role="region" aria-label="Mi Progreso Físico">
        <LockedFeature.Section
        title="Seguimiento de Medidas Corporales"
        description="Registra tus cambios físicos, calcula tu % de grasa y visualiza tu progreso con gráficas de evolución mensual."
        comingSoon={false}
      >
        <div className={styles['member-progress__header']}>
          <h1 className={styles['member-progress__title']}>Mi Progreso</h1>
          <p className={styles['member-progress__subtitle']}>
            Historial de peso, porcentaje de grasa y medidas antropométricas.
          </p>
        </div>

        <div className={styles['member-progress__layout']}>
          {/* Formulario de registro (Deshabilitado) */}
          <div className={styles['member-progress__card']}>
            <h2 className={styles['member-progress__card-title']}>Registrar Nuevas Medidas</h2>
            <div className={styles['member-progress__form-grid']}>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Peso (kg)</label>
                <Input placeholder="Ej: 75.5" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Altura (cm)</label>
                <Input placeholder="Ej: 175" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>% Grasa corporal</label>
                <Input placeholder="Ej: 15.0" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Pecho (cm)</label>
                <Input placeholder="Ej: 102" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Cintura (cm)</label>
                <Input placeholder="Ej: 80" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Cadera (cm)</label>
                <Input placeholder="Ej: 95" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Brazo (cm)</label>
                <Input placeholder="Ej: 36.5" />
              </div>
              <div className={styles['member-progress__form-item']}>
                <label className={styles['member-progress__label']}>Pierna (cm)</label>
                <Input placeholder="Ej: 58" />
              </div>
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => showComingSoonModal()}
              className={styles['member-progress__submit-btn']}
            >
              Guardar Medición
            </Button>
          </div>

          {/* Gráfica de evolución */}
          <div className={styles['member-progress__card']}>
            <h2 className={styles['member-progress__card-title']}>Evolución de Peso (Últimos 6 Meses)</h2>
            <div className={styles['member-progress__chart-wrapper']}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--color-text-secondary)" unit="kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-dark-elevated)',
                      borderColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--color-primary)', r: 5 }}
                    activeDot={{ r: 8, fill: 'var(--color-accent)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de historial */}
          <div className={styles['member-progress__card']}>
            <h2 className={styles['member-progress__card-title']}>Historial de Registros</h2>
            <div className={styles['member-progress__table-container']}>
              <Table
                dataSource={MOCK_HISTORY}
                columns={columns}
                rowKey="id"
                pagination={false}
                onRow={() => ({
                  onClick: () => showComingSoonModal(),
                  style: { cursor: 'pointer' },
                })}
              />
            </div>
          </div>
        </div>
        </LockedFeature.Section>
      </div>
    </ConfigProvider>
  );
}

export default MemberProgress;
