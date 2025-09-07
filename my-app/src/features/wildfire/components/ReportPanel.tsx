import { useCallback, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, MapPin, X, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, coords: { lat: number; lng: number }) => Promise<void>;
};

export default function ReportPanel({ open, onClose, onSubmit }: Props) {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [sending, setSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const latValue = latInput;
  const lngValue = lngInput;

  const canSubmit = useMemo(() => {
    return !!image && coords !== null && Number.isFinite(coords.lat) && Number.isFinite(coords.lng);
  }, [image, coords]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setImage(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, [previewUrl]);

  if (!open) return null;

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-[22rem]">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Подай сигнал</CardTitle>
              <CardDescription>Качи снимка и задайте координати</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={onClose}
              className="bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800"
            >
              <X className="h-4 w-4" />
              Затвори
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Снимка</Label>
            {!previewUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center rounded-md border-2 border-dashed ${dragActive ? 'border-fire/80 bg-fire/5' : 'border-border'} p-6 text-center cursor-pointer`}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">Провлачете файл или кликнете за избор</div>
                <div className="text-xs text-muted-foreground mt-1">Поддържани: JPG, PNG</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImage(f);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                <img src={previewUrl} alt="preview" className="w-full h-40 object-cover rounded-md border" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Смени
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setImage(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                  >
                    Премахни
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImage(f);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Координати</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Ширина (lat)"
                value={latValue}
                inputMode="decimal"
                onChange={(e) => {
                  const v = e.target.value;
                  setLatInput(v);
                  const lat = parseFloat(v);
                  const lng = parseFloat(lngInput);
                  if (isFinite(lat) && isFinite(lng)) setCoords({ lat, lng });
                }}
              />
              <Input
                placeholder="Дължина (lng)"
                value={lngValue}
                inputMode="decimal"
                onChange={(e) => {
                  const v = e.target.value;
                  setLngInput(v);
                  const lat = parseFloat(latInput);
                  const lng = parseFloat(v);
                  if (isFinite(lat) && isFinite(lng)) setCoords({ lat, lng });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!navigator.geolocation) { alert('Геолокацията не се поддържа'); return; }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLatInput(String(pos.coords.latitude)); setLngInput(String(pos.coords.longitude)); },
                    () => alert('Неуспешно получаване на местоположение')
                  );
                }}
              >
                <MapPin className="h-4 w-4" /> Текущо местоположение
              </Button>
              {coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng) && (
                <span className="text-xs text-muted-foreground">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Откажи</Button>
          <Button
            disabled={!canSubmit || sending}
            onClick={async () => {
              if (!image || !coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) { alert('Моля, добавете снимка и валидни координати'); return; }
              try {
                setSending(true);
                await onSubmit(image, coords);
                onClose();
              } catch {
              } finally {
                setSending(false);
              }
            }}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Изпрати
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
