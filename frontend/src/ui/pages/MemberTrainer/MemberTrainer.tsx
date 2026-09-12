import { Button, Table, ConfigProvider, theme } from 'antd';
import { UserOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { LockedFeature, showComingSoonModal } from '@/ui/components/LockedFeature';
import styles from './MemberTrainer.module.css';

interface RoutineDay {
  id: string;
  day: string;
  muscle: string;
  exercises: string;
}

const MOCK_ROUTINE: RoutineDay[] = [
  {
    id: 'r-1',
    day: 'Lunes',
    muscle: 'Pecho + Tríceps',
    exercises: 'Press banca, Fondos en paralelas, Extensiones en polea',
  },
  {
    id: 'r-2',
    day: 'Miércoles',
    muscle: 'Espalda + Bíceps',
    exercises: 'Dominadas con peso, Remo con barra, Curl con mancuernas',
  },
  {
    id: 'r-3',
    day: 'Viernes',
    muscle: 'Piernas',
    exercises: 'Sentadilla libre, Peso muerto rumano, Prensa 45°',
  },
];

export function MemberTrainer() {
  const columns = [
    {
      title: 'Día',
      dataIndex: 'day',
      key: 'day',
      render: (val: string) => (
        <span className={styles['member-trainer__day-tag']}>{val}</span>
      ),
    },
    {
      title: 'Grupo Muscular',
      dataIndex: 'muscle',
      key: 'muscle',
      render: (val: string) => (
        <span className={styles['member-trainer__muscle-tag']}>{val}</span>
      ),
    },
    {
      title: 'Ejercicios asignados',
      dataIndex: 'exercises',
      key: 'exercises',
      render: (val: string) => <span>{val}</span>,
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className={styles['member-trainer']} role="region" aria-label="Entrenador Personal">
        <LockedFeature.Section
        title="Entrenador Personal & Rutinas"
        description="Accede a asesoría personalizada, rutinas semanales adaptadas a tus objetivos y comunicación directa con tu coach."
        comingSoon={false}
      >
        <div className={styles['member-trainer__header']}>
          <h1 className={styles['member-trainer__title']}>Mi Entrenador</h1>
          <p className={styles['member-trainer__subtitle']}>
            Seguimiento 1 a 1, prescripción de rutina y asesoramiento de técnica.
          </p>
        </div>

        <div className={styles['member-trainer__content']}>
          {/* Card del Entrenador */}
          <div className={styles['member-trainer__coach-card']}>
            <div className={styles['member-trainer__coach-info']}>
              <div className={styles['member-trainer__avatar']}>
                <UserOutlined />
              </div>
              <div className={styles['member-trainer__coach-details']}>
                <h2 className={styles['member-trainer__coach-name']}>Carlos Mendoza</h2>
                <span className={styles['member-trainer__coach-specialty']}>
                  Hipertrofia y pérdida de peso
                </span>
                <span className={styles['member-trainer__coach-hours']}>
                  <ClockCircleOutlined /> Disponibilidad: Lun-Vie 6:00 AM - 2:00 PM
                </span>
              </div>
            </div>

            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => showComingSoonModal()}
              className={styles['member-trainer__contact-btn']}
            >
              Contactar entrenador
            </Button>
          </div>

          {/* Sección de Rutina Semanal */}
          <div className={styles['member-trainer__routine-card']}>
            <h2 className={styles['member-trainer__routine-title']}>Mi Rutina de esta semana</h2>
            <div className={styles['member-trainer__table-container']}>
              <Table
                dataSource={MOCK_ROUTINE}
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

export default MemberTrainer;
