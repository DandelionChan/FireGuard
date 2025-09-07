import { useCallback, useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { FireData, FireSpreadPrediction, WeatherData } from '../types';
import { degToRad, calculateArrowEnd } from '../utils/geo';

export function usePredictions(
  mapRef: React.MutableRefObject<mapboxgl.Map | null>,
  selectedWeather: WeatherData | null,
  activeFire: FireData | null,
  showPredictions: boolean,
  predictionTime: 30 | 60 | 120
) {
  const calculateFireSpread = useCallback((fire: FireData, weather: WeatherData | null): FireSpreadPrediction => {
    if (!weather) {
      return { direction: 0, speed: 0.5, radius: 0.1, area: 0.03 };
    }
    const windSpeed = weather.current.wind_kph;
    const windDir = weather.current.wind_dir;
    const temp = weather.current.temp_c;
    const humidity = weather.current.humidity;
    const frp = fire.frp;
    const windDirectionMap: { [key: string]: number } = {
      N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
      E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
      S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
      W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
    };
    const windDirection = windDirectionMap[windDir] || 0;
    const windFactor = Math.min(windSpeed / 20, 2);
    const tempFactor = Math.max((temp - 15) / 20, 0.5);
    const humidityFactor = Math.max((100 - humidity) / 50, 0.5);
    const frpFactor = Math.min(frp / 10, 2);
    const baseSpeed = 0.2;
    const speed = baseSpeed * windFactor * tempFactor * humidityFactor * frpFactor;
    const timeHours = predictionTime / 60;
    const radius = speed * timeHours;
    const area = Math.PI * radius * radius;
    return { direction: windDirection, speed, radius, area };
  }, [predictionTime]);

  const addFireSpreadPredictions = useCallback((fireData: FireData[]) => {
    const map = mapRef.current;
    if (!map) return;
    ['fire-arrows', 'fire-circles', 'fire-circles-stroke'].forEach(id => map.getLayer(id) && map.removeLayer(id));
    ['fire-arrows', 'fire-circles'].forEach(id => map.getSource(id) && map.removeSource(id));

    const arrowFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const circleFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

    fireData.forEach(fire => {
      const pred = calculateFireSpread(fire, selectedWeather);
      if (pred.radius <= 0.01) return;
      const arrowEnd = calculateArrowEnd(fire.latitude, fire.longitude, pred.direction, pred.radius * 0.5);
      arrowFeatures.push({
        type: 'Feature',
        properties: { fireId: `${fire.latitude}-${fire.longitude}`, speed: pred.speed, direction: pred.direction, radius: pred.radius },
        geometry: { type: 'LineString', coordinates: [[fire.longitude, fire.latitude], [arrowEnd[1], arrowEnd[0]]] },
      });
      const circlePoints: [number, number][] = [];
      const numPoints = 32;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const circleLat = fire.latitude + (pred.radius / 111) * Math.cos(angle);
        const circleLng = fire.longitude + (pred.radius / (111 * Math.cos(degToRad(fire.latitude)))) * Math.sin(angle);
        circlePoints.push([circleLng, circleLat]);
      }
      circlePoints.push(circlePoints[0]);
      circleFeatures.push({
        type: 'Feature',
        properties: { fireId: `${fire.latitude}-${fire.longitude}`, radius: pred.radius, area: pred.area, timeMinutes: predictionTime },
        geometry: { type: 'Polygon', coordinates: [circlePoints] },
      });
    });

    if (arrowFeatures.length) {
      map.addSource('fire-arrows', { type: 'geojson', data: { type: 'FeatureCollection', features: arrowFeatures } });
      map.addLayer({ id: 'fire-arrows', type: 'line', source: 'fire-arrows', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ff6b35', 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 2, 22, 6], 'line-opacity': 0.9 } });
    }
    if (circleFeatures.length) {
      map.addSource('fire-circles', { type: 'geojson', data: { type: 'FeatureCollection', features: circleFeatures } });
      map.addLayer({ id: 'fire-circles', type: 'fill', source: 'fire-circles', paint: { 'fill-color': '#ff6b35', 'fill-opacity': 0.25 } });
      map.addLayer({ id: 'fire-circles-stroke', type: 'line', source: 'fire-circles', paint: { 'line-color': '#ff6b35', 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 3, 22, 6], 'line-opacity': 0.8 } });
    }
  }, [mapRef, selectedWeather, calculateFireSpread, predictionTime]);

  useEffect(() => {
    if (activeFire && showPredictions) addFireSpreadPredictions([activeFire]);
    else addFireSpreadPredictions([]);
  }, [activeFire, showPredictions, predictionTime, selectedWeather, addFireSpreadPredictions]);

  return { calculateFireSpread, addFireSpreadPredictions };
}

