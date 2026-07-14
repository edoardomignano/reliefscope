/**
 * IndexedDB-Wrapper (idb). Genau EINE memoisierte Verbindung — mehrere parallele
 * open()-Aufrufe erzeugten im Prototyp eine Upgrade-Race (PRD § 2 Gotcha).
 *
 * DataCloneError-Falle: NIE Objekte mit Leaflet-/DOM-Referenzen speichern.
 * Die hier definierten Interfaces sind bewusst reine Datenobjekte; Aufrufer
 * müssen Runtime-Felder (Marker etc.) VOR dem Speichern abstreifen.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/** Fund (PRD § 3). Foto als Blob — NICHT Base64 in IDB. */
export interface Find {
  id: string;
  lat: number;
  lng: number;
  note: string;
  kind: 'fund' | 'beobachtung' | 'strukturverdacht';
  symbol:
    | 'muenze'
    | 'ring'
    | 'schmuck'
    | 'schnalle'
    | 'knopf'
    | 'gefaess'
    | 'kreuz'
    | 'militaria'
    | 'werkzeug'
    | 'unbekannt';
  leitwert: string | null;
  tiefe_cm: number | null;
  photo: Blob | null;
  dstate: 'rot' | 'gelb' | 'gruen' | null;
  ddist: number | null;
  dname: string | null;
  ts: number;
}

/** Gezeichnete Struktur (PRD § 3; Should-Have, Schema reserviert). */
export interface Structure {
  id: string;
  geomType: 'LineString' | 'Polygon';
  coords: [number, number][]; // [lng, lat]
  type: 'altstrasse' | 'hohlweg' | 'terrasse' | 'wall' | 'graben' | 'woelbacker' | 'unklar';
  note: string;
  lengthM: number | null;
  ts: number;
}

interface ReliefScopeDB extends DBSchema {
  finds: {
    key: string;
    value: Find;
    indexes: { ts: number };
  };
  structures: {
    key: string;
    value: Structure;
    indexes: { ts: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ReliefScopeDB>> | null = null;

/** Die eine, memoisierte DB-Verbindung. */
export function db(): Promise<IDBPDatabase<ReliefScopeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReliefScopeDB>('reliefscope', 1, {
      upgrade(database) {
        const finds = database.createObjectStore('finds', { keyPath: 'id' });
        finds.createIndex('ts', 'ts');
        const structures = database.createObjectStore('structures', { keyPath: 'id' });
        structures.createIndex('ts', 'ts');
      },
    });
  }
  return dbPromise;
}

export async function putFind(find: Find): Promise<void> {
  await (await db()).put('finds', find);
}

export async function getFind(id: string): Promise<Find | undefined> {
  return (await db()).get('finds', id);
}

/** Alle Funde, nach Zeitstempel aufsteigend. */
export async function allFinds(): Promise<Find[]> {
  return (await db()).getAllFromIndex('finds', 'ts');
}

export async function deleteFind(id: string): Promise<void> {
  await (await db()).delete('finds', id);
}

export async function putStructure(structure: Structure): Promise<void> {
  await (await db()).put('structures', structure);
}

export async function allStructures(): Promise<Structure[]> {
  return (await db()).getAllFromIndex('structures', 'ts');
}

export async function deleteStructure(id: string): Promise<void> {
  await (await db()).delete('structures', id);
}
