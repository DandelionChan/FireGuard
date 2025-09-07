import mapboxgl from 'mapbox-gl';
import type { Point } from 'geojson';
import type { FireData, WeatherData } from '../types';
import { clusterFires, aggregateNearbyFires } from '@/lib/wildfire';
import { computeFWIFromWeatherAPI } from '../services/weather';
import { findNearestSettlement } from '../utils/nearest';
import { notifyVolunteersForCity } from '../services/volunteers';

type Handlers = {
  setSelectedWeather: (w: WeatherData) => void;
  setActiveFire: (f: FireData | null) => void;
  setActiveReport: (v: boolean) => void;
  setPredictionTime: (t: 30 | 60 | 120) => void;
  setShowPredictions: (v: boolean | ((p: boolean) => boolean)) => void;
  addPredictions: (fires: FireData[]) => void;
  weatherApiKey: string;
  firesState: FireData[];
};

async function ensureFireIcon(map: mapboxgl.Map) {
  if (!map.hasImage('firms-fire-icon')) {
    await new Promise<void>((resolve) => {
      map.loadImage('https://docs.mapbox.com/mapbox-gl-js/assets/fire-station.png', (error, image) => {
        if (!error && image && !map.hasImage('firms-fire-icon')) {
          map.addImage('firms-fire-icon', image as HTMLImageElement);
        }
        resolve();
      });
    });
  }
}

