/**
 * Typisierte localStorage-Helfer (PRD § 3). Alle Zugriffe try/catch-gesichert —
 * localStorage kann fehlen (Private Mode) oder voll sein; die App degradiert still.
 */

export type PresetId = 'feld' | 'recherche' | '1850' | 'luftbild' | 'custom';

/** [lat, lng, ts?] — Spur-Punkte mit 5-m-Rauschfilter (Filter lebt im Feature). */
export type TrackPoint = [number, number, number?];

export interface Contact {
  name: string;
  strasse: string;
  plzort: string;
  email: string;
  tel: string;
}

const KEYS = {
  preset: 'rs_preset',
  track: 'rs_track',
  zone: 'rs_zone',
  zoneOn: 'rs_zone_on',
  contact: 'rs_contact',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* still degradieren */
  }
}

export const local = {
  getPreset: (): PresetId | null => read<PresetId>(KEYS.preset),
  setPreset: (p: PresetId | null): void => write(KEYS.preset, p),

  getTrack: (): TrackPoint[] => read<TrackPoint[]>(KEYS.track) ?? [],
  setTrack: (pts: TrackPoint[]): void => write(KEYS.track, pts.length ? pts : null),

  getZone: (): [number, number][] | null => read<[number, number][]>(KEYS.zone),
  setZone: (poly: [number, number][] | null): void => write(KEYS.zone, poly),

  getZoneAlarmOn: (): boolean => read<'1' | '0'>(KEYS.zoneOn) === '1',
  setZoneAlarmOn: (on: boolean): void => write(KEYS.zoneOn, on ? '1' : '0'),

  getContact: (): Contact | null => read<Contact>(KEYS.contact),
  setContact: (c: Contact | null): void => write(KEYS.contact, c),
};
