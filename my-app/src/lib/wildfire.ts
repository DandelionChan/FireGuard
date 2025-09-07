import { haversineKm } from '@/lib/geo';

export type NearbyAggregation = {
  count: number;
  frpSum: number;
  frpAvg: number;
  brightTi4Avg: number;
  brightTi5Avg: number;
  confidence: string; // aggregate (h if any high, else n if any nominal, else other)
  daynight: string;   // D/N if uniform, else 'M' mixed
  dateRange: string;  // single date or start…end
};

export type MinimalFire = {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  bright_ti5: number;
  frp: number;
  acq_date: string;
  confidence: string;
  daynight: string;
};

export function aggregateNearbyFires<T extends MinimalFire>(
  all: T[],
  centerLat: number,
  centerLng: number,
  radiusKm = 10
): { items: T[]; agg: NearbyAggregation } {
  const items = all.filter(f => haversineKm(centerLat, centerLng, f.latitude, f.longitude) <= radiusKm);
  const count = items.length || 1;
  const frpSum = items.reduce((s, f) => s + (f.frp || 0), 0);
  const frpAvg = frpSum / count;
  const brightTi4Avg = items.reduce((s, f) => s + (f.bright_ti4 || 0), 0) / count;
  const brightTi5Avg = items.reduce((s, f) => s + (f.bright_ti5 || 0), 0) / count;
  const hasHigh = items.some(f => f.confidence === 'h');
  const hasNominal = items.some(f => f.confidence === 'n');
  const confidence = hasHigh ? 'h' : hasNominal ? 'n' : (items[0]?.confidence ?? '');
  const dnSet = new Set(items.map(f => f.daynight));
  const daynight = dnSet.size === 1 ? (items[0]?.daynight ?? '') : 'M';
  const dates = items.map(f => f.acq_date).filter(Boolean).sort();
  const dateRange = dates.length ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]}…${dates[dates.length - 1]}`) : '';

  return { items, agg: { count, frpSum, frpAvg, brightTi4Avg, brightTi5Avg, confidence, daynight, dateRange } };
}

export type FireCluster<T extends MinimalFire> = {
  centerLat: number;
  centerLng: number;
  fires: T[];
};

export function clusterFires<T extends MinimalFire>(
  fires: T[],
  thresholdKm = 10
): FireCluster<T>[] {
  const n = fires.length;
  const visited = new Array<boolean>(n).fill(false);
  const clusters: FireCluster<T>[] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const queue: number[] = [i];
    const members: number[] = [i];

    while (queue.length) {
      const k = queue.shift()!;
      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const d = haversineKm(
          fires[k].latitude, fires[k].longitude,
          fires[j].latitude, fires[j].longitude
        );
        if (d <= thresholdKm) {
          visited[j] = true;
          queue.push(j);
          members.push(j);
        }
      }
    }

    let latSum = 0, lonSum = 0;
    const group: T[] = [];
    for (const idx of members) {
      latSum += fires[idx].latitude;
      lonSum += fires[idx].longitude;
      group.push(fires[idx]);
    }
    clusters.push({
      centerLat: latSum / members.length,
      centerLng: lonSum / members.length,
      fires: group
    });
  }

  return clusters;
}
