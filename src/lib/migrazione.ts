import type {
  Dati,
  Dieta,
  GiornoDieta,
  Scheda,
  Sessione,
  SerieSvolta,
} from "../db/tipi";

/** Tabelle della versione locale (Dexie), con id numerici */
export interface ContenutoLocale {
  schede: { id: number; nome: string; note?: string; attiva: boolean; creataIl: number; aggiornataIl: number }[];
  allenamenti: { id: number; schedaId: number; nome: string; ordine: number }[];
  esercizi: {
    id: number;
    allenamentoId: number;
    nome: string;
    descrizione: string;
    serieTarget: number;
    ripTarget: string;
    recuperoSec?: number;
    ordine: number;
  }[];
  sessioni: {
    id: number;
    data: string;
    schedaId: number;
    allenamentoId: number;
    nomeScheda: string;
    nomeAllenamento: string;
    note?: string;
  }[];
  serie: {
    sessioneId: number;
    esercizioId: number;
    nomeEsercizio: string;
    ordineEsercizio: number;
    numero: number;
    ripetizioni: number;
    kg: number;
  }[];
  // v1: PDF (vengono ignorati); v2: diete strutturate
  diete: { id: number; titolo: string; note?: string; attiva?: boolean; giorni?: GiornoDieta[]; creataIl?: number; aggiornataIl?: number }[];
}

// id stabili: importare due volte gli stessi dati sovrascrive invece di duplicare
const idScheda = (n: number) => `locale-scheda-${n}`;
const idAllenamento = (n: number) => `locale-allenamento-${n}`;
const idEsercizio = (n: number) => `locale-esercizio-${n}`;
const idSessione = (n: number) => `locale-sessione-${n}`;
const idDieta = (n: number) => `locale-dieta-${n}`;

const perOrdine = <T extends { ordine: number; id: number }>(a: T, b: T) =>
  a.ordine - b.ordine || a.id - b.id;

/** Converte le tabelle relazionali della versione locale nei documenti annidati di Firestore */
export function convertiDatiLocali(c: Partial<ContenutoLocale>): Dati {
  const allenamenti = c.allenamenti ?? [];
  const esercizi = c.esercizi ?? [];
  const serie = c.serie ?? [];

  const schede: Scheda[] = (c.schede ?? []).map((s) => ({
    id: idScheda(s.id),
    nome: s.nome,
    note: s.note,
    attiva: !!s.attiva,
    creataIl: s.creataIl ?? Date.now(),
    aggiornataIl: s.aggiornataIl ?? Date.now(),
    allenamenti: allenamenti
      .filter((a) => a.schedaId === s.id)
      .sort(perOrdine)
      .map((a) => ({
        id: idAllenamento(a.id),
        nome: a.nome,
        esercizi: esercizi
          .filter((e) => e.allenamentoId === a.id)
          .sort(perOrdine)
          .map((e) => ({
            id: idEsercizio(e.id),
            nome: e.nome,
            descrizione: e.descrizione ?? "",
            serieTarget: e.serieTarget,
            ripTarget: e.ripTarget,
            recuperoSec: e.recuperoSec,
          })),
      })),
  }));

  const sessioni: Sessione[] = (c.sessioni ?? []).map((s) => ({
    id: idSessione(s.id),
    data: s.data,
    schedaId: s.schedaId ? idScheda(s.schedaId) : "",
    allenamentoId: s.allenamentoId ? idAllenamento(s.allenamentoId) : "",
    nomeScheda: s.nomeScheda ?? "",
    nomeAllenamento: s.nomeAllenamento ?? "",
    note: s.note,
    // l'id locale cresce con l'inserimento: conserva l'ordine tra sessioni dello stesso giorno
    creataIl: s.id,
    serie: serie
      .filter((x) => x.sessioneId === s.id)
      .sort((a, b) => a.ordineEsercizio - b.ordineEsercizio || a.numero - b.numero)
      .map(
        (x): SerieSvolta => ({
          esercizioId: x.esercizioId ? idEsercizio(x.esercizioId) : "",
          nomeEsercizio: x.nomeEsercizio,
          ordineEsercizio: x.ordineEsercizio,
          numero: x.numero,
          ripetizioni: x.ripetizioni,
          kg: x.kg,
        }),
      ),
  }));

  const diete: Dieta[] = (c.diete ?? [])
    .filter((d) => Array.isArray(d.giorni))
    .map((d) => ({
      id: idDieta(d.id),
      titolo: d.titolo,
      note: d.note,
      attiva: !!d.attiva,
      giorni: d.giorni!,
      creataIl: d.creataIl ?? Date.now(),
      aggiornataIl: d.aggiornataIl ?? Date.now(),
    }));

  return { schede, sessioni, diete };
}
