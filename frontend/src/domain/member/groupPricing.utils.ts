export interface GroupPricingLike {
  min_members: number;
  max_members?: number | null;
  price_per_person: number;
  active?: boolean;
}

export interface GroupPricingBounds {
  minPersons: number;
  maxPersons: number;
}

export interface GroupPricingSummary<T extends GroupPricingLike = GroupPricingLike> {
  tier: T | null;
  pricePerPerson: number;
  totalAmount: number;
  isValid: boolean;
  minPersons: number;
  maxPersons: number;
}

/**
 * Obtiene los límites mínimo y máximo de integrantes soportados según el tarifario grupal activo.
 * Retorna { minPersons: 2, maxPersons: 4 } si el tarifario está vacío.
 */
export function getGroupPricingBounds(pricing: GroupPricingLike[]): GroupPricingBounds {
  const activePricings = pricing.filter((p) => p.active !== false);
  if (activePricings.length === 0) {
    return { minPersons: 2, maxPersons: 4 };
  }

  const minPersons = Math.min(...activePricings.map((p) => p.min_members));
  const maxPersons = Math.max(...activePricings.map((p) => p.max_members || p.min_members));

  return {
    minPersons: Number.isFinite(minPersons) && minPersons > 0 ? minPersons : 2,
    maxPersons: Number.isFinite(maxPersons) && maxPersons > 0 ? maxPersons : 4,
  };
}

/**
 * Encuentra el rango de precio correspondiente para una cantidad específica de miembros.
 */
export function findGroupPricingTier<T extends GroupPricingLike>(
  pricing: T[],
  memberCount: number
): T | null {
  return (
    pricing.find((p) => {
      const isActive = p.active !== false;
      const meetsMin = memberCount >= p.min_members;
      const meetsMax = p.max_members == null || memberCount <= p.max_members;
      return isActive && meetsMin && meetsMax;
    }) || null
  );
}

/**
 * Calcula el resumen completo de precios, totales y estado de validez de un grupo.
 */
export function calculateGroupPricingSummary<T extends GroupPricingLike>(
  pricing: T[],
  memberCount: number
): GroupPricingSummary<T> {
  const bounds = getGroupPricingBounds(pricing);
  const tier = findGroupPricingTier(pricing, memberCount);
  const pricePerPerson = tier ? tier.price_per_person : 0;
  const totalAmount = pricePerPerson * memberCount;
  const isValid =
    memberCount >= bounds.minPersons &&
    memberCount <= bounds.maxPersons &&
    tier !== null;

  return {
    tier,
    pricePerPerson,
    totalAmount,
    isValid,
    minPersons: bounds.minPersons,
    maxPersons: bounds.maxPersons,
  };
}
