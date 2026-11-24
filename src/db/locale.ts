import Dexie from "dexie";
import type { ContenutoLocale } from "../lib/migrazione";

// Database IndexedDB della versione 1 dell'app (dati solo sul dispositivo).
// Dalla versione 2 serve solo per importare quei dati nel cloud.
const NOME = "mygym";
const TABELLE = ["schede", "allenamenti", "esercizi", "sessioni", "serie", "diete"] as const;

function apri() {
  const db = new Dexie(NOME);
  // stessi schemi della v1: Dexie deve conoscerli per aprire il database esistente
  db.version(1).stores({
    schede: "++id, nome, attiva",
    allenamenti: "++id, schedaId, ordine",
    esercizi: "++id, allenamentoId, ordine",
    sessioni: "++id, data, schedaId, allenamentoId",
    serie: "++id, sessioneId, esercizioId, nomeEsercizio",
    diete: "++id, caricataIl",
  });
  db.version(2).stores({ diete: "++id, aggiornataIl" });
  return db;
}

/** Dati della versione locale, oppure null se su questo dispositivo non ce ne sono */
export async function leggiDatiLocali(): Promise<ContenutoLocale | null> {
  if (!(await Dexie.exists(NOME))) return null;
  const db = apri();
  try {
    const contenuto = {} as Record<string, unknown[]>;
    for (const t of TABELLE) contenuto[t] = await db.table(t).toArray();
    const vuoto = TABELLE.every((t) => contenuto[t].length === 0);
    return vuoto ? null : (contenuto as unknown as ContenutoLocale);
  } finally {
    db.close();
  }
}

/** Elimina il vecchio database locale dopo l'importazione */
export async function cancellaDatiLocali() {
  await Dexie.delete(NOME);
}
