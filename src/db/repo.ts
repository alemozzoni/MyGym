import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";
import type {
  Allenamento,
  Dati,
  Dieta,
  Scheda,
  Sessione,
  SerieSvolta,
} from "./tipi";
import { copiaAllenamenti, giornoVuoto } from "../lib/modello";

// Le scritture NON vengono attese: con la cache offline Firestore aggiorna subito
// i dati locali (e quindi l'interfaccia), ma la promessa si risolve solo quando
// il server conferma. Aspettarla bloccherebbe l'app senza connessione.
function invia(p: Promise<unknown>) {
  p.catch((e) => {
    console.error(e);
    alert(`Salvataggio non riuscito: ${(e as Error).message}`);
  });
}

type Collezione = keyof Dati;

function col(nome: Collezione) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Accesso non effettuato");
  return collection(firestore, "utenti", uid, nome);
}
const rif = (nome: Collezione, id: string) => doc(col(nome), id);

/** Scrive un documento senza il campo id (che è già il nome del documento) */
function salva<T extends { id: string }>(r: DocumentReference, dati: T) {
  const { id: _id, ...resto } = dati;
  invia(setDoc(r, resto));
}

/** Rende attivo un solo elemento della collezione */
function attivaSolo(nome: "schede" | "diete", id: string, elenco: { id: string; attiva: boolean }[]) {
  const batch = writeBatch(firestore);
  for (const x of elenco)
    if (x.attiva !== (x.id === id)) batch.update(rif(nome, x.id), { attiva: x.id === id });
  invia(batch.commit());
}

/** Elimina un elemento e, se era quello attivo, attiva il più recente rimasto */
function eliminaAttivo(nome: "schede" | "diete", el: { id: string; attiva: boolean }, elenco: { id: string; aggiornataIl: number }[]) {
  const batch = writeBatch(firestore);
  batch.delete(rif(nome, el.id));
  if (el.attiva) {
    const altra = elenco
      .filter((x) => x.id !== el.id)
      .sort((a, b) => b.aggiornataIl - a.aggiornataIl)[0];
    if (altra) batch.update(rif(nome, altra.id), { attiva: true });
  }
  invia(batch.commit());
}

// ================= SCHEDE =================

export function creaScheda(nome: string, note: string | undefined, schede: Scheda[]): string {
  const r = doc(col("schede"));
  const ora = Date.now();
  salva(r, {
    id: r.id,
    nome,
    note,
    attiva: !schede.some((s) => s.attiva),
    allenamenti: [],
    creataIl: ora,
    aggiornataIl: ora,
  } satisfies Scheda);
  return r.id;
}

export function aggiornaScheda(id: string, modifiche: Partial<Pick<Scheda, "nome" | "note">>) {
  invia(updateDoc(rif("schede", id), { ...modifiche, aggiornataIl: Date.now() }));
}

/** Modifica allenamenti ed esercizi della scheda partendo da una copia */
export function modificaAllenamenti(s: Scheda, f: (allenamenti: Allenamento[]) => Allenamento[]) {
  invia(
    updateDoc(rif("schede", s.id), {
      allenamenti: f(structuredClone(s.allenamenti)),
      aggiornataIl: Date.now(),
    }),
  );
}

export const impostaSchedaAttiva = (id: string, schede: Scheda[]) => attivaSolo("schede", id, schede);

/** Le sessioni registrate restano nello storico */
export const eliminaScheda = (s: Scheda, schede: Scheda[]) => eliminaAttivo("schede", s, schede);

export function duplicaScheda(s: Scheda): string {
  const r = doc(col("schede"));
  const ora = Date.now();
  salva(r, {
    ...s,
    id: r.id,
    nome: `${s.nome} (copia)`,
    attiva: false,
    allenamenti: copiaAllenamenti(s),
    creataIl: ora,
    aggiornataIl: ora,
  });
  return r.id;
}

// ================= SESSIONI =================

