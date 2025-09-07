type Volunteer = {
  id: string | number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  city?: string;
  sendSMS?: boolean;
  [k: string]: unknown;
};

const notifiedCities = new Set<string>();

async function fetchVolunteersByCity(city: string): Promise<Volunteer[]> {
  const url = `http://localhost:3000/volunteers?city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function sendVolunteerSmsReset(id: string | number): Promise<boolean> {
  const url = `http://localhost:3000/volunteers/send-sms/reset?id=${encodeURIComponent(String(id))}`;
  const res = await fetch(url);
  return res.ok;
}

function normalizePhoneE164(raw: string, defaultCountryCode = '359'): string | null {
  if (!raw) return null;
  let n = raw.trim();
  n = n.replace(/[\s()-]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('00')) n = n.slice(2);
  if (/^\d+$/.test(n) === false) return null;
  if (n.length && n[0] === '0') n = defaultCountryCode + n.slice(1);
  if (!n.startsWith(defaultCountryCode) && n.length <= 10) n = defaultCountryCode + n;
  return n;
}

async function sendSmsViaInfobip(toE164: string, text: string): Promise<boolean> {
  try {
    const apiKey = (import.meta as any).env?.VITE_INFOBIP_API_KEY || 'App 4c341d7c59573a464ef580233fb1ead3-da809a2b-42f5-45a5-902c-e5b093d50e1a';
    const baseUrl = (import.meta as any).env?.VITE_INFOBIP_BASE_URL || 'https://api.infobip.com';
    const fromNumber = (import.meta as any).env?.VITE_INFOBIP_FROM || '447491163443';

    const headers = new Headers();
    headers.append('Authorization', apiKey);
    headers.append('Content-Type', 'application/json');
    headers.append('Accept', 'application/json');

    const body = JSON.stringify({
      messages: [
        { destinations: [{ to: toE164 }], from: fromNumber, text }
      ]
    });

    const res = await fetch(`${baseUrl}/sms/2/text/advanced`, { method: 'POST', headers, body });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyVolunteersForCity(city: string): Promise<void> {
  if (!city || notifiedCities.has(city)) return;
  notifiedCities.add(city);
  try {
    const volunteers = await fetchVolunteersByCity(city);

    await Promise.allSettled(
      volunteers.map(async (v) => {
       // const norm = normalizePhoneE164(v.phoneNumber as string);
       // if (!norm) return false;
        const text = `Аларма: Засечен пожар в близост до ${city}. Моля, отговорете при възможност. https://invite.viber.com/?g=k012OXvAR1XHkglm2DhNtNHJgbFxtviq`;
        return await sendSmsViaInfobip(v.phoneNumber, text);
      })
    );

    await Promise.allSettled(volunteers.map(v => sendVolunteerSmsReset(v.id)));
  } catch {
    /* no-op */
  }
}
