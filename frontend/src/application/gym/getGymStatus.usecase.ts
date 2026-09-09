import { gymRepository } from '@/infrastructure/api/gym.repository';
import type { GymStatus } from '@/domain/gym/gym.types';

export async function getGymStatus(): Promise<GymStatus> {
  return await gymRepository.getGymStatus();
}
