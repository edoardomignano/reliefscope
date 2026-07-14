/**
 * ALLE amtlichen Endpunkte — genau EIN Ort für URLs, nie im Code raten (PRD § 4).
 * Jeder Eintrag wurde am lebenden Dienst verifiziert (GetCapabilities/GetFeature/REST).
 *
 * ☠️ Verifiziert TOT bzw. gesperrt — NIE verwenden:
 *   - geodaten.bayern.de/ogc/ogc_denkmal.cgi            (404, alter Denkmal-WMS)
 *   - geoservices.bayern.de/wfs/v1/ogc_alkis_ave.cgi    (401, Vertragskunden)
 *   - DGM1-Höhen-WCS …/pro/wcs/dgm/v1/wcs_inspire_dgm1  (401, Vertragskunden)
 *   - WMS-Layer "by_relief" existiert NICHT (leere Kacheln) → by_relief_kombiniert
 */

/** Denkmal-Atlas REST-API (© BLfD, CC BY-ND 4.0). CORS `*`. Koordinaten EPSG:25832. */
export const DENKMAL_API = {
  /** Umkreissuche: bykoord/{E}/{N}?buffer={m}&limit=100 */
  umkreis: (e: number, n: number, bufferM: number, limit = 100) =>
    `https://geoportal.bayern.de/denkmalatlas/denkmalservice/v1/denkmal/preview/bykoord/${e.toFixed(1)}/${n.toFixed(1)}?buffer=${bufferM}&limit=${limit}`,
  /** Detail (amtliche Beschreibung). objtyp muss EXAKT stimmen, sonst 404. */
  detail: (koid: number | string, objtyp: DenkmalObjTyp) =>
    `https://geoportal.bayern.de/denkmalatlas/denkmalservice/v1/denkmal/detail/bykoidandobjtyp/${koid}/${objtyp}`,
  /** Detail über Aktennummer (Alternative). */
  detailByAkte: (aktennummer: string) =>
    `https://geoportal.bayern.de/denkmalatlas/denkmalservice/v1/denkmal/detail/byaktennummer/${encodeURIComponent(aktennummer)}`,
  /** Fotos (nur Baudenkmäler). */
  fotoBase: 'https://www.geodaten.bayern.de/denkmal_static_data/photo_bau_oeffentlich/',
} as const;

export type DenkmalObjTyp = 'bau' | 'boden' | 'ensemble';

/** WMS-Dienste. Alle kostenfrei; Lizenz je Eintrag. Layer-Namen sind VERIFIZIERT. */
export const WMS = {
  /** Denkmal-Sichtebenen (© BLfD, CC BY-ND 4.0). ALLE VIER Kategorien zeigen! */
  denkmal: {
    url: 'https://geoservices.bayern.de/od/wms/gdi/v1/denkmal?',
    layers: {
      /** Bodendenkmäler — lösen das Sondenverbot aus (Art. 7 Abs. 6 BayDSchG). */
      boden: 'bodendenkmalO',
      /** Baudenkmäler (z. B. Festspielhaus Bayreuth — NIE rot in der Ampel!). */
      bau: 'einzeldenkmalO',
      ensemble: 'bauensembleO',
      landschaft: 'landschaftsdenkmalO',
    },
    attribution: 'Denkmaldaten © BLfD, CC BY-ND 4.0',
  },
  /** Gelände-Relief, DGM1-Schummerung (© BVV, CC BY 4.0). */
  relief: {
    url: 'https://geoservices.bayern.de/od/wms/dgm/v1/relief?',
    layer: 'by_relief_kombiniert',
    layerAlt: 'by_relief_schraeglicht',
    attribution: 'Geobasisdaten © Bayerische Vermessungsverwaltung, CC BY 4.0',
  },
  /** Aktuelles Luftbild 20 cm (© BVV, CC BY 4.0). */
  dop20: {
    url: 'https://geoservices.bayern.de/od/wms/dop/v1/dop20?',
    layer: 'by_dop20c',
    attribution: 'Geobasisdaten © Bayerische Vermessungsverwaltung, CC BY 4.0',
  },
  /** Historische Luftbilder seit ~2003 (© BVV, CC BY 4.0). */
  histdop: {
    url: 'https://geoservices.bayern.de/od/wms/histdop/v1/histdop?',
    layerGroup: 'DOP_historisch',
    /** Jahres-Layer für den späteren Zeitreihen-Slider. */
    layerForYear: (jahr: number) => `by_dop_${jahr}_h`,
    attribution: 'Geobasisdaten © Bayerische Vermessungsverwaltung, CC BY 4.0',
  },
  /** Uraufnahme ~1808–1864 (© LDBV). Abdeckung fleckig; leere Kacheln sind NORMAL. */
  uraufnahme: {
    url: 'https://geoservices.bayern.de/od/wms/hist/v1/uraufnahme?',
    layer: 'ur',
    attribution: 'Geobasisdaten © Bayerische Vermessungsverwaltung (LDBV), CC BY 4.0',
  },
  /** ALKIS-Flurstücke (© BVV, CC BY 4.0). queryable=0 → reine Sichtebene. */
  alkis: {
    url: 'https://geoservices.bayern.de/od/wms/alkis/v1/parzellarkarte?',
    layer: 'by_alkis_parzellarkarte_farbe',
    attribution: 'Geobasisdaten © Bayerische Vermessungsverwaltung, CC BY 4.0',
  },
} as const;

/** OSM-Basiskarte. maxNativeZoom 19 ist PFLICHT (sonst schwarze Karte ab Zoom 20). */
export const OSM_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxNativeZoom: 19,
  attribution: '© OpenStreetMap',
} as const;

/** Nominatim-Geocoding (Debounce ≥ 500 ms, Nutzungsrichtlinie!). */
export const NOMINATIM = {
  search: (query: string, limit = 5) =>
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=de&limit=${limit}&accept-language=de`,
} as const;

/** Phase-2-Backend (NICHT v1): INSPIRE-WFS mit Vektor-Polygonen. Nur GML 3.2.1.
 *  Filter-Falle: Bodendenkmal = designationAsString endet auf "archaeologischesDenkmal".
 *  Quirk: numberReturned="0" im Header ist falsch — member zählen. */
export const WFS_DENKMAL_PHASE2 = {
  url: 'https://gdiserv.bayern.de/srv24352/services/inspire_ps_denkmal_simpl-wfs',
  featureType: 'spsde:SimplifiedBavarianMonument',
} as const;

/** Pflicht-Attribution im UI (PRD § 12, rechtlich bindend). */
export const ATTRIBUTION = {
  bvv: 'Geobasisdaten © Bayerische Vermessungsverwaltung, CC BY 4.0',
  blfd: 'Denkmaldaten © BLfD, CC BY-ND 4.0',
} as const;
