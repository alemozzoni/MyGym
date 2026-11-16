// Calcoli per la sezione Progressi

export interface SerieBase {
  ripetizioni: number;
  kg: number;
}

export interface PuntoSessione {
  data: string; // YYYY-MM-DD
  caricoMax: number;
  e1rm: number; // 1RM stimato (migliore serie)
  volume: number; // Σ rip × kg
  ripTotali: number;
  serie: number;
}

export type Stato = 'progresso' | 'stallo' | 'calo' | 'dati-insufficienti';

/** 1RM stimato con la formula di Epley; con 1 ripetizione coincide con il carico */
export function e1rm(kg: number, rip: number): number {
  if (kg <= 0 || rip <= 0) return 0;
  if (rip === 1) return kg;
  return kg * (1 + rip / 30);
}

export function riepilogoSessione(data: string, serie: SerieBase[]): PuntoSessione {
  let caricoMax = 0, migliore = 0, volume = 0, ripTotali = 0;
  for (const s of serie) {
    caricoMax = Math.max(caricoMax, s.kg);
    migliore = Math.max(migliore, e1rm(s.kg, s.ripetizioni));
    volume += s.kg * s.ripetizioni;
    ripTotali += s.ripetizioni;
  }
  return {
    data,
    caricoMax,
    e1rm: arrotonda(migliore),
    volume: arrotonda(volume),
    ripTotali,
    serie: serie.length,
  };
}

/** Raggruppa le serie per sessione/data e restituisce i punti ordinati per data */
export function puntiDaSerie(righe: (SerieBase & { data: string; sessioneId: number })[]): PuntoSessione[] {
  const gruppi = new Map<number, { data: string; serie: SerieBase[] }>();
  for (const r of righe) {
    const g = gruppi.get(r.sessioneId) ?? { data: r.data, serie: [] };
    g.serie.push(r);
    gruppi.set(r.sessioneId, g);
  }
  return [...gruppi.values()]
    .map((g) => riepilogoSessione(g.data, g.serie))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Confronta la media delle ultime `finestra` sessioni con le `finestra` precedenti.
 * Usa l'1RM stimato; per esercizi a corpo libero (kg = 0) usa le ripetizioni totali.
 */
export function valutaAndamento(punti: PuntoSessione[], finestra = 3, soglia = 0.02) {
  const corpoLibero = punti.every((p) => p.caricoMax === 0);
  const metrica = (p: PuntoSessione) => (corpoLibero ? p.ripTotali : p.e1rm);
  if (punti.length < 4) return { stato: 'dati-insufficienti' as Stato, variazione: 0, corpoLibero };

  const n = Math.min(finestra, Math.floor(punti.length / 2));
  const recenti = punti.slice(-n);
  const precedenti = punti.slice(-2 * n, -n);
  const media = (xs: PuntoSessione[]) => xs.reduce((t, p) => t + metrica(p), 0) / xs.length;
  const prima = media(precedenti);
  const dopo = media(recenti);
  const variazione = prima > 0 ? (dopo - prima) / prima : 0;

  const stato: Stato = variazione > soglia ? 'progresso' : variazione < -soglia ? 'calo' : 'stallo';
  return { stato, variazione, corpoLibero };
}

/** Record personali */
export function record(punti: PuntoSessione[]) {
  const migliore = <K extends keyof PuntoSessione>(k: K) =>
    punti.reduce<PuntoSessione | null>((m, p) => (!m || (p[k] as number) > (m[k] as number) ? p : m), null);
  return {
    caricoMax: migliore('caricoMax'),
    e1rm: migliore('e1rm'),
    volume: migliore('volume'),
    ripTotali: migliore('ripTotali'),
  };
}

export function arrotonda(n: number, decimali = 1) {
  const f = 10 ** decimali;
  return Math.round(n * f) / f;
}

/** Normalizza il nome di un esercizio per confrontarlo tra schede diverse */
export function normalizzaNome(nome: string) {
  return nome.trim().replace(/\s+/g, ' ');
}
