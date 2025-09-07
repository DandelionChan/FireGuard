import type { FireData } from '../types';

export async function fetchReports(): Promise<FireData[]> {
  try {
    const r = await fetch('http://localhost:3000/detections');
    if (!r.ok) return [];
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr
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
  } catch {
    return [];
  }
}

export async function postReport(
  file: File,
  coords: { lat: number; lng: number }
): Promise<{ lat: number; lng: number; filename?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('lat', String(coords.lat));
  fd.append('lon', String(coords.lng));
  const resp = await fetch('http://localhost:3000/detections', { method: 'POST', body: fd });
  if (!resp.ok) throw new Error('server error');
  const data = await resp.json().catch(() => ({} as any));
  const rLat = typeof data.lat === 'number' ? data.lat : coords.lat;
  const rLng = typeof data.lng === 'number' ? data.lng : (typeof data.lon === 'number' ? data.lon : coords.lng);
  const filename = data.filename || data.file || undefined;
  return { lat: rLat, lng: rLng, filename };
}

