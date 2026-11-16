// Promemoria backup e bozze: piccolo stato persistente in localStorage,
// con notifica ai componenti React quando cambia.
import { useSyncExternalStore } from 'react';

const K_ULTIMO = 'mygym:ultimoBackup';
const K_FREQUENZA = 'mygym:frequenzaBackup'; // giorni; 0 = disattivato
const K_POSTICIPA = 'mygym:posticipaBackup';
export const K_BOZZA_NUOVA = 'mygym:bozza:nuova';
export const chiaveBozza = (sessioneId?: number) => (sessioneId ? `mygym:bozza:${sessioneId}` : K_BOZZA_NUOVA);

const GIORNO = 24 * 60 * 60 * 1000;
const EVENTO = 'mygym:storage';

const leggiNum = (k: string) => {
  const v = Number(localStorage.getItem(k));
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const scrivi = (k: string, v: string | null) => {
  if (v === null) localStorage.removeItem(k);
  else localStorage.setItem(k, v);
  window.dispatchEvent(new Event(EVENTO));
};

export const ultimoBackup = () => leggiNum(K_ULTIMO);
export const registraBackup = () => scrivi(K_ULTIMO, String(Date.now()));
export const frequenzaBackup = () => {
  const v = localStorage.getItem(K_FREQUENZA);
  return v === null ? 7 : Number(v) || 0; // predefinito: 7 giorni
};
export const impostaFrequenza = (giorni: number) => scrivi(K_FREQUENZA, String(giorni));
export const posticipaBackup = () => scrivi(K_POSTICIPA, String(Date.now() + GIORNO));

/** Il promemoria va mostrato? (ci sono dati da salvare e il backup è più vecchio della frequenza scelta) */
export function backupScaduto(ciSonoDati: boolean, ora = Date.now()) {
  const freq = frequenzaBackup();
  if (!freq || !ciSonoDati) return false;
  if (leggiNum(K_POSTICIPA) > ora) return false;
  const ultimo = ultimoBackup();
  return !ultimo || ora - ultimo >= freq * GIORNO;
}

export const giorniDa = (ts: number, ora = Date.now()) => Math.floor((ora - ts) / GIORNO);

// ---- bozze degli allenamenti non ancora salvati ----
export function leggiBozza<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
export const salvaBozza = (k: string, valore: unknown) => scrivi(k, JSON.stringify(valore));
export const eliminaBozza = (k: string) => scrivi(k, null);

/** Rilegge i valori a ogni modifica (anche da altre schede/finestre) */
export function useLocalStorage<T>(leggi: () => T): T {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(EVENTO, cb);
        window.removeEventListener('storage', cb);
      };
    },
    leggi,
  );
}
