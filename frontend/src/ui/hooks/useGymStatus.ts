import { useEffect, useState, useCallback } from 'react';
import { getGymStatus } from '@/application/gym/getGymStatus.usecase';
import type { GymStatus } from '@/domain/gym/gym.types';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function useGymStatus() {
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getGymStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al consultar estado del gym';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, isLoading, error, refetch: fetchStatus };
}
