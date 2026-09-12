import { Button } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { LockedFeature, showComingSoonModal } from '@/ui/components/LockedFeature';
import styles from './MemberClasses.module.css';

interface GymClass {
  id: string;
  name: string;
  time: string;
  booked: number;
  total: number;
  instructor: string;
}

interface DaySchedule {
  day: string;
  classes: GymClass[];
}

const SCHEDULE_DATA: DaySchedule[] = [
  {
    day: 'Lunes',
    classes: [
      { id: 'c-1', name: 'Spinning', time: '6:00 AM', booked: 12, total: 15, instructor: 'Andrés Morales' },
      { id: 'c-2', name: 'Funcional', time: '8:00 AM', booked: 8, total: 10, instructor: 'Laura Gómez' },
    ],
  },
  {
    day: 'Martes',
    classes: [
      { id: 'c-3', name: 'Zumba', time: '7:00 AM', booked: 15, total: 20, instructor: 'Diana Torres' },
      { id: 'c-4', name: 'Yoga', time: '9:00 AM', booked: 5, total: 10, instructor: 'Camila Rojas' },
    ],
  },
  {
    day: 'Miércoles',
    classes: [
      { id: 'c-5', name: 'Spinning', time: '6:00 AM', booked: 10, total: 15, instructor: 'Andrés Morales' },
      { id: 'c-6', name: 'Pilates', time: '8:00 AM', booked: 7, total: 10, instructor: 'Camila Rojas' },
    ],
  },
  {
    day: 'Jueves',
    classes: [
      { id: 'c-7', name: 'CrossFit', time: '7:00 AM', booked: 12, total: 12, instructor: 'Carlos Mendoza' },
    ],
  },
  {
    day: 'Viernes',
    classes: [
      { id: 'c-8', name: 'Spinning', time: '6:00 AM', booked: 8, total: 15, instructor: 'Andrés Morales' },
      { id: 'c-9', name: 'Funcional', time: '8:00 AM', booked: 6, total: 10, instructor: 'Laura Gómez' },
    ],
  },
  {
    day: 'Sábado',
    classes: [
      { id: 'c-10', name: 'Zumba', time: '9:00 AM', booked: 18, total: 20, instructor: 'Diana Torres' },
    ],
  },
];

export function MemberClasses() {
  return (
    <div className={styles['member-classes']} role="region" aria-label="Horarios y Clases">
      <LockedFeature.Section
        title="Reserva de Clases Grupales"
        description="Reserva tu cupo en tiempo real para clases de Spinning, Funcional, Yoga, CrossFit y Zumba desde tu celular."
        comingSoon={false}
      >
        <div className={styles['member-classes__header']}>
          <h1 className={styles['member-classes__title']}>Clases & Horarios</h1>
          <p className={styles['member-classes__subtitle']}>
            Consulta la programación semanal y asegura tu lugar con anticipación.
          </p>
        </div>

        <div className={styles['member-classes__schedule-grid']}>
          {SCHEDULE_DATA.map((dayItem) => (
            <div key={dayItem.day} className={styles['member-classes__day-column']}>
              <div className={styles['member-classes__day-header']}>
                <h2 className={styles['member-classes__day-title']}>{dayItem.day}</h2>
              </div>

              <div className={styles['member-classes__classes-list']}>
                {dayItem.classes.map((cls) => {
                  const isFull = cls.booked >= cls.total;

                  return (
                    <div key={cls.id} className={styles['member-classes__class-card']}>
                      <div className={styles['member-classes__class-time']}>
                        <ClockCircleOutlined />
                        <span>{cls.time}</span>
                      </div>

                      <h3 className={styles['member-classes__class-name']}>{cls.name}</h3>

                      <div className={styles['member-classes__class-instructor']}>
                        <UserOutlined /> {cls.instructor}
                      </div>

                      <div className={styles['member-classes__class-footer']}>
                        <span
                          className={`${styles['member-classes__capacity']} ${
                            isFull
                              ? styles['member-classes__capacity--full']
                              : styles['member-classes__capacity--available']
                          }`}
                        >
                          {cls.booked}/{cls.total} cupos {isFull ? '(Lleno)' : ''}
                        </span>

                        <Button
                          size="small"
                          type="primary"
                          disabled={isFull}
                          onClick={(e) => {
                            e.stopPropagation();
                            showComingSoonModal();
                          }}
                          className={styles['member-classes__enroll-btn']}
                        >
                          {isFull ? 'Lleno' : 'Inscribirme'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </LockedFeature.Section>
    </div>
  );
}

export default MemberClasses;
