import {
  db,
  type Allenamento,
  type Dieta,
  type GiornoDieta,
  type Esercizio,
  type Scheda,
  type SerieSvolta,
} from "./db";

// ================= SCHEDE =================

export async function creaScheda(nome: string, note?: string): Promise<number> {
  const ora = Date.now();
  const nessunaAttiva = (await db.schede.filter((s) => s.attiva).count()) === 0;
  return db.schede.add({
    nome,
    note,
    attiva: nessunaAttiva,
    creataIl: ora,
    aggiornataIl: ora,
  } as Scheda);
}

export async function aggiornaScheda(
  id: number,
  modifiche: Partial<Pick<Scheda, "nome" | "note">>,
) {
  await db.schede.update(id, { ...modifiche, aggiornataIl: Date.now() });
}

/** Rende attiva una scheda e disattiva tutte le altre */
export async function impostaSchedaAttiva(id: number) {
  await db.transaction("rw", db.schede, async () => {
    await db.schede.toCollection().modify((s) => {
      s.attiva = s.id === id;
    });
  });
}

/** Elimina scheda, allenamenti ed esercizi. Le sessioni registrate restano nello storico. */
export async function eliminaScheda(id: number) {
  await db.transaction(
    "rw",
    db.schede,
    db.allenamenti,
    db.esercizi,
    async () => {
      const allenamenti = await db.allenamenti
        .where("schedaId")
        .equals(id)
        .primaryKeys();
      await db.esercizi.where("allenamentoId").anyOf(allenamenti).delete();
      await db.allenamenti.bulkDelete(allenamenti);
      const eraAttiva = (await db.schede.get(id))?.attiva;
      await db.schede.delete(id);
      // se era la scheda attiva, attiva la più recente rimasta
      if (eraAttiva) {
        const altra = await db.schede.orderBy("id").last();
        if (altra) await db.schede.update(altra.id, { attiva: true });
      }
    },
  );
}

/** Copia completa di una scheda (allenamenti + esercizi) */
export async function duplicaScheda(id: number): Promise<number> {
  return db.transaction(
    "rw",
    db.schede,
    db.allenamenti,
    db.esercizi,
    async () => {
      const originale = await db.schede.get(id);
      if (!originale) throw new Error("Scheda non trovata");
      const ora = Date.now();
      const nuovoId = await db.schede.add({
        nome: `${originale.nome} (copia)`,
        note: originale.note,
        attiva: false,
        creataIl: ora,
        aggiornataIl: ora,
      } as Scheda);
      const allenamenti = await db.allenamenti
        .where("schedaId")
        .equals(id)
        .toArray();
      for (const a of allenamenti) {
        const nuovoAll = await db.allenamenti.add({
          schedaId: nuovoId,
          nome: a.nome,
          ordine: a.ordine,
        } as Allenamento);
        const esercizi = await db.esercizi
          .where("allenamentoId")
          .equals(a.id)
          .toArray();
        await db.esercizi.bulkAdd(
          esercizi.map(
            ({ id: _id, ...e }) =>
              ({ ...e, allenamentoId: nuovoAll }) as Esercizio,
          ),
        );
      }
      return nuovoId;
    },
  );
}

// ================= ALLENAMENTI =================

export async function creaAllenamento(
  schedaId: number,
  nome: string,
): Promise<number> {
  const ultimo = await db.allenamenti
    .where("schedaId")
    .equals(schedaId)
    .sortBy("ordine");
  const ordine = ultimo.length ? ultimo[ultimo.length - 1].ordine + 1 : 0;
  await toccaScheda(schedaId);
  return db.allenamenti.add({ schedaId, nome, ordine } as Allenamento);
}

export async function rinominaAllenamento(id: number, nome: string) {
  await db.allenamenti.update(id, { nome });
}

export async function eliminaAllenamento(id: number) {
  await db.transaction("rw", db.allenamenti, db.esercizi, async () => {
    await db.esercizi.where("allenamentoId").equals(id).delete();
    await db.allenamenti.delete(id);
  });
}

// ================= ESERCIZI =================

export type DatiEsercizio = Pick<
  Esercizio,
  "nome" | "descrizione" | "serieTarget" | "ripTarget" | "recuperoSec"
>;

export async function creaEsercizio(
  allenamentoId: number,
  dati: DatiEsercizio,
): Promise<number> {
  const esistenti = await db.esercizi
    .where("allenamentoId")
    .equals(allenamentoId)
    .sortBy("ordine");
  const ordine = esistenti.length
    ? esistenti[esistenti.length - 1].ordine + 1
    : 0;
  return db.esercizi.add({ ...dati, allenamentoId, ordine } as Esercizio);
}

export async function aggiornaEsercizio(
  id: number,
  dati: Partial<DatiEsercizio>,
) {
  await db.esercizi.update(id, dati);
}

export async function eliminaEsercizio(id: number) {
  await db.esercizi.delete(id);
}

/** Sposta un elemento su/giù scambiando l'ordine con il vicino */
export async function spostaEsercizio(id: number, direzione: -1 | 1) {
  const es = await db.esercizi.get(id);
  if (!es) return;
  const lista = await db.esercizi
    .where("allenamentoId")
    .equals(es.allenamentoId)
    .sortBy("ordine");
  await scambiaOrdine(lista, id, direzione, (i, ordine) =>
    db.esercizi.update(i, { ordine }),
  );
}

export async function spostaAllenamento(id: number, direzione: -1 | 1) {
  const a = await db.allenamenti.get(id);
  if (!a) return;
  const lista = await db.allenamenti
    .where("schedaId")
    .equals(a.schedaId)
    .sortBy("ordine");
  await scambiaOrdine(lista, id, direzione, (i, ordine) =>
    db.allenamenti.update(i, { ordine }),
  );
}

