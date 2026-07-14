/**
 * Denkmal-Atlas REST-API (© BLfD). CORS `*`, direkt aus dem Browser (PRD § 4 A).
 * Umkreissuche (TASK-018) + amtliches Detail (TASK-019). Koordinaten via coords.ts
 * nach EPSG:25832 umgerechnet. Antworten werden defensiv geparst.
 */
import { DENKMAL_API, type DenkmalObjTyp } from '../config/datasources';
import { wgs84ToUtm32 } from '../geo/coords';

export interface DenkmalNear {
  koid: number;
  objtyp: DenkmalObjTyp;
  bezeichnung: string;
  funktion: string;
  aktennummer: string;
  east_utm: number;
  north_utm: number;
  /** Entfernung zum Abfragepunkt in Metern (liefert die API). */
  distance: number;
}

export interface DenkmalDetail {
  beschreibung: string;
  /** Link zur Denkmalliste-PDF (kann fehlen). */
  gdelistlink: string | null;
  gdename?: string;
  lkrname?: string;
}

/** Fehlerarten der Umkreissuche — steuern die Nutzer-Meldung (nie „grün"). */
export type DenkmalErrorKind = 'offline' | 'coverage';
export class DenkmalError extends Error {
  constructor(
    public kind: DenkmalErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'DenkmalError';
  }
}

/**
 * Denkmäler im Umkreis (Meter) um einen WGS84-Punkt.
 * Wirft `DenkmalError`:
 *   - 'offline' bei Netz-/Serverfehler (Aufrufer: „nur besuchte Gebiete") — NIE „grün".
 *   - 'coverage' bei 404 = Punkt außerhalb der bayerischen Abdeckung.
 */
export async function fetchUmkreis(
  lat: number,
  lng: number,
  bufferM: number,
): Promise<DenkmalNear[]> {
  const { e, n } = wgs84ToUtm32(lat, lng);
  let res: Response;
  try {
    res = await fetch(DENKMAL_API.umkreis(e, n, bufferM));
  } catch {
    throw new DenkmalError('offline', 'Netzfehler');
  }
  if (res.status === 404) throw new DenkmalError('coverage', 'Außerhalb Bayern');
  if (!res.ok) throw new DenkmalError('offline', `HTTP ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as DenkmalNear[]) : [];
}

/**
 * Amtliche Beschreibung eines Denkmals. objtyp MUSS exakt stimmen — sonst 404,
 * das hier sauber als `null` behandelt wird (statt Absturz, PRD § 11).
 */
export async function fetchDetail(
  koid: number,
  objtyp: DenkmalObjTyp,
): Promise<DenkmalDetail | null> {
  try {
    const res = await fetch(DENKMAL_API.detail(koid, objtyp));
    if (!res.ok) return null;
    return (await res.json()) as DenkmalDetail;
  } catch {
    return null;
  }
}
