// Tipi dei dati salvati su Firestore (un documento per scheda, sessione e dieta).
// Gli id sono stringhe: auto-ID di Firestore per i documenti, id casuali per gli elementi annidati.

export interface Esercizio {
  id: string;
  nome: string;
  descrizione: string;
  serieTarget: number;
  ripTarget: string; // testo libero: "8-10", "12", "max"
  recuperoSec?: number;
}

/** Un "giorno" della scheda, es. "Giorno A – Petto/Tricipiti". L'ordine è quello dell'array. */
export interface Allenamento {
  id: string;
  nome: string;
  esercizi: Esercizio[];
}

export interface Scheda {
  id: string;
  nome: string;
  note?: string;
  attiva: boolean;
  allenamenti: Allenamento[];
  creataIl: number;
  aggiornataIl: number;
}

export interface SerieSvolta {
  esercizioId: string; // "" per gli esercizi aggiunti fuori scheda
  nomeEsercizio: string; // usato per raggruppare i grafici
  ordineEsercizio: number;
  numero: number;
  ripetizioni: number;
  kg: number;
}

/** Allenamento svolto in una certa data, con tutte le sue serie */
export interface Sessione {
  id: string;
  data: string; // YYYY-MM-DD
  schedaId: string;
  allenamentoId: string;
  // copie dei nomi: lo storico resta leggibile anche se la scheda viene eliminata
  nomeScheda: string;
  nomeAllenamento: string;
  note?: string;
  serie: SerieSvolta[];
  creataIl: number;
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
  nome: string;
  orario?: string;
  alimenti: Alimento[];
  note?: string;
}

export interface GiornoDieta {
  nome: string;
  pasti: Pasto[];
}

export interface Dieta {
  id: string;
  titolo: string;
  note?: string;
  attiva: boolean;
  giorni: GiornoDieta[];
  creataIl: number;
  aggiornataIl: number;
}

/** Tutti i dati dell'utente, come arrivano dagli ascoltatori di Firestore */
export interface Dati {
  schede: Scheda[];
  sessioni: Sessione[];
  diete: Dieta[];
}
