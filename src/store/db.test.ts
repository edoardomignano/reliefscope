import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { allFinds, deleteFind, getFind, putFind, type Find } from './db';

function dummyFind(overrides: Partial<Find> = {}): Find {
  return {
    id: 'test-1',
    lat: 49.9456,
    lng: 11.5713,
    note: 'Testfund',
    kind: 'fund',
    symbol: 'muenze',
    leitwert: '78',
    tiefe_cm: 15,
    photo: null,
    dstate: null,
    ddist: null,
    dname: null,
    ts: 1_700_000_000_000,
    ...overrides,
  };
}

describe('IndexedDB-Wrapper (finds)', () => {
  it('schreibt und liest einen Dummy-Fund ohne Fehler', async () => {
    await putFind(dummyFind());
    const loaded = await getFind('test-1');
    expect(loaded).toBeDefined();
    expect(loaded!.note).toBe('Testfund');
    expect(loaded!.symbol).toBe('muenze');
    expect(loaded!.tiefe_cm).toBe(15);
  });

  it('speichert ein Foto als Blob und liest es zurück', async () => {
    const photo = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    await putFind(dummyFind({ id: 'test-photo', photo }));
    const loaded = await getFind('test-photo');
    expect(loaded!.photo).toBeInstanceOf(Blob);
    expect(loaded!.photo!.size).toBe(4);
  });

  it('listet Funde nach ts sortiert und löscht sauber', async () => {
    await putFind(dummyFind({ id: 'b', ts: 2000 }));
    await putFind(dummyFind({ id: 'a', ts: 1000 }));
    const all = await allFinds();
    const ids = all.map((f) => f.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    await deleteFind('a');
    expect(await getFind('a')).toBeUndefined();
  });

  it('Clean-Objekt-Disziplin: Runtime-Referenzen würden DataCloneError werfen', async () => {
    // Genau der Prototyp-Fehler: ein Leaflet-Marker (enthält Funktionen/DOM) am Objekt.
    const dirty = dummyFind({ id: 'dirty' }) as Find & { _marker?: unknown };
    dirty._marker = { remove: () => undefined }; // Funktion = nicht klonbar
    await expect(putFind(dirty)).rejects.toThrow();
    // Clean-Kopie (Runtime-Feld abgestreift) funktioniert:
    const { _marker, ...clean } = dirty;
    void _marker;
    await putFind(clean as Find);
    expect(await getFind('dirty')).toBeDefined();
  });
});
