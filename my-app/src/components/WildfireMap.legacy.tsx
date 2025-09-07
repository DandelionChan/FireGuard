/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Flame, Cloud, Thermometer, Wind, Map as MapIcon, Image, Mountain, Moon, Camera } from 'lucide-react';
import { computeFWI, FWIResult } from "./FWI/ComputeFWI";
import type { Feature, LineString, Point, Polygon } from 'geojson';
import { bulgarianCities, CityRisk } from '@/data/bulgarianCities';
import { aggregateNearbyFires, clusterFires } from '@/lib/wildfire';

interface FireData {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  instrument: string;
  confidence: string;
  version: string;
  bright_ti5: number;
  frp: number;
  daynight: string;
  count?: number; // number of fires combined in cluster (1 for single)
  isReport?: boolean;
  imageUrl?: string;
}

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
    };
    humidity: number;
    pressure_mb: number;
    wind_kph: number;
    wind_dir: string;
    precip_mm?: number;
  };
  clickedCoords?: {
    lat: number;
    lng: number;
  };
  firePrediction?: {
    riskPercent: number;
  };
}

interface FireSpreadPrediction {
  direction: number; // degrees from north
  speed: number; // km/h
  radius: number; // km
  area: number; // km²
}

export function computeFWIFromWeatherAPI(weatherData: WeatherData): FWIResult {
  const temp = weatherData.current.temp_c;          // temperature °C
  const rh = weatherData.current.humidity;          // relative humidity %
  const wind = weatherData.current.wind_kph;        // wind speed km/h
  const rain = weatherData.current.precip_mm ?? 0;  // rain mm (last 24h)
  const month = new Date(weatherData.location.localtime).getMonth() + 1;

  return computeFWI({ temp, rh, wind, rain, month });
}

const WildfireMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [fires, setFires] = useState<FireData[]>([]);
  const [visibleFireCount, setVisibleFireCount] = useState<number>(0);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapboxToken] = useState<string>('pk.eyJ1IjoibmlraTEyMzQ0MzIzNCIsImEiOiJjbWY0M3Uxc3UwMWk3MmxzOHRpeXlzaDYyIn0.T0ITpwXgpcamkgDjcBsVVA');
  const [weatherApiKey] = useState<string>('fb97c129e07e4bc68e0152111250309');
  const [predictionTime, setPredictionTime] = useState<30 | 60 | 120>(30); // minutes
  const [showPredictions, setShowPredictions] = useState(false);
  const [activeFire, setActiveFire] = useState<FireData | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/dark-v11');
  // Always cluster within 10km; no UI toggle
  const DEFAULT_CENTER: [number, number] = [25.4858, 42.7339];

  // Report-a-fire state
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [reportImageUrl, setReportImageUrl] = useState<string | null>(null);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportSending, setReportSending] = useState<boolean>(false);
  const [reported, setReported] = useState<{ imageUrl: string; coords: { lat: number; lng: number }; time: string; filename?: string } | null>(null);
  const reportedMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeReport, setActiveReport] = useState<boolean>(false);

  const addReportedFireMarker = (lat: number, lng: number, imageUrl: string, filename?: string) => {
    if (!map.current) return;
    const el = document.createElement('div');
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.borderRadius = '50%';
    el.style.background = '#111827';
    el.style.border = '2px solid #fff';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
    el.style.cursor = 'pointer';
    el.textContent = '📷';
    el.title = 'Подаден сигнал';

    const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current);
    el.addEventListener('click', async (ev) => {
      ev.stopPropagation();
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
      const popup = new mapboxgl.Popup().setLngLat([lng, lat]).setHTML(popupHtml).addTo(map.current!);

      // Optionally refresh sidebar weather for this location
      if (weatherApiKey) {
        try {
          const wr = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${lat},${lng}&aqi=no`);
          if (wr.ok) {
            const weatherData: any = await wr.json();
            const fireRisk = computeFWIFromWeatherAPI(weatherData);
            setSelectedWeather({
              ...weatherData,
              clickedCoords: { lat, lng },
              firePrediction: { riskPercent: fireRisk.riskPercent }
            });
            setActiveFire(null);
            setReported({ imageUrl, coords: { lat, lng }, time: new Date().toLocaleString(), filename });
            setActiveReport(true);
          }
        } catch {}
      }

      // Attach prediction controls for reported fire
      const popupEl = popup.getElement();
      popupEl.querySelectorAll('.prediction-time').forEach(btn => {
        btn.addEventListener('click', () => {
          const time = parseInt((btn as HTMLElement).getAttribute('data-time') || '60', 10) as 60 | 120;
          setPredictionTime(time as any);
          // Build a minimal FireData for predictions at this location
          const fireDatum = {
            latitude: lat,
            longitude: lng,
            bright_ti4: 0,
            scan: 0,
            track: 0,
            acq_date: new Date().toISOString().slice(0,10),
            acq_time: '',
            satellite: 'REPORT',
            instrument: 'USER',
            confidence: 'n',
            version: '',
            bright_ti5: 0,
            frp: 0,
            daynight: 'D',
          } as FireData;
          setActiveFire(fireDatum);
          setShowPredictions(true);
          addFireSpreadPredictions([fireDatum]);
          const tgl = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
          if (tgl) tgl.textContent = 'Скрий прогноза';
        });
      });
      const toggleBtn = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          setShowPredictions(prev => {
            const next = !prev;
            toggleBtn.textContent = next ? 'Скрий прогноза' : 'Покажи прогноза';
            if (next) {
              const fireDatum = {
                latitude: lat,
                longitude: lng,
                bright_ti4: 0,
                scan: 0,
                track: 0,
                acq_date: new Date().toISOString().slice(0,10),
                acq_time: '',
                satellite: 'REPORT',
                instrument: 'USER',
                confidence: 'n',
                version: '',
                bright_ti5: 0,
                frp: 0,
                daynight: 'D',
              } as FireData;
              addFireSpreadPredictions([fireDatum]);
              setActiveFire(fireDatum);
            } else {
              addFireSpreadPredictions([]);
              setActiveFire(null);
            }
            return next;
          });
        });
      }
    });
    reportedMarkersRef.current.push(marker);
  };

  // Helper function to get risk color based on normalized fire risk (0–100%)
  // Uses a green→red gradient where low risk is green and high risk is red
  const getRiskColor = (riskPercent: number): string => {
    const clamped = Math.max(0, Math.min(100, riskPercent));
    const red = Math.round((clamped / 100) * 255);
    const green = Math.round((1 - clamped / 100) * 255);
    return `rgb(${red}, ${green}, 0)`;

  };

  // Helper function to get risk description
  const getRiskDescription = (riskPercent: number): string => {
    if (riskPercent < 25) return 'Нисък риск от пожар';
    if (riskPercent < 50) return 'Умерен риск от пожар';
    if (riskPercent < 75) return 'Висок риск от пожар';
    if (riskPercent < 100) return 'Много висок риск от пожар';
    return 'Открит активен пожар';
  };

  // Calculate fire spread prediction based on weather and fire data
  const calculateFireSpread = (fire: FireData, weather: WeatherData | null): FireSpreadPrediction => {
    if (!weather) {
      // Default values when no weather data
      return {
        direction: 0,
        speed: 0.5,
        radius: 0.1,
        area: 0.03
      };
    }

    const windSpeed = weather.current.wind_kph;
    const windDir = weather.current.wind_dir;
    const temp = weather.current.temp_c;
    const humidity = weather.current.humidity;
    const frp = fire.frp;

    // Convert wind direction to degrees (approximate)
    const windDirectionMap: { [key: string]: number } = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };

    const windDirection = windDirectionMap[windDir] || 0;

    // Calculate spread speed based on wind, temperature, and humidity
    // Higher wind speed, temperature, and lower humidity increase spread
    const windFactor = Math.min(windSpeed / 20, 2); // Cap at 2x
    const tempFactor = Math.max((temp - 15) / 20, 0.5); // Higher temp = faster spread
    const humidityFactor = Math.max((100 - humidity) / 50, 0.5); // Lower humidity = faster spread
    const frpFactor = Math.min(frp / 10, 2); // Higher fire power = faster spread

    const baseSpeed = 0.2; // km/h base speed
    const speed = baseSpeed * windFactor * tempFactor * humidityFactor * frpFactor;

    // Calculate radius based on time and speed
    const timeHours = predictionTime / 60;
    const radius = speed * timeHours;

    // Calculate area (assuming circular spread)
    const area = Math.PI * radius * radius;

    return {
      direction: windDirection,
      speed: speed,
      radius: radius,
      area: area
    };
  };

  // Convert degrees to radians
  const degToRad = (degrees: number): number => degrees * (Math.PI / 180);

  // Calculate arrow endpoint coordinates
  const calculateArrowEnd = (startLat: number, startLng: number, direction: number, distance: number): [number, number] => {
    const earthRadius = 6371; // km
    const latRad = degToRad(startLat);
    const lngRad = degToRad(startLng);
    const bearing = degToRad(direction);
    
    const endLat = Math.asin(
      Math.sin(latRad) * Math.cos(distance / earthRadius) +
      Math.cos(latRad) * Math.sin(distance / earthRadius) * Math.cos(bearing)
    );
    
    const endLng = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(distance / earthRadius) * Math.cos(latRad),
      Math.cos(distance / earthRadius) - Math.sin(latRad) * Math.sin(endLat)
    );
    
    return [endLat * (180 / Math.PI), endLng * (180 / Math.PI)];
  };

  const addCityMarkers = (cities: CityRisk[]) => {
    if (!map.current) return;

    const features: Feature<Polygon>[] = cities.map(city => {
      const radiusKm = 0.5 + city.risk / 20; // smaller radius scaled by risk
      const circlePoints: [number, number][] = [];
      const numPoints = 32;
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const circleLat = city.lat + (radiusKm / 111) * Math.cos(angle);
        const circleLng = city.lon + (radiusKm / (111 * Math.cos(degToRad(city.lat)))) * Math.sin(angle);
        circlePoints.push([circleLng, circleLat]);
      }

      return {
        type: 'Feature',
        properties: {
          name: city.name,
          risk: city.risk,
          color: getRiskColor(city.risk)
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePoints]
        }
      };
    });

    if (map.current.getLayer('city-risk-fill')) map.current.removeLayer('city-risk-fill');
    if (map.current.getLayer('city-risk-outline')) map.current.removeLayer('city-risk-outline');
    if (map.current.getSource('city-risk')) map.current.removeSource('city-risk');

    map.current.addSource('city-risk', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });

    map.current.addLayer({
      id: 'city-risk-fill',
      type: 'fill',
      source: 'city-risk',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.15
      }
    });

    map.current.addLayer({
      id: 'city-risk-outline',
      type: 'line',
      source: 'city-risk',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 22, 4],
        'line-opacity': 0.4
      }
    });

    cities.forEach(city => {
      const el = document.createElement('div');
      const color = getRiskColor(city.risk);
      const size = 4 + city.risk / 25;

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid #ffffff';
      el.title = `${city.name}: ${Math.round(city.risk)}%`;
      new mapboxgl.Marker(el).setLngLat([city.lon, city.lat]).addTo(map.current!);
    });
  };

  const loadCityRisks = async () => {
    const results: CityRisk[] = [];
    for (const city of bulgarianCities) {
      try {
        const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city.lat},${city.lon}&aqi=no`);
        const weather = await res.json();
        const risk = computeFWIFromWeatherAPI(weather).riskPercent;
        results.push({ ...city, risk });
      } catch {
        results.push({ ...city, risk: 0 });
      }
    }
    addCityMarkers(results);
  };

  // Fetch wildfire data
  const fetchFireData = async () => {
    try {
      setLoading(true);
      const url = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/a4ea9f5afb0b12f1e948a47124b75dc8/VIIRS_SNPP_NRT/22,41,28,44/2';

      const response = await fetch(url);
      const csvText = await response.text();

      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setFires([]);
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const fireData: FireData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= headers.length) {
          const fire: Record<string, string> = {};
          headers.forEach((header, index) => {
            fire[header] = values[index]?.trim();
          });
          
          if (fire.latitude && fire.longitude) {
            fireData.push({
              latitude: parseFloat(fire.latitude),
              longitude: parseFloat(fire.longitude),
              bright_ti4: parseFloat(fire.bright_ti4) || 0,
              scan: parseFloat(fire.scan) || 0,
              track: parseFloat(fire.track) || 0,
              acq_date: fire.acq_date || '',
              acq_time: fire.acq_time || '',
              satellite: fire.satellite || '',
              instrument: fire.instrument || '',
              confidence: fire.confidence || '',
              version: fire.version || '',
              bright_ti5: parseFloat(fire.bright_ti5) || 0,
              frp: parseFloat(fire.frp) || 0,
              daynight: fire.daynight || '',
            });
          }
        }
      }
      
      // Fetch user reports and merge
      let reports: FireData[] = [];
      try {
        const r = await fetch('http://localhost:3000/detections');
        if (r.ok) {
          const arr = await r.json();
          if (Array.isArray(arr)) {
            reports = arr
              .map((rep: any) => {
                const lat = parseFloat(rep.lat ?? rep.latitude);
                const lng = parseFloat(rep.lng ?? rep.lon ?? rep.longitude);
                const filename = rep.filename || rep.file;
                if (!isFinite(lat) || !isFinite(lng)) return null;
                const created = rep.createdAt || rep.created_at || '';
                let acq_date = '';
                let acq_time = '';
                if (created) {
                  try {
                    const d = new Date(created);
                    acq_date = d.toISOString().slice(0, 10);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    acq_time = `${hh}${mm}`;
                  } catch {}
                }
                const imageUrl = filename ? `http://localhost:3000/uploads/fire/${filename}` : undefined;
                const item: FireData = {
                  latitude: lat,
                  longitude: lng,
                  bright_ti4: 0,
                  scan: 0,
                  track: 0,
                  acq_date,
                  acq_time,
                  satellite: 'REPORT',
                  instrument: 'USER',
                  confidence: 'n',
                  version: '',
                  bright_ti5: 0,
                  frp: 0,
                  daynight: 'D',
                  isReport: true,
                  imageUrl,
                };
                return item;
              })
              .filter(Boolean) as FireData[];
          }
        }
      } catch {}

      const allFires = [...fireData, ...reports];
      setFires(allFires);
      await addFireMarkersToMap(allFires);
    } catch (error) {
      console.error('Error fetching fire data:', error);
      // Fallback to mock data for demonstration
      const mockFires: FireData[] = [
        {
          latitude: 42.7,
          longitude: 25.5,
          bright_ti4: 367,
          scan: 0.43,
          track: 0.62,
          acq_date: '2025-09-03',
          acq_time: '934',
          satellite: 'N',
          instrument: 'VIIRS',
          confidence: 'h',
          version: '2.0NRT',
          bright_ti5: 319.2,
          frp: 10.21,
          daynight: 'D',
        },
        {
          latitude: 43.2,
          longitude: 24.8,
          bright_ti4: 343.17,
          scan: 0.47,
          track: 0.64,
          acq_date: '2025-09-03',
          acq_time: '1113',
          satellite: 'N',
          instrument: 'VIIRS',
          confidence: 'n',
          version: '2.0NRT',
          bright_ti5: 312.97,
          frp: 3.7,
          daynight: 'D',
        }
      ];
      // Try to load reports even if NASA failed
      try {
        const r = await fetch('http://localhost:3000/detections');
        if (r.ok) {
          const arr = await r.json();
          const reports = Array.isArray(arr)
            ? (arr.map((rep: any) => {
                const lat = parseFloat(rep.lat ?? rep.latitude);
                const lng = parseFloat(rep.lng ?? rep.lon ?? rep.longitude);
                const filename = rep.filename || rep.file;
                if (!isFinite(lat) || !isFinite(lng)) return null;
                const imageUrl = filename ? `http://localhost:3000/uploads/fire/${filename}` : undefined;
                return {
                  latitude: lat, longitude: lng, bright_ti4: 0, scan: 0, track: 0,
                  acq_date: '', acq_time: '', satellite: 'REPORT', instrument: 'USER', confidence: 'n', version: '', bright_ti5: 0, frp: 0, daynight: 'D', isReport: true, imageUrl
                } as FireData;
              }).filter(Boolean) as FireData[])
            : [];
          const all = [...mockFires, ...reports];
          setFires(all);
          await addFireMarkersToMap(all);
        } else {
          setFires(mockFires);
          await addFireMarkersToMap(mockFires);
        }
      } catch {
        setFires(mockFires);
        await addFireMarkersToMap(mockFires);
      }
    } finally {
      setLoading(false);
    }
  };

  const addFireMarkersToMap = async (fireData: FireData[]) => {
    if (!map.current) return;

    // Ensure icon for FIRMS active fires is available
    if (!map.current.hasImage('firms-fire-icon')) {
      await new Promise<void>((resolve) => {
        map.current!.loadImage('https://docs.mapbox.com/mapbox-gl-js/assets/fire-station.png', (error, image) => {
          if (!error && image && !map.current!.hasImage('firms-fire-icon')) {
            map.current!.addImage('firms-fire-icon', image as HTMLImageElement);
          }
          resolve();
        });
      });
    }

    // Remove existing fire layers
    ['fires', 'fires-icon', 'fires-badge-bg', 'fires-badge-text', 'fires-time-bg', 'fires-time-text', 'fire-arrows', 'fire-circles'].forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });
    ['fires', 'fire-arrows', 'fire-circles'].forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    // Always cluster within 10km
    const clusters = clusterFires(fireData, 10);
    const features = clusters.map(cluster => {
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
      // For single-fire clusters, pass through time and a formatted time string for time badge
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
        geometry: {
          type: 'Point' as const,
          coordinates: [cluster.centerLng, cluster.centerLat],
        },
      };
    });

    map.current.addSource('fires', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    // Update visible fire (circle) count for header
    setVisibleFireCount(features.length);

    // Centered count for clusters (add after base circles)

    // Base circles for fire intensity (single circle for both singles and clusters)
    map.current.addLayer({
      id: 'fires',
      type: 'circle',
      source: 'fires',
      filter: [
        'any',
        ['>', ['get', 'count'], 1],
        ['all', ['<=', ['get', 'count'], 1], ['!', ['==', ['get', 'isReport'], true]]]
      ],
      paint: {
        'circle-radius': [
          'case',
          ['>', ['get', 'count'], 1], 12,
          ['interpolate', ['linear'], ['get', 'frp'], 0, 6, 5, 8, 10, 10, 20, 12]
        ],
        'circle-color': [
          'case',
          ['>', ['get', 'count'], 1], '#ff2d00',
          ['==', ['get', 'confidence'], 'h'], '#ff2d00',
          ['==', ['get', 'confidence'], 'n'], '#ff6b35',
          '#ff8c42'
        ],
        'circle-opacity': 0.8,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.8,
      },
    });

    // Report single icons (camera) for non-clustered reports
    map.current.addLayer({
      id: 'report-icons',
      type: 'symbol',
      source: 'fires',
      filter: ['all', ['<=', ['get', 'count'], 1], ['==', ['get', 'isReport'], true]],
      layout: {
        'text-field': '📷',
        'text-size': 16,
        'text-allow-overlap': true,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1
      }
    });

    // Centered count number for clusters
    map.current.addLayer({
      id: 'fires-count',
      type: 'symbol',
      source: 'fires',
      filter: ['>', ['get', 'count'], 1],
      layout: {
        'text-field': ['to-string', ['get', 'count']],
        'text-size': 12,
        'text-allow-overlap': true,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1
      }
    });

    // Add popup on click with enhanced information and fire prediction
    const handleFireClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0] as mapboxgl.MapboxGeoJSONFeature;
      const geometry = feature.geometry as Point;
      const coordinates = (geometry.coordinates as [number, number]).slice() as [number, number];
      const properties = feature.properties as Record<string, unknown>;

      // Format time for display
      const timeStr = properties?.time as string | undefined;
      const formattedTime = timeStr ? `${timeStr.padStart(4, '0').slice(0, 2)}:${timeStr.padStart(4, '0').slice(2, 4)}` : 'N/A';

      // Build FireData object for predictions
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
        version: (properties?.version as string) || '',
        bright_ti5: parseFloat(properties?.bright_ti5 as string) || 0,
        frp: parseFloat(properties?.frp as string) || 0,
        daynight: (properties?.daynight as string) || '',
        count: Number((properties as any)?.count ?? 1)
      };

      // Also compute nearby (≤10 km) aggregation for description only (no visual clustering)
      const { agg } = aggregateNearbyFires(
        fires,
        fireDatum.latitude,
        fireDatum.longitude,
        10
      );

      // If this is a cluster, pick a representative underlying fire (latest by date/time, then highest FRP)
      try {
        const res = aggregateNearbyFires(fires, fireDatum.latitude, fireDatum.longitude, 10);
        const items = res.items || [];
        if ((res.agg.count || 1) > 1 && items.length) {
          const rep = [...items].sort((a, b) => {
            const aKey = parseInt((a.acq_date || '').replace(/-/g, '') + (a.acq_time || '').toString().padStart(4, '0'), 10) || 0;
            const bKey = parseInt((b.acq_date || '').replace(/-/g, '') + (b.acq_time || '').toString().padStart(4, '0'), 10) || 0;
            if (bKey !== aKey) return bKey - aKey;
            return (b.frp || 0) - (a.frp || 0);
          })[0];
          fireDatum = {
            latitude: rep.latitude,
            longitude: rep.longitude,
            bright_ti4: rep.bright_ti4 || 0,
            scan: rep.scan || 0,
            track: rep.track || 0,
            acq_date: rep.acq_date || '',
            acq_time: (rep.acq_time || '').toString(),
            satellite: rep.satellite || '',
            instrument: rep.instrument || '',
            confidence: rep.confidence || '',
            version: (rep as any).version || '',
            bright_ti5: rep.bright_ti5 || 0,
            frp: rep.frp || 0,
            daynight: rep.daynight || '',
            count: res.agg.count
          };
        }
      } catch {}

      // Keep selected fire as active; store count on it for panel rendering
      setActiveFire({ ...fireDatum, count: agg.count });
      setActiveReport(false);

      // Set basic weather data without fire prediction
      setSelectedWeather({
        location: {
          name: "Fire Location",
          region: "Unknown",
          country: "Unknown",
          localtime: new Date().toISOString()
        },
        current: {
          temp_c: 25,
          condition: {
            text: "Fire detected"
          },
          humidity: 30,
          pressure_mb: 1013,
          wind_kph: 15,
          wind_dir: "NW"
        },
        clickedCoords: {
          lat: coordinates[1],
          lng: coordinates[0]
        },
        firePrediction: { riskPercent: 100 }
      });

      // Add popup with prediction controls (Bulgarian UI)
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
        .addTo(map.current!);

      // Replace content with detailed CSV info and aggregation summary (≤10 km)
      {
        const count = agg.count;
        let html = '';
        if (count > 1) {
          const confidenceText = agg.confidence === 'h' ? 'High' : agg.confidence === 'n' ? 'Nominal' : 'Low';
          const dn = agg.daynight === 'M' ? 'Mixed' : (agg.daynight === 'D' ? 'Day' : 'Night');
          const frpSum = agg.frpSum.toFixed(2);
          html = `
            <div class="bg-card p-4 rounded-lg shadow-lg max-w-xs">
              <h3 class="text-fire font-bold mb-3">🔥 ${count} Nearby Fires (≤10 km)</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-muted-foreground">Center Lat:</span><span class="font-medium">${coordinates[1].toFixed(5)}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">Center Lon:</span><span class="font-medium">${coordinates[0].toFixed(5)}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">bright_ti4 (avg):</span><span class="font-medium">${agg.brightTi4Avg.toFixed(2)} K</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">bright_ti5 (avg):</span><span class="font-medium">${agg.brightTi5Avg.toFixed(2)} K</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">frp:</span><span class="font-medium text-fire">Σ ${frpSum} MW (avg ${agg.frpAvg.toFixed(2)} MW)</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">confidence:</span><span class="font-medium">${confidenceText}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">acq_date(s):</span><span class="font-medium">${agg.dateRange || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">daynight:</span><span class="font-medium">${dn}</span></div>
              </div>
            </div>`;
        } else {
          const confidenceText = (properties?.confidence as string) === 'h' ? 'High' : (properties?.confidence as string) === 'n' ? 'Nominal' : 'Low';
          const dn = (properties?.daynight as string) === 'D' ? 'Day' : 'Night';
          html = `
            <div class="bg-card p-4 rounded-lg shadow-lg max-w-xs">
              <h3 class="text-fire font-bold mb-3">🔥 Fire Information</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-muted-foreground">latitude:</span><span class="font-medium">${coordinates[1].toFixed(5)}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">longitude:</span><span class="font-medium">${coordinates[0].toFixed(5)}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">bright_ti4:</span><span class="font-medium">${properties?.bright_ti4}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">bright_ti5:</span><span class="font-medium">${properties?.bright_ti5}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">scan:</span><span class="font-medium">${(properties as any)?.scan ?? ''}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">track:</span><span class="font-medium">${(properties as any)?.track ?? ''}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">acq_date:</span><span class="font-medium">${properties?.date}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">acq_time:</span><span class="font-medium">${formattedTime}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">satellite:</span><span class="font-medium">${properties?.satellite}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">instrument:</span><span class="font-medium">${properties?.instrument}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">confidence:</span><span class="font-medium">${confidenceText}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">version:</span><span class="font-medium">${(properties as any)?.version ?? ''}</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">frp:</span><span class="font-medium text-fire">${properties?.frp} MW</span></div>
                <div class="flex justify-between"><span class="text-muted-foreground">daynight:</span><span class="font-medium">${dn}</span></div>
              </div>
              <div class="mt-4">
                <div class="text-xs text-muted-foreground mb-1">Fire Spread Prediction</div>
                <div class="flex gap-2 mb-2">
                  <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="30">30m</button>
                  <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="60">1h</button>
                  <button class="prediction-time px-2 py-1 text-xs rounded bg-fire text-white" data-time="120">2h</button>
                </div>
                <button id="toggle-prediction" class="w-full px-2 py-1 border border-fire text-fire rounded text-xs">Show Prediction</button>
              </div>
            </div>`;
        }
        // Popup now only shows the controls already set above.
        // Keep this block minimal to avoid duplicating information.
      }

      const popupEl = popup.getElement();

      // Attach event listeners for prediction controls
      popupEl.querySelectorAll('.prediction-time').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const target = ev.currentTarget as HTMLElement;
          const time = parseInt(target.getAttribute('data-time') || '30', 10) as 30 | 60 | 120;
          setPredictionTime(time);
          setActiveFire(fireDatum);
          setShowPredictions(true);
          addFireSpreadPredictions([fireDatum]);
          const tgl = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
          if (tgl) tgl.textContent = 'Скрий прогноза';
        });
      });

      const toggleBtn = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          setShowPredictions(prev => {
            const next = !prev;
            toggleBtn.textContent = next ? 'Скрий прогноза' : 'Покажи прогноза';
            if (next) {
              addFireSpreadPredictions([fireDatum]);
            } else {
              addFireSpreadPredictions([]);
            }
            return next;
          });
        });
      }

      const closeBtn = popupEl.querySelector('#close-popup') as HTMLButtonElement | null;
      if (closeBtn) {
        closeBtn.addEventListener('click', () => popup.remove());
      }

      popup.on('close', () => {
        setShowPredictions(false);
        setActiveFire(null);
        addFireSpreadPredictions([]);
      });
    };

    map.current.on('click', 'fires', handleFireClick);
    map.current.on('click', 'report-icons', async (e: mapboxgl.MapLayerMouseEvent) => {
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
      const popup = new mapboxgl.Popup().setLngLat([lng, lat]).setHTML(popupHtml).addTo(map.current!);

      // Load weather and set sidebar selection
      try {
        if (weatherApiKey) {
          const wr = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${lat},${lng}&aqi=no`);
          if (wr.ok) {
            const weatherData: any = await wr.json();
            const fireRisk = computeFWIFromWeatherAPI(weatherData);
            setSelectedWeather({
              ...weatherData,
              clickedCoords: { lat, lng },
              firePrediction: { riskPercent: fireRisk.riskPercent }
            });
            setActiveFire(null);
            setReported({ imageUrl, coords: { lat, lng }, time: new Date().toLocaleString() });
            setActiveReport(true);
          }
        }
      } catch {}

      const popupEl = popup.getElement();
      popupEl.querySelectorAll('.prediction-time').forEach(btn => {
        btn.addEventListener('click', () => {
          const time = parseInt((btn as HTMLElement).getAttribute('data-time') || '60', 10) as 60 | 120;
          setPredictionTime(time as any);
          const fireDatum = {
            latitude: lat,
            longitude: lng,
            bright_ti4: 0,
            scan: 0,
            track: 0,
            acq_date: new Date().toISOString().slice(0,10),
            acq_time: '',
            satellite: 'REPORT',
            instrument: 'USER',
            confidence: 'n',
            version: '',
            bright_ti5: 0,
            frp: 0,
            daynight: 'D',
          } as FireData;
          setActiveFire(fireDatum);
          setShowPredictions(true);
          addFireSpreadPredictions([fireDatum]);
          const tgl = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
          if (tgl) tgl.textContent = 'Скрий прогноза';
        });
      });
      const toggleBtn = popupEl.querySelector('#toggle-prediction') as HTMLButtonElement | null;
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          setShowPredictions(prev => {
            const next = !prev;
            toggleBtn.textContent = next ? 'Скрий прогноза' : 'Покажи прогноза';
            if (next) {
              const fireDatum = {
                latitude: lat,
                longitude: lng,
                bright_ti4: 0,
                scan: 0,
                track: 0,
                acq_date: new Date().toISOString().slice(0,10),
                acq_time: '',
                satellite: 'REPORT',
                instrument: 'USER',
                confidence: 'n',
                version: '',
                bright_ti5: 0,
                frp: 0,
                daynight: 'D',
              } as FireData;
              addFireSpreadPredictions([fireDatum]);
              setActiveFire(fireDatum);
            } else {
              addFireSpreadPredictions([]);
              setActiveFire(null);
            }
            return next;
          });
        });
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'fires', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'fires', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });
  };

  // Add fire spread predictions (arrows and circles) for individual fires
  const addFireSpreadPredictions = (fireData: FireData[]) => {
    if (!map.current) return;

    // Remove existing prediction layers
    ['fire-arrows', 'fire-circles', 'fire-circles-stroke'].forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });
    ['fire-arrows', 'fire-circles'].forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    const arrowFeatures: Feature<LineString>[] = [];
    const circleFeatures: Feature<Polygon>[] = [];

    fireData.forEach(fire => {
      const prediction = calculateFireSpread(fire, selectedWeather);
      
      // Only add predictions if they have meaningful values
      if (prediction.radius > 0.01) {
        // Create arrow feature
        const arrowEnd = calculateArrowEnd(
          fire.latitude, 
          fire.longitude, 
          prediction.direction, 
          prediction.radius * 0.5 // Arrow length is half the predicted radius
        );

        arrowFeatures.push({
          type: 'Feature',
          properties: {
            fireId: `${fire.latitude}-${fire.longitude}`,
            speed: prediction.speed,
            direction: prediction.direction,
            radius: prediction.radius
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [fire.longitude, fire.latitude],
              [arrowEnd[1], arrowEnd[0]]
            ]
          }
        });

        // Create circle feature for spread area
        const circlePoints: [number, number][] = [];
        const numPoints = 32;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const circleLat = fire.latitude + (prediction.radius / 111) * Math.cos(angle);
          const circleLng = fire.longitude + (prediction.radius / (111 * Math.cos(degToRad(fire.latitude)))) * Math.sin(angle);
          circlePoints.push([circleLng, circleLat]);
        }
        circlePoints.push(circlePoints[0]); // Close the circle

        circleFeatures.push({
          type: 'Feature',
          properties: {
            fireId: `${fire.latitude}-${fire.longitude}`,
            radius: prediction.radius,
            area: prediction.area,
            timeMinutes: predictionTime
          },
          geometry: {
            type: 'Polygon',
            coordinates: [circlePoints]
          }
        });
      }
    });

    // Only add layers if there are features
    if (arrowFeatures.length > 0) {
      // Add arrow source and layer (rendered as lines without heads for reliability)
      map.current.addSource('fire-arrows', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: arrowFeatures
        }
      });

      map.current.addLayer({
        id: 'fire-arrows',
        type: 'line',
        source: 'fire-arrows',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ff6b35',
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 2, 22, 6],
          'line-opacity': 0.9
        }
      });
    }

    if (circleFeatures.length > 0) {
      // Add circle source and layer
      map.current.addSource('fire-circles', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: circleFeatures
        }
      });

      map.current.addLayer({
        id: 'fire-circles',
        type: 'fill',
        source: 'fire-circles',
        paint: {
          'fill-color': '#ff6b35',
          'fill-opacity': 0.25
        }
      });

      map.current.addLayer({
        id: 'fire-circles-stroke',
        type: 'line',
        source: 'fire-circles',
        paint: {
          'line-color': '#ff6b35',
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 3, 22, 6],
          'line-opacity': 0.8
        }
      });
    }
  };

  // Update predictions when settings or active fire change
  useEffect(() => {
    if (activeFire && showPredictions) {
      addFireSpreadPredictions([activeFire]);
    } else {
      addFireSpreadPredictions([]);
    }
  }, [predictionTime, showPredictions, selectedWeather, activeFire]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: DEFAULT_CENTER,
      zoom: 6,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Click handler for weather data
    map.current.on('click', async (e) => {
      // Check if the click was on a fire marker
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['fires-icon', 'fire-arrows', 'fire-circles']
      });
      
      // If clicking on a fire marker, don't fetch weather data
      if (features.length > 0) {
        return;
      }

      if (!weatherApiKey) {
        alert('Моля, въведете вашия WeatherAPI ключ');
        return;
      }

      setLoading(true);
      try {
        // Fetch weather data first
        const weatherResponse = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${e.lngLat.lat},${e.lngLat.lng}&aqi=no`);
        
        if (!weatherResponse.ok) {
          throw new Error('Няма налични метеоданни за тази локация');
        }
        
        const weatherData: WeatherData = await weatherResponse.json();
        const fireRisk = computeFWIFromWeatherAPI(weatherData);

        setActiveReport(false);
        setSelectedWeather({
          ...weatherData,
          clickedCoords: {
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          },
          firePrediction: { riskPercent: fireRisk.riskPercent }
        });
      } catch (error) {
        console.error('Error fetching weather data:', error);
        // Try to get weather for nearest major city as fallback
        try {
          const fallbackResponse = await fetch(
            `https://api.weatherapi.com/v1/search.json?key=${weatherApiKey}&q=${e.lngLat.lat},${e.lngLat.lng}`
          );
          const locations = await fallbackResponse.json();
          
          if (locations && locations.length > 0) {
            const nearestLocation = locations[0];
            const weatherResponse = await fetch(
              `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${nearestLocation.lat},${nearestLocation.lon}&aqi=no`
            );
            const weatherData: WeatherData = await weatherResponse.json();
            const fireRisk = computeFWIFromWeatherAPI(weatherData);
            setSelectedWeather({
              ...weatherData,
              clickedCoords: {
                lat: e.lngLat.lat,
                lng: e.lngLat.lng
              },
              firePrediction: { riskPercent: fireRisk.riskPercent }
            });
          }
        } catch (fallbackError) {
          alert('Неуспех при получаване на данни за времето за тази локация');
        }
      } finally {
        setLoading(false);
      }
    });

    void fetchFireData();
    void loadCityRisks();

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
     

      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative" >
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Report a fire toggle button (side) */}
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-fire text-white rounded px-3 py-2 shadow hover:opacity-90 flex items-center gap-2"
            onClick={() => setReportOpen((v) => !v)}
          >
            <Camera className="h-4 w-4" />
            Подай сигнал
          </button>

          {/* Report a fire panel */}
          {reportOpen && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-80 bg-card border border-border rounded-lg shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Подай сигнал</h4>
                <button className="text-xs border px-2 py-1 rounded" onClick={() => setReportOpen(false)}>Затвори</button>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Снимка</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setReportImage(f);
                    if (reportImageUrl) URL.revokeObjectURL(reportImageUrl);
                    setReportImageUrl(f ? URL.createObjectURL(f) : null);
                  }}
                />
                {reportImageUrl && (
                  <img src={reportImageUrl} alt="report preview" className="w-full h-32 object-cover rounded border" />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Координати</label>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs border px-2 py-1 rounded"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('Геолокацията не се поддържа');
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => setReportCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                        () => alert('Неуспешно получаване на местоположение')
                      );
                    }}
                  >
                    Текущо местоположение
                  </button>
                  {reportCoords && (
                    <span className="text-xs text-muted-foreground">{reportCoords.lat.toFixed(5)}, {reportCoords.lng.toFixed(5)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  disabled={reportSending}
                  onClick={async () => {
                    if (!reportImage || !reportCoords) {
                      alert('Моля, качете снимка и задайте местоположение');
                      return;
                    }
                    try {
                      setReportSending(true); 
                      const fd = new FormData();
                      fd.append('file', reportImage);
                      fd.append('lat', String(reportCoords.lat));
                      fd.append('lon', String(reportCoords.lng));
                      const resp = await fetch('http://localhost:3000/detections', {
                        method: 'POST',
                        body: fd,
                      });
                      if (!resp.ok) throw new Error('server error');
                      const data = await resp.json().catch(() => ({} as any));
                      const rLat = typeof data.lat === 'number' ? data.lat : reportCoords.lat;
                      const rLng = typeof data.lng === 'number' ? data.lng : (typeof data.lon === 'number' ? data.lon : reportCoords.lng);
                      const filename = data.filename || data.file || undefined;
                      const imageLink = filename ? `http://localhost:3000/uploads/fires/${filename}` : (reportImageUrl || '');

                      // show marker and sidebar on success, then finish early to avoid duplicate logic
                      setReported({ imageUrl: imageLink, coords: { lat: rLat, lng: rLng }, time: new Date().toLocaleString(), filename });
                      setActiveReport(true);
                      addReportedFireMarker(rLat, rLng, imageLink, filename);
                      if (weatherApiKey) {
                        try {
                          const wr = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${rLat},${rLng}&aqi=no`);
                          if (wr.ok) {
                            const weatherData: any = await wr.json();
                            const fireRisk = computeFWIFromWeatherAPI(weatherData);
                            setSelectedWeather({
                              ...weatherData,
                              clickedCoords: { lat: rLat, lng: rLng },
                              firePrediction: { riskPercent: fireRisk.riskPercent }
                            });
                            setActiveFire(null);
                          }
                        } catch {}
                      }
                      setReportOpen(false);
                      setReportSending(false);
                      return;

                      // Success UI
                      setReported({ imageUrl: reportImageUrl!, coords: reportCoords, time: new Date().toLocaleString() });

                      // Fetch weather for reported coords
                      if (weatherApiKey) {
                        try {
                          const wr = await fetch(`https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${reportCoords.lat},${reportCoords.lng}&aqi=no`);
                          if (wr.ok) {
                            const weatherData: any = await wr.json();
                            const fireRisk = computeFWIFromWeatherAPI(weatherData);
                            setSelectedWeather({
                              ...weatherData,
                              clickedCoords: { lat: reportCoords.lat, lng: reportCoords.lng },
                              firePrediction: { riskPercent: fireRisk.riskPercent }
                            });
                            // Do not set activeFire to keep risk panel visible for reported case
                            setActiveFire(null);
                          }
                        } catch {}
                      }

                      setReportOpen(false);
                    } catch (e) {
                    } finally {
                      setReportSending(false);
                    }
                  }}
                  className="text-sm bg-fire text-white rounded px-3 py-1 disabled:opacity-60"
                >
                  {reportSending ? 'Изпращане…' : 'Изпрати'}
                </button>
              </div>
            </div>
          )}

          {/* Map style buttons (bottom-right) */}
          <div className="absolute bottom-16 right-2 z-10 flex gap-2">
            {[
              { key: 'streets', style: 'mapbox://styles/mapbox/streets-v12', icon: <MapIcon className="h-4 w-4" />, label: 'Улици' },
              { key: 'satellite', style: 'mapbox://styles/mapbox/satellite-streets-v12', icon: <Image className="h-4 w-4" />, label: 'Сателит' },
              { key: 'outdoors', style: 'mapbox://styles/mapbox/outdoors-v12', icon: <Mountain className="h-4 w-4" />, label: 'Природа' },
              { key: 'dark', style: 'mapbox://styles/mapbox/dark-v11', icon: <Moon className="h-4 w-4" />, label: 'Тъмна' },
            ].map(({ key, style, icon, label }) => (
              <button
                key={key}
                title={label}
                aria-label={label}
                onClick={() => {
                  setMapStyle(style);
                  map.current?.setStyle(style);
                  map.current?.once('styledata', () => {
                    void addFireMarkersToMap(fires);
                  });
                }}
                className={`bg-white/90 text-black hover:bg-white transition shadow border border-border rounded-full p-2 flex items-center justify-center ${mapStyle === style ? 'ring-2 ring-fire' : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Active fires count (bottom-right) */}
          <div className="absolute bottom-2 right-2 z-10 bg-card/80 backdrop-blur px-3 py-1 rounded border border-border text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-fire" />
            <span>{visibleFireCount} Активни пожари</span>
          </div>
          {/* Clustering is always on at 10km; no toggle */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-card p-4 rounded-lg shadow-emergency">
                <div className="animate-spin h-6 w-6 border-2 border-fire border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-foreground">Loading...</p>
              </div>
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedWeather && (
          <div className="w-80 bg-card border-l border-border p-4 relative">
            <button
              className="absolute top-2 right-2 text-xs px-2 py-1 border rounded"
              onClick={() => {
                setSelectedWeather(null);
                setActiveFire(null);
                setShowPredictions(false);
                addFireSpreadPredictions([]);
                setActiveReport(false);
              }}
            >
              Затвори
            </button>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Метеорологична информация
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground">{selectedWeather.location.name}</h4>
                <p className="text-muted-foreground capitalize">{selectedWeather.current.condition.text}</p>
                {selectedWeather.clickedCoords && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Най-близка метеостанция до избраната локация ({selectedWeather.clickedCoords.lat.toFixed(3)}, {selectedWeather.clickedCoords.lng.toFixed(3)})
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-fire" />
                  <div>
                    <p className="text-sm text-muted-foreground">Температура</p>
                    <p className="font-medium">{Math.round(selectedWeather.current.temp_c)}°C</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Вятър</p>
                    <p className="font-medium">{selectedWeather.current.wind_kph} km/h {selectedWeather.current.wind_dir}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">Влажност: {selectedWeather.current.humidity}%</p>
                <p className="text-sm text-muted-foreground">Налягане: {selectedWeather.current.pressure_mb} mb</p>
              </div>
              
              {/* Fire Details (from NASA FIRMS) */}
              {activeFire && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h5 className="font-medium text-foreground">Детайли за пожара</h5>
                  </div>
                  <div className="space-y-1 text-sm">
                    {typeof activeFire.count === 'number' && activeFire.count > 1 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Близки пожари:</span><span className="font-medium">{activeFire.count} (≤10 км)</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Ширина:</span><span className="font-medium">{activeFire.latitude.toFixed(5)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Дължина:</span><span className="font-medium">{activeFire.longitude.toFixed(5)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Дата:</span><span className="font-medium">{activeFire.acq_date}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Час:</span><span className="font-medium">{(activeFire.acq_time || '').toString().padStart(4,'0').slice(0,2)}:{(activeFire.acq_time || '').toString().padStart(4,'0').slice(2,4)}</span></div>
                  </div>
                </div>
              )}

              {/* Reported Fire Details */}
              {activeReport && reported && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="h-4 w-4 text-orange-500" />
                    <h5 className="font-medium text-foreground">Детайли за сигнала</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    {reported.imageUrl && (
                      <a href={reported.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={reported.imageUrl} alt="report" className="w-full h-40 object-cover rounded border" />
                      </a>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Координати:</span><span className="font-medium">{reported.coords.lat.toFixed(5)}, {reported.coords.lng.toFixed(5)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Подаден:</span><span className="font-medium">{reported.time}</span></div>
                  </div>
                </div>
              )}
              {selectedWeather.firePrediction && !activeFire && !activeReport && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h5 className="font-medium text-foreground">Оценка на пожарния риск</h5>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Risk Level Display */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Риск %</span>
                      <span className="text-lg font-bold" style={{ color: getRiskColor(selectedWeather.firePrediction.riskPercent) }}>
                        {selectedWeather.firePrediction.riskPercent.toFixed(1)}%
                      </span>
                    </div>

                    {/* Colored Progress Bar */}
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${selectedWeather.firePrediction.riskPercent}%`,
                            backgroundColor: getRiskColor(selectedWeather.firePrediction.riskPercent)
                          }}
                        />
                      </div>
                      {/* Risk Level Markers */}
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Нисък</span>
                        <span>Умерен</span>
                        <span>Висок</span>
                        <span>Много висок</span>
                        <span>Екстремен</span>
                      </div>
                    </div>

                    {/* Percentage and Risk Description */}
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1" style={{ color: getRiskColor(selectedWeather.firePrediction.riskPercent) }}>
                        {selectedWeather.firePrediction.riskPercent.toFixed(0)}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getRiskDescription(selectedWeather.firePrediction.riskPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WildfireMap;




