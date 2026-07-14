import { describe, expect, it } from 'vitest';
import { formatCoordLine, utm32ToWgs84, wgs84ToUtm32 } from './coords';
import { distanceM, formatLength, pathLengthM } from './distance';

// Referenzpunkt aus dem Projekt: Festspielhaus Bayreuth (OSM-geocodet).
// UTM-Erwartung im Prototyp verifiziert gegen die Denkmal-Atlas-API (east/north_utm).
const FSP = { lat: 49.9599081, lng: 11.5796605, e: 685019.7, n: 5537362.9 };

describe('WGS84 ↔ UTM32 (EPSG:25832)', () => {
  it('Hinrechnung trifft die verifizierte Referenz (< 2 m)', () => {
    const { e, n } = wgs84ToUtm32(FSP.lat, FSP.lng);
    expect(Math.abs(e - FSP.e)).toBeLessThan(2);
    expect(Math.abs(n - FSP.n)).toBeLessThan(2);
  });

  it('Roundtrip WGS84→UTM→WGS84 weicht < 1 m ab', () => {
    // mehrere Punkte quer durch Bayern
    const pts = [
      [49.9599081, 11.5796605], // Bayreuth
      [48.1374, 11.5755], // München
      [50.2021, 11.9091], // Fichtelgebirge
      [47.5652, 10.7498], // Füssen
    ] as const;
    for (const [lat, lng] of pts) {
      const { e, n } = wgs84ToUtm32(lat, lng);
      const back = utm32ToWgs84(e, n);
      expect(distanceM(lat, lng, back.lat, back.lng)).toBeLessThan(1);
    }
  });

  it('formatCoordLine liefert WGS84 + UTM-Zeile', () => {
    const line = formatCoordLine(FSP.lat, FSP.lng);
    expect(line).toContain('49.959908° N');
    expect(line).toContain('UTM 32U 685020 5537363');
  });
});

describe('Distanz (Haversine)', () => {
  it('München → Nürnberg ≈ 149–151 km (Referenz)', () => {
    const d = distanceM(48.1374, 11.5755, 49.4521, 11.0767);
    expect(d).toBeGreaterThan(148_000);
    expect(d).toBeLessThan(152_000);
  });

  it('stimmt mit planarer UTM-Distanz auf kurzer Strecke überein (< 0.5 %)', () => {
    const a = { lat: 49.9456, lng: 11.5713 };
    const b = { lat: 49.9599, lng: 11.5797 };
    const ua = wgs84ToUtm32(a.lat, a.lng);
    const ub = wgs84ToUtm32(b.lat, b.lng);
    const planar = Math.hypot(ua.e - ub.e, ua.n - ub.n);
    const hav = distanceM(a.lat, a.lng, b.lat, b.lng);
    expect(Math.abs(planar - hav) / hav).toBeLessThan(0.005);
  });

  it('pathLength + format', () => {
    const d = pathLengthM([
      [49.94, 11.55],
      [49.941, 11.551],
      [49.942, 11.552],
    ]);
    expect(d).toBeGreaterThan(200);
    expect(formatLength(264)).toBe('264 m');
    expect(formatLength(1930)).toBe('1.93 km');
  });
});
