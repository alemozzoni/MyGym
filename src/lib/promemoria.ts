// Bozze degli allenamenti: piccolo stato persistente in localStorage,
// con notifica ai componenti React quando cambia.
import { useSyncExternalStore } from 'react';

export const K_BOZZA_NUOVA = 'mygym:bozza:nuova';
export const chiaveBozza = (sessioneId?: string) => (sessioneId ? `mygym:bozza:${sessioneId}` : K_BOZZA_NUOVA);

const EVENTO = 'mygym:storage';

const scrivi = (k: string, v: string | null) => {
  if (v === null) localStorage.removeItem(k);
  else localStorage.setItem(k, v);
  window.dispatchEvent(new Event(EVENTO));
};

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
