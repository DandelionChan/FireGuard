import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flame, Camera } from 'lucide-react';
import type { FireData, WeatherData } from '@/features/wildfire/types';
import { usePredictions } from '@/features/wildfire/hooks/usePredictions';
import { loadCityRisks } from '@/features/wildfire/map/cityRisk';
import { renderFires } from '@/features/wildfire/map/fires';
import { fetchFirmsFires } from '@/features/wildfire/services/firms';
import { fetchReports, postReport } from '@/features/wildfire/services/reports';
import { fetchNearestWeather, fetchWeatherAt, computeFWIFromWeatherAPI } from '@/features/wildfire/services/weather';
import StyleSwitcher from '@/features/wildfire/components/StyleSwitcher';
import DetailsPanel, { type ReportedInfo } from '@/features/wildfire/components/DetailsPanel';
import ReportPanel from '@/features/wildfire/components/ReportPanel';

const WildfireMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [fires, setFires] = useState<FireData[]>([]);
  const [visibleFireCount, setVisibleFireCount] = useState<number>(0);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapboxToken] = useState<string>('pk.eyJ1IjoibmlraTEyMzQ0MzIzNCIsImEiOiJjbWY0M3Uxc3UwMWk3MmxzOHRpeXlzaDYyIn0.T0ITpwXgpcamkgDjcBsVVA');
  const [weatherApiKey] = useState<string>('fb97c129e07e4bc68e0152111250309');
  const [predictionTime, setPredictionTime] = useState<30 | 60 | 120>(30);
  const [showPredictions, setShowPredictions] = useState(false);
  const [activeFire, setActiveFire] = useState<FireData | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/dark-v11');
  const DEFAULT_CENTER: [number, number] = [25.4858, 42.7339];
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reported, setReported] = useState<ReportedInfo | null>(null);
  const [activeReport, setActiveReport] = useState<boolean>(false);

  const { addFireSpreadPredictions } = usePredictions(map, selectedWeather, activeFire, showPredictions, predictionTime);

  async function drawFires(data: FireData[]) {
    if (!map.current) return;
    const count = await renderFires(map.current, data, {
      setSelectedWeather,
      setActiveFire,
      setActiveReport,
      setPredictionTime,
      setShowPredictions,
      addPredictions: addFireSpreadPredictions,
      weatherApiKey,
      firesState: data,
    });
    setVisibleFireCount(count);
  }

  const fetchFireData = async () => {
    try {
      setLoading(true);
      const fireData = await fetchFirmsFires();
      const reports = await fetchReports();
      const allFires = [...fireData, ...reports];
      setFires(allFires);
      await drawFires(allFires);
    } catch (error) {
      console.error('Error fetching fire data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({ container: mapContainer.current, style: mapStyle, center: DEFAULT_CENTER, zoom: 6 });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('click', async (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, { layers: ['fires-icon', 'fire-arrows', 'fire-circles'] });
      if (features.length > 0) return;
      if (!weatherApiKey) { alert('Моля, въведете вашия WeatherAPI ключ'); return; }
      setLoading(true);
      try {
        const weatherData: WeatherData = await fetchWeatherAt(weatherApiKey, e.lngLat.lat, e.lngLat.lng);
        const fireRisk = computeFWIFromWeatherAPI(weatherData);
        setActiveReport(false);
        setSelectedWeather({ ...weatherData, clickedCoords: { lat: e.lngLat.lat, lng: e.lngLat.lng }, firePrediction: { riskPercent: fireRisk.riskPercent } });
      } catch (error) {
        console.error('Error fetching weather data:', error);
        try {
          const weatherData = await fetchNearestWeather(weatherApiKey, e.lngLat.lat, e.lngLat.lng);
          if (weatherData) {
            const fireRisk = computeFWIFromWeatherAPI(weatherData);
            setSelectedWeather({ ...weatherData, clickedCoords: { lat: e.lngLat.lat, lng: e.lngLat.lng }, firePrediction: { riskPercent: fireRisk.riskPercent } });
          }
        } catch {
          alert('Неуспех при получаване на данни за времето за тази локация');
        }
      } finally {
        setLoading(false);
      }
    });

    void fetchFireData();
    void loadCityRisks(map.current, weatherApiKey);

    return () => { map.current?.remove(); map.current = null; };
  }, [mapboxToken]);

  return (
    <div className="h-screen flex flex-col bg-background" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div className="flex-1 flex" style={{ flex: 1, display: 'flex' }}>
        <div className="flex-1 relative" style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} className="absolute inset-0" style={{ position: 'absolute', inset: 0 }} />
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-fire text-white rounded px-3 py-2 shadow hover:opacity-90 flex items-center gap-2"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: '#dc2626', color: '#fff', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 6px rgba(0,0,0,.2)' }}
            onClick={() => setReportOpen((v) => !v)}
          >
            <Camera className="h-4 w-4" />
            Подай сигнал
          </button>

          <ReportPanel
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            onSubmit={async (image, coords) => {
              const { lat, lng, filename } = await postReport(image, coords);
              const imageLink = filename ? `http://localhost:3000/uploads/fire/${filename}` : '';
              const newReport: FireData = { latitude: lat, longitude: lng, bright_ti4: 0, scan: 0, track: 0, acq_date: '', acq_time: '', satellite: 'REPORT', instrument: 'USER', confidence: 'n', version: '', bright_ti5: 0, frp: 0, daynight: 'D', isReport: true, imageUrl: imageLink };
              const updated = [...fires, newReport];
              setFires(updated);
              await drawFires(updated);
              setReported({ imageUrl: imageLink, coords: { lat, lng }, time: new Date().toLocaleString(), filename });
              setActiveReport(true);
              if (weatherApiKey) {
                try {
                  const weatherData = await fetchWeatherAt(weatherApiKey, lat, lng);
                  const fireRisk = computeFWIFromWeatherAPI(weatherData);
                  setSelectedWeather({ ...weatherData, clickedCoords: { lat, lng }, firePrediction: { riskPercent: fireRisk.riskPercent } });
                  setActiveFire(null);
                } catch {}
              }
            }}
          />

          <StyleSwitcher
            current={mapStyle}
            onChange={(style) => {
              setMapStyle(style);
              map.current?.setStyle(style);
              map.current?.once('styledata', () => { void drawFires(fires); });
            }}
          />

          <div
            className="absolute bottom-2 right-2 z-10 bg-card/80 backdrop-blur px-3 py-1 rounded border border-border text-sm flex items-center gap-2"
            style={{ position: 'absolute', right: 8, bottom: 8, zIndex: 10, background: 'rgba(255,255,255,.9)', border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Flame className="h-4 w-4 text-fire" />
            <span>{visibleFireCount} Активни пожари</span>
          </div>
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="bg-card p-4 rounded-lg shadow-emergency" style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.2)' }}>
                <div className="animate-spin h-6 w-6 border-2 border-fire border-t-transparent rounded-full" style={{ height: 24, width: 24, border: '2px solid #dc2626', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 1s linear infinite' }}></div>
                <p className="mt-2 text-sm text-foreground" style={{ marginTop: 8, fontSize: 12, color: '#111827' }}>Loading...</p>
              </div>
            </div>
          )}
        </div>

        {selectedWeather && (
          <DetailsPanel
            selectedWeather={selectedWeather}
            activeFire={activeFire}
            activeReport={activeReport}
            reported={reported}
            onClose={() => {
              setSelectedWeather(null);
              setActiveFire(null);
              setShowPredictions(false);
              addFireSpreadPredictions([]);
              setActiveReport(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default WildfireMap;

