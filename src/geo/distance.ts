/**
 * Metrische Distanz zwischen zwei WGS84-Punkten (Haversine).
 * Grundlage für Ampel-Distanzen, Spur-Länge und Rauschfilter.
 */

const EARTH_RADIUS_M = 6371008.8; // mittlerer Erdradius

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Länge eines Linienzugs ([lat, lng]-Paare) in Metern. */
export function pathLengthM(points: [number, number][]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += distanceM(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return sum;
}

/** Kurzformat: „264 m" bzw. „1.93 km". */
export function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
