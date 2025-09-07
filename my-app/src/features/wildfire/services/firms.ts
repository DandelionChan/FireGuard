  import type { FireData } from '../types';

  export async function fetchFirmsFires(): Promise<FireData[]> {
    const url = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/a4ea9f5afb0b12f1e948a47124b75dc8/VIIRS_SNPP_NRT/22,41,28,44/2';
    const response = await fetch(url);
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const fireData: FireData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim();
        });
        if (row.latitude && row.longitude) {
          fireData.push({
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            bright_ti4: parseFloat(row.bright_ti4) || 0,
            scan: parseFloat(row.scan) || 0,
            track: parseFloat(row.track) || 0,
            acq_date: row.acq_date || '',
            acq_time: row.acq_time || '',
            satellite: row.satellite || '',
            instrument: row.instrument || '',
            confidence: row.confidence || '',
            version: row.version || '',
            bright_ti5: parseFloat(row.bright_ti5) || 0,
            frp: parseFloat(row.frp) || 0,
            daynight: row.daynight || '',
          });
        }
      }
    }
    return fireData;
  }