/** Crea o sostituisce una sessione con tutte le sue serie */
export function salvaSessione(
  dati: { id?: string; data: string; schedaId: string; allenamentoId: string; note?: string },
  serie: SerieSvolta[],
  schede: Scheda[],
  esistente?: Sessione,
): string {
  const scheda = schede.find((s) => s.id === dati.schedaId);
  const allenamento = scheda?.allenamenti.find((a) => a.id === dati.allenamentoId);
  const r = dati.id ? rif("sessioni", dati.id) : doc(col("sessioni"));
  salva(r, {
    id: r.id,
    data: dati.data,
    schedaId: dati.schedaId,
    allenamentoId: dati.allenamentoId,
    // se la scheda è stata eliminata si conservano i nomi salvati in precedenza
    nomeScheda: scheda?.nome || esistente?.nomeScheda || "",
    nomeAllenamento: allenamento?.nome || esistente?.nomeAllenamento || "",
    note: dati.note,
    serie: serie.filter((s) => s.ripetizioni > 0 || s.kg > 0),
    creataIl: esistente?.creataIl ?? Date.now(),
  } satisfies Sessione);
  return r.id;
}

export function eliminaSessione(id: string) {
  invia(deleteDoc(rif("sessioni", id)));
}

// ================= DIETE =================

export function creaDieta(titolo: string, note: string | undefined, diete: Dieta[]): string {
  const r = doc(col("diete"));
  const ora = Date.now();
  salva(r, {
    id: r.id,
    titolo,
    note,
    attiva: !diete.some((d) => d.attiva),
    giorni: [giornoVuoto()],
    creataIl: ora,
    aggiornataIl: ora,
  } satisfies Dieta);
  return r.id;
}

/** Aggiorna titolo, note o l'intera struttura dei giorni */
export function aggiornaDieta(id: string, modifiche: Partial<Pick<Dieta, "titolo" | "note" | "giorni">>) {
  invia(updateDoc(rif("diete", id), { ...modifiche, aggiornataIl: Date.now() }));
}

export const impostaDietaAttiva = (id: string, diete: Dieta[]) => attivaSolo("diete", id, diete);

export const eliminaDieta = (d: Dieta, diete: Dieta[]) => eliminaAttivo("diete", d, diete);

export function duplicaDieta(d: Dieta): string {
  const r = doc(col("diete"));
  const ora = Date.now();
  salva(r, {
    ...d,
    id: r.id,
    titolo: `${d.titolo} (copia)`,
    attiva: false,
    giorni: structuredClone(d.giorni),
    creataIl: ora,
    aggiornataIl: ora,
  });
  return r.id;
}

// ================= IMPORTAZIONE =================

/**
 * Scrive in blocco i dati importati (migrazione o file di backup).
 * Con `sostituisci` elimina prima i dati attuali.
 * Qui la promessa viene attesa: serve sapere quando l'importazione è conclusa.
 */
export async function importaDati(nuovi: Dati, attuali: Dati, sostituisci: boolean) {
  const operazioni: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
  if (sostituisci)
    for (const nome of ["schede", "sessioni", "diete"] as const)
      for (const x of attuali[nome]) operazioni.push((b) => b.delete(rif(nome, x.id)));
  // non si importano due elementi attivi: se ce n'è già uno si tiene quello attuale
  const giaAttiva = (nome: "schede" | "diete") => !sostituisci && attuali[nome].some((x) => x.attiva);
  for (const nome of ["schede", "sessioni", "diete"] as const)
    for (const x of nuovi[nome]) {
      const { id, ...resto } = x as { id: string; attiva?: boolean };
      if (nome !== "sessioni" && giaAttiva(nome)) resto.attiva = false;
      operazioni.push((b) => b.set(rif(nome, id), resto));
    }
  // un batch accetta al massimo 500 operazioni
  for (let i = 0; i < operazioni.length; i += 450) {
    const b = writeBatch(firestore);
    operazioni.slice(i, i + 450).forEach((op) => op(b));
    await b.commit();
  }
}
