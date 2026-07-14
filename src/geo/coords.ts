/**
 * WGS84 ↔ UTM Zone 32N (EPSG:25832) — Transverse-Mercator-Umrechnung.
 * Aus dem validierten Prototyp übernommen (files/relief-recherche.html);
 * bewusst OHNE Bibliothek (PRD § 4). Genauigkeit sub-Meter, hin und zurück.
 *
 * Alle bayerischen Dienste rechnen in EPSG:25832 — jede Funktion, die E/N
 * annimmt oder liefert, meint diese Zone (Zentralmeridian 9° Ost).
 */

// WGS84-Ellipsoid
const A = 6378137.0;
const F = 1 / 298.257223563;
const E2 = F * (2 - F); // erste Exzentrizität²
const EP2 = E2 / (1 - E2); // zweite Exzentrizität²
const K0 = 0.9996; // UTM-Maßstabsfaktor
const LON0 = (9 * Math.PI) / 180; // Zentralmeridian Zone 32
const FALSE_EASTING = 500000;

export interface Utm {
  /** Rechtswert (Easting) in Metern, EPSG:25832 */
  e: number;
  /** Hochwert (Northing) in Metern, EPSG:25832 */
  n: number;
}

/** WGS84 (Grad) → UTM32 (Meter). */
export function wgs84ToUtm32(lat: number, lng: number): Utm {
  const la = (lat * Math.PI) / 180;
  const lo = (lng * Math.PI) / 180;
  const sin = Math.sin(la);
  const cos = Math.cos(la);
  const tan = Math.tan(la);

  const nRad = A / Math.sqrt(1 - E2 * sin * sin);
  const t = tan * tan;
  const c = EP2 * cos * cos;
  const a = cos * (lo - LON0);

  const m =
    A *
    ((1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256) * la -
      ((3 * E2) / 8 + (3 * E2 * E2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * la) +
      ((15 * E2 * E2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * la) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * la));

  const e =
    FALSE_EASTING +
    K0 *
      nRad *
      (a +
        ((1 - t + c) * a ** 3) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120);

  const n =
    K0 *
    (m +
      nRad *
        tan *
        ((a * a) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));

  return { e, n };
}

/** UTM32 (Meter) → WGS84 (Grad). */
export function utm32ToWgs84(e: number, n: number): { lat: number; lng: number } {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const m = n / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));

  const p1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);

  const sin1 = Math.sin(p1);
  const cos1 = Math.cos(p1);
  const tan1 = Math.tan(p1);

  const n1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const t1 = tan1 * tan1;
  const c1 = EP2 * cos1 * cos1;
  const r1 = (A * (1 - E2)) / Math.pow(1 - E2 * sin1 * sin1, 1.5);
  const d = (e - FALSE_EASTING) / (n1 * K0);

  const lat =
    p1 -
    ((n1 * tan1) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * EP2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * EP2 - 3 * c1 * c1) * d ** 6) / 720);

  const lng =
    LON0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * EP2 + 24 * t1 * t1) * d ** 5) / 120) /
      cos1;

  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

/** Anzeige-Zeile fürs Fund-Formular: „49.959908° N, 11.579661° O · UTM 32U 685020 5537363" */
export function formatCoordLine(lat: number, lng: number): string {
  const { e, n } = wgs84ToUtm32(lat, lng);
  return `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° O · UTM 32U ${Math.round(e)} ${Math.round(n)}`;
}
