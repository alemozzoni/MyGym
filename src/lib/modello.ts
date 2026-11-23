import type { GiornoDieta, Scheda, Sessione } from "../db/tipi";

/** Id casuale per gli elementi annidati (allenamenti, esercizi) */
export const nuovoId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

/** Struttura di partenza di una dieta: un giorno con i pasti più comuni */
export function giornoVuoto(nome = "Giorno 1"): GiornoDieta {
  return {
    nome,
    pasti: ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"].map(
      (nome) => ({ nome, alimenti: [] }),
    ),
  };
}

/** Copia profonda di una scheda con nuovi id per allenamenti ed esercizi */
export function copiaAllenamenti(s: Scheda): Scheda["allenamenti"] {
  return s.allenamenti.map((a) => ({
    ...a,
    id: nuovoId(),
    esercizi: a.esercizi.map((e) => ({ ...e, id: nuovoId() })),
  }));
}

/** Ordine stabile: data, poi ordine di creazione */
export const perData = (a: Sessione, b: Sessione) =>
  a.data.localeCompare(b.data) || a.creataIl - b.creataIl;

/** Serie dell'ultima sessione (fino alla data indicata) in cui è stato fatto l'esercizio */
export function ultimePrestazioni(
  sessioni: Sessione[],
  nomeEsercizio: string,
  primaDi: string,
  escludiSessione?: string,
) {
  const ultima = sessioni
    .filter(
      (s) =>
        s.data <= primaDi &&
        s.id !== escludiSessione &&
        s.serie.some((x) => x.nomeEsercizio === nomeEsercizio),
    )
    .sort(perData)
    .pop();
  if (!ultima) return null;
  return {
    data: ultima.data,
    serie: ultima.serie
      .filter((x) => x.nomeEsercizio === nomeEsercizio)
      .sort((a, b) => a.numero - b.numero),
  };
}

/** Nomi di tutti gli esercizi usati (schede e storico), in ordine alfabetico */
export function nomiEsercizi(schede: Scheda[], sessioni: Sessione[]) {
  const nomi = new Set<string>();
  for (const s of schede)
    for (const a of s.allenamenti) for (const e of a.esercizi) nomi.add(e.nome);
  for (const s of sessioni) for (const x of s.serie) nomi.add(x.nomeEsercizio);
  return [...nomi].sort((a, b) => a.localeCompare(b, "it"));
}

/** Sposta l'elemento i di una posizione (-1 su, +1 giù) restituendo un nuovo array */
export function sposta<T>(lista: T[], i: number, direzione: -1 | 1): T[] {
  const dest = i + direzione;
  if (i < 0 || dest < 0 || dest >= lista.length) return lista;
  const nuova = [...lista];
  [nuova[i], nuova[dest]] = [nuova[dest], nuova[i]];
  return nuova;
}
