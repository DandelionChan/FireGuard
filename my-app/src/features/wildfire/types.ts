export interface FireData {
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
  count?: number;
  isReport?: boolean;
  imageUrl?: string;
}

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    condition: { text: string };
    humidity: number;
    pressure_mb: number;
    wind_kph: number;
    wind_dir: string;
    precip_mm?: number;
  };
  clickedCoords?: { lat: number; lng: number };
  firePrediction?: { riskPercent: number };
}

export interface FireSpreadPrediction {
  direction: number;
  speed: number;
  radius: number;
  area: number;
}

