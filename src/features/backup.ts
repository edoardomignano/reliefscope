/**
 * Komplett-Backup (TASK-047/048, FR-011). Alle Nutzerdaten als eine JSON-Datei
 * exportieren (Fotos Blob → Base64) und wieder importieren. Import MERGED per `id`
 * und überschreibt nichts — so wandern Daten verlustfrei aufs zweite Gerät.
 *
 * Nach dem Import laden wir neu (`location.reload`), damit alle Feature-Module
 * (Funde, Gebiete, Spur, Zone) sauber aus dem Speicher neu aufbauen — statt jedes
 * Modul einzeln über Fremd-Änderungen zu benachrichtigen.
 */
import {
  allAreas,
  allFinds,
  allStructures,
  putArea,
  putFind,
  putStructure,
  type Area,
  type Find,
  type Structure,
} from '../store/db';
import { local } from '../store/local';
import { toast } from '../ui/toast';

const FORMAT = 'reliefscope-backup';
const FORMAT_VERSION = 1;

/** Fund mit Foto als Base64 statt Blob (JSON-fähig). */
type FindDump = Omit<Find, 'photo'> & { photo: string | null };

interface Backup {
  app: typeof FORMAT;
  version: number;
  exportedAt: string;
  finds: FindDump[];
  structures: Structure[];
  areas: Area[];
  track: ReturnType<typeof local.getTrack>;
  zone: ReturnType<typeof local.getZone>;
  zoneAlarmOn: boolean;
  contact: ReturnType<typeof local.getContact>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Zeitstempel für den Dateinamen — ohne Date.now(), aber lokal lesbar. */
function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

async function buildBackup(): Promise<Backup> {
  const finds = await allFinds();
  const dumped: FindDump[] = [];
  for (const f of finds) {
    dumped.push({ ...f, photo: f.photo ? await blobToDataUrl(f.photo) : null });
  }
  return {
    app: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    finds: dumped,
    structures: await allStructures(),
    areas: await allAreas(),
    track: local.getTrack(),
    zone: local.getZone(),
    zoneAlarmOn: local.getZoneAlarmOn(),
    contact: local.getContact(),
  };
}

async function doExport(): Promise<void> {
  try {
    const data = await buildBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reliefscope-backup_${stamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const n = data.finds.length + data.areas.length;
    toast(`Sicherung erstellt (${n} Einträge). Bewahre die Datei sicher auf.`, 'success');
  } catch {
    toast('Sicherung fehlgeschlagen. Bitte erneut versuchen.', 'error');
  }
}

/** Merge-Import: fügt hinzu, was per id noch nicht existiert; überschreibt nie. */
async function mergeBackup(data: Backup): Promise<number> {
  let added = 0;

  const haveFinds = new Set((await allFinds()).map((f) => f.id));
  for (const f of data.finds) {
    if (haveFinds.has(f.id)) continue;
    const photo = f.photo ? await dataUrlToBlob(f.photo) : null;
    await putFind({ ...f, photo });
    added++;
  }

  const haveStructs = new Set((await allStructures()).map((s) => s.id));
  for (const s of data.structures ?? []) {
    if (!haveStructs.has(s.id)) {
      await putStructure(s);
      added++;
    }
  }

  const haveAreas = new Set((await allAreas()).map((a) => a.id));
  for (const a of data.areas ?? []) {
    if (!haveAreas.has(a.id)) {
      await putArea(a);
      added++;
    }
  }

  // Spur zusammenführen (Punkte anhängen, grob deduppen). Zone/Kontakt nur setzen,
  // wenn hier noch nichts vorhanden ist — vorhandene Werte bleiben unangetastet.
  if (data.track?.length) {
    const seen = new Set(local.getTrack().map((p) => `${p[0]},${p[1]}`));
    const merged = [...local.getTrack()];
    for (const p of data.track) {
      const k = `${p[0]},${p[1]}`;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(p);
      }
    }
    local.setTrack(merged);
  }
  if (data.zone?.length && !local.getZone()) local.setZone(data.zone);
  if (data.contact && !local.getContact()) local.setContact(data.contact);

  return added;
}

async function doImport(file: File): Promise<void> {
  try {
    const data = JSON.parse(await file.text()) as Backup;
    if (data.app !== FORMAT) {
      toast('Das ist keine ReliefScope-Sicherung.', 'error');
      return;
    }
    const added = await mergeBackup(data);
    toast(`${added} neue Einträge übernommen. App wird neu geladen …`, 'success');
    window.setTimeout(() => location.reload(), 1200);
  } catch {
    toast('Sicherung konnte nicht gelesen werden (beschädigt?).', 'error');
  }
}

/** Baut den Backup-Abschnitt im „Mehr"-Tab und verdrahtet Export/Import. */
export function initBackup(): void {
  const host = document.querySelector<HTMLElement>('[data-tab="mehr"] #mehr-content');
  if (!host) return;

  const section = document.createElement('section');
  section.className = 'mehr-card';
  section.innerHTML = `
    <h3>Daten sichern</h3>
    <p class="muted">Alle Funde (inkl. Fotos), Gebiete, Spur und Zone in eine Datei
      sichern — als Backup und um auf ein neues Gerät umzuziehen. Deine Daten
      bleiben dabei auf deinem Gerät.</p>
    <div class="row2">
      <button type="button" id="backup-export" class="btn-secondary">Sicherung exportieren</button>
      <button type="button" id="backup-import" class="btn-secondary">Sicherung importieren</button>
    </div>
    <input type="file" id="backup-file" accept="application/json,.json" hidden />`;
  host.appendChild(section);

  const fileInput = section.querySelector<HTMLInputElement>('#backup-file')!;
  section
    .querySelector('#backup-export')
    ?.addEventListener('click', () => void doExport());
  section
    .querySelector('#backup-import')
    ?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void doImport(file);
    fileInput.value = '';
  });
}
