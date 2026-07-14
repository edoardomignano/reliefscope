/**
 * Ampel-Logik (TASK-020, FR-003). REINE Funktion → im Unit-Test abgesichert.
 *
 * KRITISCH (PRD § 11): NUR Bodendenkmäler (`objtyp === 'boden'`) lösen rot/gelb aus.
 * Bau-/Ensemble-/Landschaftsdenkmäler NIE — das Festspielhaus (Baudenkmal) darf nie
 * rot geben. Das ist der Kern der rechtlichen Korrektheit.
 *
 * Texte folgen Vision § Voice & Tone; „Kein Freibrief" wird in der UI ergänzt.
 */
import type { DenkmalNear } from './api';

export type AmpelLevel = 'rot' | 'gelb' | 'gruen';

/** Nähebereich eines Bodendenkmals (Bodeneingriffe erlaubnispflichtig). */
export const NAEHE_M = 300;
/** „auf/an" dem Denkmal → Sondenverbot. */
export const AUF_M = 50;
/** Obergrenze fürs „Fundpotenzial"-Umfeld. */
const UMFELD_MAX_M = 800;

export interface AmpelResult {
  level: AmpelLevel;
  title: string;
  reasons: string[];
  /** Nächstes Bodendenkmal (oder null). */
  nearestBoden: DenkmalNear | null;
  /** Bodendenkmäler in NAEHE..UMFELD_MAX (legaler Abstand, aber Kontext). */
  umfeldBoden: number;
  /** Bau-/Ensemble-Denkmäler im Umkreis (Siedlungsgeschichte). */
  bauEnsemble: number;
}

export function computeAmpel(monuments: DenkmalNear[]): AmpelResult {
  const boden = monuments
    .filter((m) => m.objtyp === 'boden')
    .sort((a, b) => a.distance - b.distance);
  const nearest = boden[0] ?? null;
  const umfeldBoden = boden.filter(
    (m) => m.distance >= NAEHE_M && m.distance <= UMFELD_MAX_M,
  ).length;
  const bauEnsemble = monuments.filter((m) => m.objtyp !== 'boden').length;

  const reasons: string[] = [];
  let level: AmpelLevel;
  let title: string;

  if (nearest && nearest.distance < AUF_M) {
    level = 'rot';
    title = 'Achtung: Bodendenkmal — Sondeln verboten';
    reasons.push(
      `Du stehst auf einem Bodendenkmal (${Math.round(nearest.distance)} m): „${
        nearest.bezeichnung || 'ohne Namen'
      }". Sondeln ist hier verboten (Art. 7 Abs. 6 BayDSchG).`,
    );
  } else if (nearest && nearest.distance < NAEHE_M) {
    level = 'gelb';
    title = 'Vorsicht — Nähebereich';
    reasons.push(
      `Bodendenkmal in ${Math.round(nearest.distance)} m. Im Nähebereich sind Bodeneingriffe erlaubnispflichtig.`,
    );
  } else {
    level = 'gruen';
    title = 'Keine bekannte Sperre';
    reasons.push(
      nearest
        ? `Nächstes Bodendenkmal in ${Math.round(nearest.distance)} m — außerhalb des ${NAEHE_M}-m-Nähebereichs.`
        : 'Kein eingetragenes Bodendenkmal im Umkreis.',
    );
  }

  if (umfeldBoden > 0) {
    reasons.push(
      `Fundpotenzial: ${umfeldBoden} Bodendenkmal${umfeldBoden > 1 ? 'er' : ''} in ${NAEHE_M}–${UMFELD_MAX_M} m — die Gegend war schon in alter Zeit genutzt.`,
    );
  }
  if (bauEnsemble > 0) {
    reasons.push(
      `${bauEnsemble} Bau-/Ensemble-Denkmal${bauEnsemble > 1 ? 'e' : ''} im Umkreis — Siedlungsgeschichte.`,
    );
  }

  return { level, title, reasons, nearestBoden: nearest, umfeldBoden, bauEnsemble };
}

/** Immer bei gelb/grün mitführen (Vision § Voice & Tone — nie „Freibrief"). */
export const KEIN_FREIBRIEF =
  'Kein Freibrief: nur eingetragene Denkmäler, Stand heute. Erlaubnis des Eigentümers nötig; Landnutzung und Naturschutz sind hier nicht geprüft.';
