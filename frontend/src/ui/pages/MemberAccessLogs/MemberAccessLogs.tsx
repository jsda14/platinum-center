import { useEffect, useState } from 'react';
import { LoginOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/infrastructure/store/store';
import { memberRepository } from '@/infrastructure/supabase/member.repository';
import type { AccessLogEntryMember } from '@/infrastructure/supabase/member.repository';
import { formatDate, formatTime } from '@/utils/date';
import styles from './MemberAccessLogs.module.css';

const PAGE_SIZE = 20;

interface DayGroup {
  dateKey: string;
  entries: AccessLogEntryMember[];
}

function groupByDay(entries: AccessLogEntryMember[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const entry of entries) {
    const dateKey = (entry.timestamp || '').slice(0, 10);
    if (!indexByKey.has(dateKey)) {
      indexByKey.set(dateKey, groups.length);
      groups.push({ dateKey, entries: [] });
    }
    groups[indexByKey.get(dateKey)!].entries.push(entry);
  }

  // El backend trae los ingresos más recientes primero (para que la paginación
  // muestre las últimas visitas primero); dentro de cada día se muestran de
  // más temprano a más tarde, que es como se lee un registro de entradas.
  for (const group of groups) {
    group.entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  return groups;
}

export function MemberAccessLogs() {
  const { profile } = useAppSelector((state) => state.auth);
  const { member, isLoading: isMemberLoading } = useAppSelector((state) => state.member);

  const [entries, setEntries] = useState<AccessLogEntryMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (isMemberLoading) return;
    if (!member) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    memberRepository
      .getMyAccessLogs(page, PAGE_SIZE)
      .then((res) => {
        setEntries(res.results);
        setTotal(res.total);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error al obtener el historial de ingresos';
        setError(message);
        setIsLoading(false);
      });
  }, [profile, member, isMemberLoading, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dayGroups = groupByDay(entries);

  if (isLoading || isMemberLoading) {
    return (
      <div className={styles['member-access-logs__loading']} role="status" aria-live="polite">
        Cargando historial de ingresos...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['member-access-logs__error']} role="alert">
        <p className={styles['member-access-logs__error-message']}>{error}</p>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className={styles['member-access-logs']} role="main">
        <header className={styles['member-access-logs__header']}>
          <h1 className={styles['member-access-logs__title']}>Mis Ingresos</h1>
          <p className={styles['member-access-logs__subtitle']}>Consulta el historial de tus visitas al gimnasio</p>
        </header>
        <div className={styles['member-access-logs__empty']}>
          <h2>Sin ingresos registrados</h2>
          <p>Aún no tienes visitas registradas con tu chip.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['member-access-logs']} role="main">
      <header className={styles['member-access-logs__header']}>
        <h1 className={styles['member-access-logs__title']}>Mis Ingresos</h1>
        <p className={styles['member-access-logs__subtitle']}>Consulta el historial de tus visitas al gimnasio</p>
      </header>

      <div className={styles['member-access-logs__groups']}>
        {dayGroups.map((group) => (
          <section key={group.dateKey} className={styles['member-access-logs__group']}>
            <h2 className={styles['member-access-logs__group-date']}>
              {formatDate(group.dateKey)}
            </h2>
            <div className={styles['member-access-logs__list']}>
              {group.entries.map((entry) => (
                <div key={entry.id} className={styles['member-access-logs__card']}>
                  <span className={styles['member-access-logs__icon']}>
                    <LoginOutlined />
                  </span>
                  <div className={styles['member-access-logs__card-body']}>
                    <span className={styles['member-access-logs__card-label']}>Ingreso registrado</span>
                    <span className={styles['member-access-logs__card-time']}>{formatTime(entry.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles['member-access-logs__pagination']}>
          <button
            type="button"
            className={styles['member-access-logs__page-btn']}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <span className={styles['member-access-logs__page-label']}>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className={styles['member-access-logs__page-btn']}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberAccessLogs;
