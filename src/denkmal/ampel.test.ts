import { describe, expect, it } from 'vitest';
import { computeAmpel } from './ampel';
import type { DenkmalNear } from './api';

function m(objtyp: DenkmalNear['objtyp'], distance: number, bezeichnung = 'X'): DenkmalNear {
  return { koid: 1, objtyp, bezeichnung, funktion: '', aktennummer: '', east_utm: 0, north_utm: 0, distance };
}

describe('Ampel-Logik — Kategorientrennung (der rechtliche Kern)', () => {
  it('Bodendenkmal < 50 m → ROT', () => {
    expect(computeAmpel([m('boden', 2)]).level).toBe('rot');
  });

  it('Bodendenkmal 50–300 m → GELB (Nähebereich)', () => {
    expect(computeAmpel([m('boden', 120)]).level).toBe('gelb');
  });

  it('Bodendenkmal > 300 m → GRÜN mit Distanzangabe', () => {
    const r = computeAmpel([m('boden', 640)]);
    expect(r.level).toBe('gruen');
    expect(r.reasons[0]).toContain('640 m');
  });

  it('Festspielhaus-Fall: Baudenkmal DIREKT drauf darf NIE rot sein → GRÜN', () => {
    const r = computeAmpel([m('bau', 2, 'Richard-Wagner-Festspielhaus'), m('bau', 80), m('ensemble', 150)]);
    expect(r.level).toBe('gruen');
    expect(r.bauEnsemble).toBe(3);
  });

  it('Bau nah + Boden fern: nur der Boden-Abstand entscheidet', () => {
    const r = computeAmpel([m('bau', 5), m('boden', 400)]);
    expect(r.level).toBe('gruen'); // Boden 400 m > 300 → grün, trotz Bau bei 5 m
  });

  it('kein Denkmal → GRÜN, „kein eingetragenes Bodendenkmal"', () => {
    const r = computeAmpel([]);
    expect(r.level).toBe('gruen');
    expect(r.reasons[0]).toContain('Kein eingetragenes Bodendenkmal');
  });

  it('nimmt das NÄCHSTE Bodendenkmal (sortiert)', () => {
    const r = computeAmpel([m('boden', 700), m('boden', 40, 'nah'), m('boden', 500)]);
    expect(r.level).toBe('rot');
    expect(r.nearestBoden?.bezeichnung).toBe('nah');
  });

  it('Fundpotenzial zählt Bodendenkmäler 300–800 m', () => {
    const r = computeAmpel([m('boden', 640), m('boden', 700), m('boden', 900)]);
    expect(r.umfeldBoden).toBe(2); // 640 + 700, nicht 900
  });
});
