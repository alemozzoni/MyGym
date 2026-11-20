import Dexie, { type EntityTable } from "dexie";

// ---- Tipi delle entità ----

export interface Scheda {
  id: number;
  nome: string;
  note?: string;
  attiva: boolean;
  creataIl: number;
  aggiornataIl: number;
}

/** Un "giorno" della scheda, es. "Giorno A – Petto/Tricipiti" */
export interface Allenamento {
  id: number;
  schedaId: number;
  nome: string;
  ordine: number;
}

export interface Esercizio {
  id: number;
  allenamentoId: number;
  nome: string;
  descrizione: string;
  serieTarget: number;
  ripTarget: string; // testo libero: "8-10", "12", "max"
  recuperoSec?: number;
  ordine: number;
}

/** Allenamento svolto in una certa data */
export interface Sessione {
  id: number;
  data: string; // YYYY-MM-DD
  schedaId: number;
  allenamentoId: number;
  // copie dei nomi: lo storico resta leggibile anche se la scheda viene eliminata
  nomeScheda: string;
  nomeAllenamento: string;
  note?: string;
}

export interface SerieSvolta {
  id: number;
  sessioneId: number;
  esercizioId: number;
  nomeEsercizio: string; // copia, usata per raggruppare i grafici
  ordineEsercizio: number;
  numero: number;
  ripetizioni: number;
  kg: number;
}

// ---- Dieta strutturata: giorni → pasti → alimenti ----

export interface Alimento {
  nome: string;
  quantita: string; // testo libero: "80", "1", "q.b."
  unita?: string; // g, ml, pz…
  // macro facoltative, riferite alla quantità indicata
  kcal?: number;
  proteine?: number;
  carboidrati?: number;
  grassi?: number;
  note?: string;
}

export interface Pasto {
  nome: string; // Colazione, Pranzo…
  orario?: string;
  alimenti: Alimento[];
  note?: string;
}

export interface GiornoDieta {
  nome: string; // "Lunedì", "Giorno ON"…
  pasti: Pasto[];
}

export interface Dieta {
  id: number;
  titolo: string;
  note?: string;
  attiva: boolean;
  giorni: GiornoDieta[];
  creataIl: number;
  aggiornataIl: number;
}

// ---- Database ----

export const db = new Dexie("mygym") as Dexie & {
  schede: EntityTable<Scheda, "id">;
  allenamenti: EntityTable<Allenamento, "id">;
  esercizi: EntityTable<Esercizio, "id">;
  sessioni: EntityTable<Sessione, "id">;
  serie: EntityTable<SerieSvolta, "id">;
  diete: EntityTable<Dieta, "id">;
};

// Solo i campi indicizzati vanno elencati nello schema
db.version(1).stores({
  schede: "++id, nome, attiva",
  allenamenti: "++id, schedaId, ordine",
  esercizi: "++id, allenamentoId, ordine",
  sessioni: "++id, data, schedaId, allenamentoId",
  serie: "++id, sessioneId, esercizioId, nomeEsercizio",
  diete: "++id, caricataIl",
});

// v2: le diete non sono più PDF ma piani strutturati.
// I vecchi PDF vengono eliminati (scelta dell'utente: non si usano più).
db.version(2)
  .stores({ diete: "++id, aggiornataIl" })
  .upgrade((tx) => tx.table("diete").clear());

export const TABELLE = [
  "schede",
  "allenamenti",
  "esercizi",
  "sessioni",
  "serie",
  "diete",
] as const;