export async function renderFires(map: mapboxgl.Map, fireData: FireData[], h: Handlers): Promise<number> {
  await ensureFireIcon(map);
  ['fires', 'fires-icon', 'report-icons', 'fires-count', 'fire-arrows', 'fire-circles'].forEach(id => map.getLayer(id) && map.removeLayer(id));
  ['fires', 'fire-arrows', 'fire-circles'].forEach(id => map.getSource(id) && map.removeSource(id));

  const clusters = clusterFires(fireData, 10);
  const features = clusters.map(cluster => {
    const nearest = findNearestSettlement(cluster.centerLat, cluster.centerLng);
    if (nearest) void notifyVolunteersForCity(nearest.name);
    const count = cluster.fires.length;
    const frpSum = cluster.fires.reduce((s, f) => s + (f.frp || 0), 0);
    const frpAvg = frpSum / count;
    const bt4Avg = cluster.fires.reduce((s, f) => s + (f.bright_ti4 || 0), 0) / count;
    const bt5Avg = cluster.fires.reduce((s, f) => s + (f.bright_ti5 || 0), 0) / count;
    const hasHigh = cluster.fires.some(f => f.confidence === 'h');
    const hasNominal = cluster.fires.some(f => f.confidence === 'n');
    const aggConfidence = hasHigh ? 'h' : hasNominal ? 'n' : (cluster.fires[0]?.confidence || '');
    const daynightSet = new Set(cluster.fires.map(f => f.daynight));
    const daynight = daynightSet.size === 1 ? cluster.fires[0].daynight : 'M';
    const dates = cluster.fires.map(f => f.acq_date).filter(Boolean).sort();
    const date = dates.length ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]}…${dates[dates.length - 1]}`) : '';
    const timeRaw = count === 1 ? (cluster.fires[0].acq_time || '') : '';
    const timeFmt = timeRaw ? `${timeRaw.toString().padStart(4, '0').slice(0, 2)}:${timeRaw.toString().padStart(4, '0').slice(2, 4)}` : '';
    const isReport = count === 1 ? !!(cluster.fires[0] as any).isReport : false;
    const imageUrl = count === 1 ? (cluster.fires[0] as any).imageUrl : undefined;
    return {
      type: 'Feature' as const,
      properties: {
        count,
        bright_ti4: Number.isFinite(bt4Avg) ? Number(bt4Avg.toFixed(2)) : 0,
        bright_ti5: Number.isFinite(bt5Avg) ? Number(bt5Avg.toFixed(2)) : 0,
        frp: Number.isFinite(frpAvg) ? Number(frpAvg.toFixed(2)) : 0,
        frp_sum: Number(frpSum.toFixed(2)),
        date,
        time: timeRaw,
        time_fmt: timeFmt,
        satellite: count === 1 ? cluster.fires[0].satellite : 'multiple',
        instrument: count === 1 ? cluster.fires[0].instrument : 'multiple',
        confidence: aggConfidence,
        daynight,
        isReport,
        imageUrl,
      },
      geometry: { type: 'Point' as const, coordinates: [cluster.centerLng, cluster.centerLat] },
    };
  });

  map.addSource('fires', { type: 'geojson', data: { type: 'FeatureCollection', features } });

  map.addLayer({
    id: 'fires',
    type: 'circle',
    source: 'fires',
    filter: ['any', ['>', ['get', 'count'], 1], ['all', ['<=', ['get', 'count'], 1], ['!', ['==', ['get', 'isReport'], true]]]],
    paint: {
      'circle-radius': ['case', ['>', ['get', 'count'], 1], 12, ['interpolate', ['linear'], ['get', 'frp'], 0, 6, 5, 8, 10, 10, 20, 12]],
      'circle-color': ['case', ['>', ['get', 'count'], 1], '#ff2d00', ['==', ['get', 'confidence'], 'h'], '#ff2d00', ['==', ['get', 'confidence'], 'n'], '#ff6b35', '#ff8c42'],
      'circle-opacity': 0.8,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
      'circle-stroke-opacity': 0.8,
    },
  });

  map.addLayer({ id: 'report-icons', type: 'symbol', source: 'fires', filter: ['all', ['<=', ['get', 'count'], 1], ['==', ['get', 'isReport'], true]], layout: { 'text-field': '📷', 'text-size': 16, 'text-allow-overlap': true, 'text-anchor': 'center' }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 } });

  map.addLayer({ id: 'fires-count', type: 'symbol', source: 'fires', filter: ['>', ['get', 'count'], 1], layout: { 'text-field': ['to-string', ['get', 'count']], 'text-size': 12, 'text-allow-overlap': true, 'text-anchor': 'center' }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1 } });

  const handleFireClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0] as mapboxgl.MapboxGeoJSONFeature;
    const geometry = feature.geometry as Point;
    const coordinates = (geometry.coordinates as [number, number]).slice() as [number, number];
    const properties = feature.properties as Record<string, unknown>;
    const timeStr = properties?.time as string | undefined;
    const formattedTime = timeStr ? `${timeStr.padStart(4, '0').slice(0, 2)}:${timeStr.padStart(4, '0').slice(2, 4)}` : 'N/A';

    let fireDatum: FireData = {
      latitude: coordinates[1] ?? 0,
      longitude: coordinates[0] ?? 0,
      bright_ti4: parseFloat(properties?.bright_ti4 as string) || 0,
      scan: 0,
      track: 0,
      acq_date: (properties?.date as string) || '',
      acq_time: (properties?.time as string) || '',
      satellite: (properties?.satellite as string) || '',
      instrument: (properties?.instrument as string) || '',
      confidence: (properties?.confidence as string) || '',
      version: (properties as any)?.version || '',
      bright_ti5: parseFloat(properties?.bright_ti5 as string) || 0,
      frp: parseFloat(properties?.frp as string) || 0,
      daynight: (properties?.daynight as string) || '',
      count: Number((properties as any)?.count ?? 1)
    };

    const { agg } = aggregateNearbyFires(h.firesState, fireDatum.latitude, fireDatum.longitude, 10);
    try {
      const res = aggregateNearbyFires(h.firesState, fireDatum.latitude, fireDatum.longitude, 10);
      const items = res.items || [];
      if ((res.agg.count || 1) > 1 && items.length) {
        const rep = [...items].sort((a, b) => {
          const aKey = parseInt((a.acq_date || '').replace(/-/g, '') + (a.acq_time || '').toString().padStart(4, '0'), 10) || 0;
          const bKey = parseInt((b.acq_date || '').replace(/-/g, '') + (b.acq_time || '').toString().padStart(4, '0'), 10) || 0;
          if (bKey !== aKey) return bKey - aKey;
          return (b.frp || 0) - (a.frp || 0);
        })[0];
        fireDatum = { ...rep, acq_time: (rep.acq_time || '').toString(), count: res.agg.count } as FireData;
      }
    } catch {}

    h.setActiveFire({ ...fireDatum, count: agg.count });
    h.setActiveReport(false);

    h.setSelectedWeather({
      location: { name: 'Fire Location', region: 'Unknown', country: 'Unknown', localtime: new Date().toISOString() },
      current: { temp_c: 25, condition: { text: 'Fire detected' }, humidity: 30, pressure_mb: 1013, wind_kph: 15, wind_dir: 'NW' },
      clickedCoords: { lat: coordinates[1], lng: coordinates[0] },
      firePrediction: { riskPercent: 100 },
    });

    const popup = new mapboxgl.Popup({ closeButton: true })
      .setLngLat(coordinates as [number, number])
      .setHTML(`
          <div class="bg-card p-4 rounded-lg shadow-lg max-w-xs">
            <h3 class="text-fire font-bold mb-3">🔥 Инструменти за пожар</h3>
            <div class="text-xs text-muted-foreground mb-1">Прогноза за разпространение</div>
            <div class="flex gap-2 mb-2">
              <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="60">1 ч</button>
              <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="120">2 ч</button>
            </div>
            <button id="toggle-prediction" class="w-full px-2 py-1 border border-fire text-fire rounded text-xs">Покажи прогноза</button>
          <button id="close-popup" class="w-full mt-2 px-2 py-1 border border-border rounded text-xs">Затвори</button></div>`)
      .addTo(map);

    const popupEl = popup.getElement();
    popupEl.querySelectorAll('.prediction-time').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const target = ev.currentTarget as HTMLElement;
        const time = parseInt(target.getAttribute('data-time') || '60', 10) as 60 | 120;
        h.setPredictionTime(time);
        h.setActiveFire(fireDatum);
        h.setShowPredictions(true);
        h.addPredictions([fireDatum]);
        const tgl = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
        if (tgl) tgl.textContent = 'Скрий прогноза';
      });
    });
    const toggleBtn = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        h.setShowPredictions((prev) => {
          const next = !prev;
          toggleBtn.textContent = next ? 'Скрий прогноза' : 'Покажи прогноза';
          if (next) h.addPredictions([fireDatum]);
          else h.addPredictions([]);
          return next;
        });
      });
    }
    const closeBtn = popupEl.querySelector('#close-popup') as HTMLButtonElement | null;
    if (closeBtn) closeBtn.addEventListener('click', () => popup.remove());
    popup.on('close', () => {
      h.setShowPredictions(false);
      h.setActiveFire(null);
      h.addPredictions([]);
    });
  };

  map.on('click', 'fires', handleFireClick);

  map.on('click', 'report-icons', async (e: mapboxgl.MapLayerMouseEvent) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0] as mapboxgl.MapboxGeoJSONFeature;
    const geometry = feature.geometry as Point;
    const [lng, lat] = (geometry.coordinates as [number, number]).slice() as [number, number];
    const properties = feature.properties as Record<string, any>;
    const imageUrl = properties?.imageUrl as string | undefined;
    if (!imageUrl) return;

    const popupHtml = `
        <div class="bg-card p-2 rounded max-w-xs">
          <div class="font-semibold mb-2">Подаден сигнал</div>
          <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">
            <img src="${imageUrl}" alt="report" style="width:220px;height:140px;object-fit:cover;border-radius:6px;border:1px solid #ddd" />
          </a>
          <div class="mt-2 text-xs text-muted-foreground">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          <div class="mt-3">
            <div class="text-xs text-muted-foreground mb-1">Прогноза за разпространение</div>
            <div class="flex gap-2 mb-2">
              <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="60">1 ч</button>
              <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="120">2 ч</button>
            </div>
            <button id="toggle-prediction" class="w-full px-2 py-1 border border-fire text-fire rounded text-xs">Покажи прогноза</button>
          </div>
        </div>`;
    const popup = new mapboxgl.Popup().setLngLat([lng, lat]).setHTML(popupHtml).addTo(map);
    try {
      if (h.weatherApiKey) {
        const wr = await fetch(`https://api.weatherapi.com/v1/current.json?key=${h.weatherApiKey}&q=${lat},${lng}&aqi=no`);
        if (wr.ok) {
          const weatherData: any = await wr.json();
          const fireRisk = computeFWIFromWeatherAPI(weatherData);
          h.setSelectedWeather({ ...weatherData, clickedCoords: { lat, lng }, firePrediction: { riskPercent: fireRisk.riskPercent } });
          h.setActiveFire(null);
          h.setActiveReport(true);
        }
      }
    } catch {}

    const popupEl = popup.getElement();
    popupEl.querySelectorAll('.prediction-time').forEach(btn => {
      btn.addEventListener('click', () => {
        const time = parseInt((btn as HTMLElement).getAttribute('data-time') || '60', 10) as 60 | 120;
        h.setPredictionTime(time);
        const fireDatum = { latitude: lat, longitude: lng, bright_ti4: 0, scan: 0, track: 0, acq_date: new Date().toISOString().slice(0,10), acq_time: '', satellite: 'REPORT', instrument: 'USER', confidence: 'n', version: '', bright_ti5: 0, frp: 0, daynight: 'D' } as FireData;
        h.setActiveFire(fireDatum);
        h.setShowPredictions(true);
        h.addPredictions([fireDatum]);
        const tgl = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
        if (tgl) tgl.textContent = 'Скрий прогноза';
      });
    });
    const toggleBtn = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        h.setShowPredictions(prev => {
          const next = !prev;
          toggleBtn.textContent = next ? 'Скрий прогноза' : 'Покажи прогноза';
          if (next) {
            const fireDatum = { latitude: lat, longitude: lng, bright_ti4: 0, scan: 0, track: 0, acq_date: new Date().toISOString().slice(0,10), acq_time: '', satellite: 'REPORT', instrument: 'USER', confidence: 'n', version: '', bright_ti5: 0, frp: 0, daynight: 'D' } as FireData;
            h.addPredictions([fireDatum]);
            h.setActiveFire(fireDatum);
          } else {
            h.addPredictions([]);
            h.setActiveFire(null);
          }
          return next;
        });
      });
    }
  });

  map.on('mouseenter', 'fires', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'fires', () => { map.getCanvas().style.cursor = ''; });

  return features.length;
}
