import { Cloud, Thermometer, Wind, Flame, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FireData, WeatherData } from '../types';
import { getRiskColor, getRiskDescription } from '../utils/risk';

export type ReportedInfo = { imageUrl: string; coords: { lat: number; lng: number }; time: string; filename?: string };

type Props = {
  selectedWeather: WeatherData;
  activeFire: FireData | null;
  activeReport: boolean;
  reported: ReportedInfo | null;
  onClose: () => void;
};

export default function DetailsPanel({ selectedWeather, activeFire, activeReport, reported, onClose }: Props) {
  return (
    <div className="w-80 bg-card border-l border-border p-4 relative">
      <Button
        onClick={onClose}
        size="sm"
        className="absolute top-2 right-2 h-7 px-2 bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800"
      >
        Затвори
      </Button>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Cloud className="h-5 w-5" />Метеорологична информация</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-foreground">{selectedWeather.location.name}</h4>
          <p className="text-muted-foreground capitalize">{selectedWeather.current.condition.text}</p>
          {selectedWeather.clickedCoords && (
            <p className="text-xs text-muted-foreground mt-1">Най-близка метеостанция до избраната локация ({selectedWeather.clickedCoords.lat.toFixed(3)}, {selectedWeather.clickedCoords.lng.toFixed(3)})</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-fire" /><div><p className="text-sm text-muted-foreground">Температура</p><p className="font-medium">{Math.round(selectedWeather.current.temp_c)}°C</p></div></div>
          <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Вятър</p><p className="font-medium">{selectedWeather.current.wind_kph} km/h {selectedWeather.current.wind_dir}</p></div></div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">Влажност: {selectedWeather.current.humidity}%</p>
          <p className="text-sm text-muted-foreground">Налягане: {selectedWeather.current.pressure_mb} mb</p>
        </div>

        {activeFire && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3"><Flame className="h-4 w-4 text-orange-500" /><h5 className="font-medium text-foreground">Детайли за пожара</h5></div>
            <div className="space-y-1 text-sm">
              {typeof activeFire.count === 'number' && activeFire.count > 1 && (<div className="flex justify-between"><span className="text-muted-foreground">Близки пожари:</span><span className="font-medium">{activeFire.count} (≤10 км)</span></div>)}
              <div className="flex justify-between"><span className="text-muted-foreground">Ширина:</span><span className="font-medium">{activeFire.latitude.toFixed(5)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Дължина:</span><span className="font-medium">{activeFire.longitude.toFixed(5)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Дата:</span><span className="font-medium">{activeFire.acq_date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Час:</span><span className="font-medium">{(activeFire.acq_time || '').toString().padStart(4,'0').slice(0,2)}:{(activeFire.acq_time || '').toString().padStart(4,'0').slice(2,4)}</span></div>
            </div>
          </div>
        )}

        {activeReport && reported && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3"><Camera className="h-4 w-4 text-orange-500" /><h5 className="font-medium text-foreground">Детайли за сигнала</h5></div>
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
            <div className="flex items-center gap-2 mb-3"><Flame className="h-4 w-4 text-orange-500" /><h5 className="font-medium text-foreground">Оценка на пожарния риск</h5></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Риск %</span><span className="text-lg font-bold" style={{ color: getRiskColor(selectedWeather.firePrediction.riskPercent) }}>{selectedWeather.firePrediction.riskPercent.toFixed(1)}%</span></div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${selectedWeather.firePrediction.riskPercent}%`, backgroundColor: getRiskColor(selectedWeather.firePrediction.riskPercent) }} />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground"><span>Нисък</span><span>Умерен</span><span>Висок</span><span>Много висок</span><span>Екстремен</span></div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{ color: getRiskColor(selectedWeather.firePrediction.riskPercent) }}>{selectedWeather.firePrediction.riskPercent.toFixed(0)}%</div>
                <p className="text-sm text-muted-foreground">{getRiskDescription(selectedWeather.firePrediction.riskPercent)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
