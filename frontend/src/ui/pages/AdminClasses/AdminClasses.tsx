import { Button } from 'antd';
import { PlusOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { LockedFeature, showUpgradeModal } from '@/ui/components/LockedFeature';
import styles from './AdminClasses.module.css';

interface AdminClassItem {
  id: string;
  name: string;
  time: string;
  enrolled: number;
  capacity: number;
  instructor: string;
}

interface AdminDayGroup {
  day: string;
  classes: AdminClassItem[];
}

const ADMIN_SCHEDULE: AdminDayGroup[] = [
  {
    day: 'Lunes',
    classes: [
      { id: 'ac-1', name: 'Spinning', time: '6:00 AM', enrolled: 12, capacity: 15, instructor: 'Andrés Morales' },
      { id: 'ac-2', name: 'Funcional', time: '8:00 AM', enrolled: 8, capacity: 10, instructor: 'Laura Gómez' },
    ],
  },
  {
    day: 'Martes',
    classes: [
      { id: 'ac-3', name: 'Zumba', time: '7:00 AM', enrolled: 15, capacity: 20, instructor: 'Diana Torres' },
      { id: 'ac-4', name: 'Yoga', time: '9:00 AM', enrolled: 5, capacity: 10, instructor: 'Camila Rojas' },
    ],
  },
  {
    day: 'Miércoles',
    classes: [
      { id: 'ac-5', name: 'Spinning', time: '6:00 AM', enrolled: 10, capacity: 15, instructor: 'Andrés Morales' },
      { id: 'ac-6', name: 'Pilates', time: '8:00 AM', enrolled: 7, capacity: 10, instructor: 'Camila Rojas' },
    ],
  },
  {
    day: 'Jueves',
    classes: [
      { id: 'ac-7', name: 'CrossFit', time: '7:00 AM', enrolled: 12, capacity: 12, instructor: 'Carlos Mendoza' },
    ],
  },
  {
    day: 'Viernes',
    classes: [
      { id: 'ac-8', name: 'Spinning', time: '6:00 AM', enrolled: 8, capacity: 15, instructor: 'Andrés Morales' },
      { id: 'ac-9', name: 'Funcional', time: '8:00 AM', enrolled: 6, capacity: 10, instructor: 'Laura Gómez' },
    ],
  },
  {
    day: 'Sábado',
    classes: [
      { id: 'ac-10', name: 'Zumba', time: '9:00 AM', enrolled: 18, capacity: 20, instructor: 'Diana Torres' },
    ],
  },
];

export function AdminClasses() {
  return (
    <div className={styles['admin-classes']} role="region" aria-label="Gestión de Clases">
      <LockedFeature.Section
        title="Módulo de Clases & Reservas"
        description="Organice horarios, límite de aforo, asignación de instructores y control de asistencia en cada sesión grupal."
        comingSoon={false}
      >
        <div className={styles['admin-classes__header']}>
          <div className={styles['admin-classes__title-group']}>
            <h1 className={styles['admin-classes__title']}>Gestión de Clases & Horarios</h1>
            <p className={styles['admin-classes__subtitle']}>
              Administración de sesiones grupales, cupos y programación semanal.
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showUpgradeModal()}
            className={styles['admin-classes__add-btn']}
          >
            Nueva clase
          </Button>
        </div>

        <div className={styles['admin-classes__grid']}>
          {ADMIN_SCHEDULE.map((dayGroup) => (
            <div key={dayGroup.day} className={styles['admin-classes__day-card']}>
              <div className={styles['admin-classes__day-header']}>
                <h2 className={styles['admin-classes__day-title']}>{dayGroup.day}</h2>
              </div>

              <div className={styles['admin-classes__classes-list']}>
                {dayGroup.classes.map((cls) => {
                  const isFull = cls.enrolled >= cls.capacity;

                  return (
                    <div
                      key={cls.id}
                      className={styles['admin-classes__item']}
                      onClick={() => showUpgradeModal()}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles['admin-classes__item-header']}>
                        <div className={styles['admin-classes__time']}>
                          <ClockCircleOutlined />
                          <span>{cls.time}</span>
                        </div>
                        <span
                          className={
                            isFull
                              ? styles['admin-classes__badge--full']
                              : styles['admin-classes__badge--available']
                          }
                        >
                          {isFull ? 'Lleno' : `${cls.enrolled}/${cls.capacity} cupos`}
                        </span>
                      </div>

                      <h3 className={styles['admin-classes__name']}>{cls.name}</h3>

                      <div className={styles['admin-classes__instructor']}>
                        <UserOutlined /> Instructor: {cls.instructor}
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

export default AdminClasses;
