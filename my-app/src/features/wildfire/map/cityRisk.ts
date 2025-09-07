import mapboxgl from 'mapbox-gl';
import type { Feature, Polygon } from 'geojson';
import { bulgarianCities, CityRisk } from '@/data/bulgarianCities';
import { getRiskColor } from '../utils/risk';
import { degToRad } from '../utils/geo';
import { fetchWeatherAt, computeFWIFromWeatherAPI } from '../services/weather';

export function addCityMarkers(map: mapboxgl.Map, cities: CityRisk[]) {
  const features: Feature<Polygon>[] = cities.map(city => {
    const radiusKm = 0.5 + city.risk / 20;
    const circlePoints: [number, number][] = [];
    const numPoints = 32;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const circleLat = city.lat + (radiusKm / 111) * Math.cos(angle);
      const circleLng = city.lon + (radiusKm / (111 * Math.cos(degToRad(city.lat)))) * Math.sin(angle);
      circlePoints.push([circleLng, circleLat]);
    }
    return { type: 'Feature', properties: { name: city.name, risk: city.risk, color: getRiskColor(city.risk) }, geometry: { type: 'Polygon', coordinates: [circlePoints] } };
  });

  if (map.getLayer('city-risk-fill')) map.removeLayer('city-risk-fill');
  if (map.getLayer('city-risk-outline')) map.removeLayer('city-risk-outline');
  if (map.getSource('city-risk')) map.removeSource('city-risk');

  map.addSource('city-risk', { type: 'geojson', data: { type: 'FeatureCollection', features } });
  map.addLayer({ id: 'city-risk-fill', type: 'fill', source: 'city-risk', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 } });
  map.addLayer({ id: 'city-risk-outline', type: 'line', source: 'city-risk', paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1, 22, 4], 'line-opacity': 0.4 } });

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
    new mapboxgl.Marker(el).setLngLat([city.lon, city.lat]).addTo(map);
  });
}

export async function loadCityRisks(map: mapboxgl.Map, weatherApiKey: string) {
  const results: CityRisk[] = [];
  for (const city of bulgarianCities) {
    try {
      const weather = await fetchWeatherAt(weatherApiKey, city.lat, city.lon);
      const risk = computeFWIFromWeatherAPI(weather).riskPercent;
      results.push({ ...city, risk });
    } catch {
      results.push({ ...city, risk: 0 });
    }
  }
  addCityMarkers(map, results);
}

