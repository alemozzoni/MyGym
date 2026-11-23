import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "./firebase";
import type { Dati } from "./tipi";

interface Stato {
  /** undefined = verifica in corso, null = non autenticato */
  utente: User | null | undefined;
  /** null finché non sono arrivati tutti i dati (dalla cache locale o dal server) */
  dati: Dati | null;
}

const Contesto = createContext<Stato>({ utente: undefined, dati: null });

const COLLEZIONI = ["schede", "sessioni", "diete"] as const;

/**
 * Tiene in memoria tutti i dati dell'utente con gli ascoltatori di Firestore.
 * Sono pochi (uso personale) e così le pagine lavorano su semplici array,
 * aggiornati in tempo reale anche dalle modifiche fatte su altri dispositivi.
 */
export function DatiProvider({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<User | null | undefined>(undefined);
  const [parziali, setParziali] = useState<Partial<Dati>>({});

  useEffect(() => onAuthStateChanged(auth, setUtente), []);

  const uid = utente?.uid;
  useEffect(() => {
    setParziali({});
    if (!uid) return;
    const stop = COLLEZIONI.map((nome) =>
      onSnapshot(
        collection(firestore, "utenti", uid, nome),
        (snap) =>
          setParziali((p) => ({
            ...p,
            [nome]: snap.docs.map((d) => ({ ...d.data(), id: d.id })),
          })),
        (errore) => console.error(`Lettura di ${nome} non riuscita`, errore),
      ),
    );
    return () => stop.forEach((f) => f());
  }, [uid]);

  const dati =
    parziali.schede && parziali.sessioni && parziali.diete
      ? (parziali as Dati)
      : null;

  return (
    <Contesto.Provider value={{ utente, dati }}>{children}</Contesto.Provider>
  );
}

export const useUtente = () => useContext(Contesto).utente;

/** Dati dell'utente; null durante il primo caricamento */
export const useDati = () => useContext(Contesto).dati;
