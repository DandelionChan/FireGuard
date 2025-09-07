import { haversineKm } from '@/lib/geo';
import type { City } from '@/data/bulgarianCities';
import { bulgarianMajorSettlements } from '@/data/bulgarianMajorSettlements';

export type NearestSettlement = {
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

export function findNearestSettlement(
  lat: number,
  lon: number,
  candidates: City[] = bulgarianMajorSettlements
): NearestSettlement | null {
  if (!candidates.length) return null;
  let best: NearestSettlement | null = null;
  for (const c of candidates) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (!best || d < best.distanceKm) best = { name: c.name, lat: c.lat, lon: c.lon, distanceKm: d };
  }
  return best;
}