async function scambiaOrdine(
  lista: { id: number }[],
  id: number,
  direzione: -1 | 1,
  salva: (id: number, ordine: number) => Promise<unknown>,
) {
  const idx = lista.findIndex((x) => x.id === id);
  const dest = idx + direzione;
  if (idx < 0 || dest < 0 || dest >= lista.length) return;
  const nuova = [...lista];
  [nuova[idx], nuova[dest]] = [nuova[dest], nuova[idx]];
  // riscrive gli ordini in modo compatto (0..n-1)
  await Promise.all(nuova.map((x, i) => salva(x.id, i)));
}

async function toccaScheda(id: number) {
  await db.schede.update(id, { aggiornataIl: Date.now() });
}

// ================= SESSIONI =================

export interface SerieInput {
  esercizioId: number;
  nomeEsercizio: string;
  ordineEsercizio: number;
  numero: number;
  ripetizioni: number;
  kg: number;
}

/** Crea o sostituisce una sessione con tutte le sue serie */
export async function salvaSessione(
  dati: {
    id?: number;
    data: string;
    schedaId: number;
    allenamentoId: number;
    note?: string;
  },
  serie: SerieInput[],
): Promise<number> {
  return db.transaction(
    "rw",
    db.sessioni,
    db.serie,
    db.schede,
    db.allenamenti,
    async () => {
      const scheda = await db.schede.get(dati.schedaId);
      const allenamento = await db.allenamenti.get(dati.allenamentoId);
      const base = {
        data: dati.data,
        schedaId: dati.schedaId,
        allenamentoId: dati.allenamentoId,
        nomeScheda: scheda?.nome ?? "",
        nomeAllenamento: allenamento?.nome ?? "",
        note: dati.note,
      };
      let id = dati.id;
      if (id) {
        // in modifica conserva i nomi originali se la scheda nel frattempo è stata eliminata
        const vecchia = await db.sessioni.get(id);
        await db.sessioni.update(id, {
          ...base,
          nomeScheda: base.nomeScheda || vecchia?.nomeScheda || "",
          nomeAllenamento:
            base.nomeAllenamento || vecchia?.nomeAllenamento || "",
        });
        await db.serie.where("sessioneId").equals(id).delete();
      } else {
        id = await db.sessioni.add(base as never);
      }
      const valide = serie.filter((s) => s.ripetizioni > 0 || s.kg > 0);
      await db.serie.bulkAdd(
        valide.map((s) => ({ ...s, sessioneId: id! }) as SerieSvolta),
      );
      return id!;
    },
  );
}

export async function eliminaSessione(id: number) {
  await db.transaction("rw", db.sessioni, db.serie, async () => {
    await db.serie.where("sessioneId").equals(id).delete();
    await db.sessioni.delete(id);
  });
}

/** Serie dell'ultima sessione (precedente alla data indicata) in cui è stato fatto l'esercizio */
export async function ultimePrestazioni(
  nomeEsercizio: string,
  primaDi: string,
  escludiSessione?: number,
) {
  const tutte = await db.serie
    .where("nomeEsercizio")
    .equals(nomeEsercizio)
    .toArray();
  if (!tutte.length) return null;
  const sessioni = await db.sessioni.bulkGet([
    ...new Set(tutte.map((s) => s.sessioneId)),
  ]);
  const candidate = sessioni
    .filter(
      (s): s is NonNullable<typeof s> =>
        !!s && s.data <= primaDi && s.id !== escludiSessione,
    )
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id));
  const ultima = candidate[0];
  if (!ultima) return null;
  return {
    data: ultima.data,
    serie: tutte
      .filter((s) => s.sessioneId === ultima.id)
      .sort((a, b) => a.numero - b.numero),
  };
}

// ================= DIETE =================

/** Struttura di partenza: un giorno con i pasti più comuni */
export function giornoVuoto(nome = "Giorno 1"): GiornoDieta {
  return {
    nome,
    pasti: ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"].map(
      (nome) => ({ nome, alimenti: [] }),
    ),
  };
}

export async function creaDieta(titolo: string, note?: string): Promise<number> {
  const ora = Date.now();
  const nessunaAttiva = (await db.diete.filter((d) => d.attiva).count()) === 0;
  return db.diete.add({
    titolo,
    note,
    attiva: nessunaAttiva,
    giorni: [giornoVuoto()],
    creataIl: ora,
    aggiornataIl: ora,
  } as Dieta);
}

/** Aggiorna titolo, note o l'intera struttura dei giorni */
export async function aggiornaDieta(
  id: number,
  modifiche: Partial<Pick<Dieta, "titolo" | "note" | "giorni">>,
) {
  await db.diete.update(id, { ...modifiche, aggiornataIl: Date.now() });
}

export async function impostaDietaAttiva(id: number) {
  await db.diete.toCollection().modify((d) => {
    d.attiva = d.id === id;
  });
}

export async function duplicaDieta(id: number): Promise<number> {
  const originale = await db.diete.get(id);
  if (!originale) throw new Error("Dieta non trovata");
  const ora = Date.now();
  const { id: _id, ...resto } = originale;
  return db.diete.add({
    ...resto,
    titolo: `${originale.titolo} (copia)`,
    attiva: false,
    giorni: structuredClone(originale.giorni),
    creataIl: ora,
    aggiornataIl: ora,
  } as Dieta);
}

export async function eliminaDieta(id: number) {
  await db.transaction("rw", db.diete, async () => {
    const eraAttiva = (await db.diete.get(id))?.attiva;
    await db.diete.delete(id);
    if (eraAttiva) {
      const altra = await db.diete.orderBy("aggiornataIl").last();
      if (altra) await db.diete.update(altra.id, { attiva: true });
    }
  });
}
