import { computeFWI, FWIResult } from '@/components/FWI/ComputeFWI';
import type { WeatherData } from '../types';

export function computeFWIFromWeatherAPI(weatherData: WeatherData): FWIResult {
  const temp = weatherData.current.temp_c;
  const rh = weatherData.current.humidity;
  const wind = weatherData.current.wind_kph;
  const rain = weatherData.current.precip_mm ?? 0;
  const month = new Date(weatherData.location.localtime).getMonth() + 1;
  return computeFWI({ temp, rh, wind, rain, month });
}

export async function fetchWeatherAt(apiKey: string, lat: number, lng: number): Promise<WeatherData> {
  const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lng}&aqi=no`);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

export async function fetchNearestWeather(apiKey: string, lat: number, lng: number): Promise<WeatherData | null> {
  const resp = await fetch(`https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${lat},${lng}`);
  const locations = await resp.json();
  if (!locations || !locations.length) return null;
  const nearest = locations[0];
  const weatherResp = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${nearest.lat},${nearest.lon}&aqi=no`);
  if (!weatherResp.ok) return null;
  return weatherResp.json();
}

