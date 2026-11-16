import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Esercizio } from "../../db/db";
import {
  eliminaSessione,
  salvaSessione,
  ultimePrestazioni,
  type SerieInput,
} from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import { Stepper } from "../../components/Stepper";
import { IconaCestino, IconaPiu } from "../../components/Icone";
import { formatta, isoGiorno, oggi } from "../../lib/date";
import {
  chiaveBozza,
  eliminaBozza,
  leggiBozza,
  salvaBozza,
} from "../../lib/promemoria";

/** Stato del form salvato in localStorage: sopravvive alla chiusura dell'app da parte di iOS */
interface Bozza {
  data: string;
  schedaId: number;
  allenamentoId: number;
  note: string;
  righe: RigaEsercizio[];
  nomiStorici: { scheda: string; allenamento: string };
  salvataIl: number;
}

const dataValida = (s: string | null) =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : null;

interface RigaSerie {
  ripetizioni: number;
  kg: number;
}

interface RigaEsercizio {
  esercizioId: number;
  nome: string;
  target?: string;
  descrizione?: string;
  serie: RigaSerie[];
}

const righeVuote = (n: number): RigaSerie[] =>
  Array.from({ length: Math.max(1, n) }, () => ({ ripetizioni: 0, kg: 0 }));

const daEsercizi = (esercizi: Esercizio[]): RigaEsercizio[] =>
  esercizi.map((e) => ({
    esercizioId: e.id,
    nome: e.nome,
    target: `${e.serieTarget} × ${e.ripTarget}`,
    descrizione: e.descrizione,
    serie: righeVuote(e.serieTarget),
  }));

export default function Sessione() {
  const idParam = useParams().id;
  const sessioneId = idParam ? Number(idParam) : undefined;
  const [query] = useSearchParams();
  const nav = useNavigate();
  const kBozza = chiaveBozza(sessioneId);

  const [pronto, setPronto] = useState(false);
  const [data, setData] = useState(dataValida(query.get("data")) ?? oggi());
  const [schedaId, setSchedaId] = useState<number>(
    Number(query.get("scheda")) || 0,
  );
  const [allenamentoId, setAllenamentoId] = useState<number>(
    Number(query.get("allenamento")) || 0,
  );
  const [note, setNote] = useState("");
  const [righe, setRighe] = useState<RigaEsercizio[]>([]);
  const [nomiStorici, setNomiStorici] = useState({
    scheda: "",
    allenamento: "",
  });
  // true dopo la prima modifica dell'utente: da lì in poi lo stato viene salvato come bozza
  const [sporco, setSporco] = useState(false);
  const [bozzaRipristinata, setBozzaRipristinata] = useState<number | null>(
    null,
  );

  const schede = useLiveQuery(() => db.schede.toArray());
  const allenamenti = useLiveQuery(
    () =>
      schedaId
        ? db.allenamenti.where("schedaId").equals(schedaId).sortBy("ordine")
        : [],
    [schedaId],
  );

  // ---- Caricamento iniziale ----
  useEffect(() => {
    (async () => {
      const bozza = leggiBozza<Bozza>(kBozza);
      if (bozza) {
        // c'è un allenamento non salvato: lo ripristiniamo
        setData(bozza.data);
        setSchedaId(bozza.schedaId);
        setAllenamentoId(bozza.allenamentoId);
        setNote(bozza.note);
        setRighe(bozza.righe);
        setNomiStorici(bozza.nomiStorici);
        setSporco(true);
        setBozzaRipristinata(bozza.salvataIl);
      } else if (sessioneId) {
        // modifica di una sessione esistente
        const s = await db.sessioni.get(sessioneId);
        if (!s) return nav("/calendario", { replace: true });
        const salvate = (
          await db.serie.where("sessioneId").equals(sessioneId).toArray()
        ).sort(
          (a, b) =>
            a.ordineEsercizio - b.ordineEsercizio || a.numero - b.numero,
        );
        const esercizi = await db.esercizi
          .where("allenamentoId")
          .equals(s.allenamentoId)
          .sortBy("ordine");

        const base = daEsercizi(esercizi).map((r) => {
          const proprie = salvate.filter(
            (x) => x.esercizioId === r.esercizioId,
          );
          return proprie.length
            ? {
                ...r,
                serie: proprie.map(({ ripetizioni, kg }) => ({
                  ripetizioni,
                  kg,
                })),
              }
            : r;
        });
        // esercizi registrati ma non più presenti nella scheda (modificata o eliminata)
        const mancanti = new Map<number, RigaEsercizio>();
        for (const x of salvate) {
          if (base.some((r) => r.esercizioId === x.esercizioId)) continue;
          const r = mancanti.get(x.esercizioId) ?? {
            esercizioId: x.esercizioId,
            nome: x.nomeEsercizio,
            serie: [],
          };
          r.serie.push({ ripetizioni: x.ripetizioni, kg: x.kg });
          mancanti.set(x.esercizioId, r);
        }
        setData(s.data);
        setSchedaId(s.schedaId);
        setAllenamentoId(s.allenamentoId);
        setNote(s.note ?? "");
        setNomiStorici({
          scheda: s.nomeScheda,
          allenamento: s.nomeAllenamento,
        });
        setRighe([...base, ...mancanti.values()]);
      } else {
        // nuova sessione: scheda dal link oppure quella attiva
        let sid = schedaId;
        if (!sid)
          sid =
            (await db.schede.filter((s) => s.attiva).first())?.id ??
            (await db.schede.toCollection().first())?.id ??
            0;
        setSchedaId(sid);
        if (allenamentoId) await caricaEsercizi(allenamentoId);
      }
      setPronto(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessioneId]);

  // ---- Salvataggio automatico della bozza a ogni modifica ----
  useEffect(() => {
    if (!pronto || !sporco) return;
    const bozza: Bozza = {
      data,
      schedaId,
      allenamentoId,
      note,
      righe,
      nomiStorici,
      salvataIl: Date.now(),
    };
    salvaBozza(kBozza, bozza);
  }, [pronto, sporco, kBozza, data, schedaId, allenamentoId, note, righe, nomiStorici]);

  async function caricaEsercizi(aid: number) {
    const esercizi = aid
      ? await db.esercizi.where("allenamentoId").equals(aid).sortBy("ordine")
      : [];
    setRighe(daEsercizi(esercizi));
  }

  const modificata = righe.some((r) =>
    r.serie.some((s) => s.ripetizioni || s.kg),
  );
  const cambiaAllenamento = async (aid: number) => {
    if (
      modificata &&
      !confirm("Cambiando allenamento perderai i dati inseriti. Continuare?")
    )
      return;
    setSporco(true);
    setAllenamentoId(aid);
    await caricaEsercizi(aid);
  };
  const cambiaScheda = async (sid: number) => {
    if (
      modificata &&
      !confirm("Cambiando scheda perderai i dati inseriti. Continuare?")
    )
      return;
    setSporco(true);
    setSchedaId(sid);
    setAllenamentoId(0);
    setRighe([]);
  };

  const aggiornaRiga = (i: number, f: (r: RigaEsercizio) => RigaEsercizio) => {
    setSporco(true);
    setRighe((rr) => rr.map((r, j) => (j === i ? f(r) : r)));
  };

  /** Butta la bozza e ricarica il form da zero */
  const scartaBozza = () => {
    if (!confirm("Scartare i dati non salvati?")) return;
    eliminaBozza(kBozza);
    nav(sessioneId ? `/sessione/${sessioneId}` : `/sessione/nuova?data=${data}`, {
      replace: true,
    });
  };

  const salva = async () => {
    if (!allenamentoId) return alert("Seleziona l'allenamento svolto.");
    const serie: SerieInput[] = [];
    righe.forEach((r, ordine) => {
      r.serie
        .filter((s) => s.ripetizioni > 0 || s.kg > 0)
        .forEach((s, n) =>
          serie.push({
            esercizioId: r.esercizioId,
            nomeEsercizio: r.nome,
            ordineEsercizio: ordine,
            numero: n + 1,
            ...s,
          }),
        );
    });
    if (!serie.length)
      return alert("Inserisci almeno una serie con ripetizioni o peso.");
    await salvaSessione(
      {
        id: sessioneId,
        data,
        schedaId,
        allenamentoId,
        note: note.trim() || undefined,
      },
      serie,
    );
    eliminaBozza(kBozza);
    nav(`/calendario?giorno=${data}`, { replace: true });
  };

  const elimina = async () => {
    if (!sessioneId || !confirm("Eliminare questo allenamento dal calendario?"))
      return;
    await eliminaSessione(sessioneId);
    eliminaBozza(kBozza);
    nav(`/calendario?giorno=${data}`, { replace: true });
  };

  if (!pronto) return null;
  const schedaEsiste = !!schede?.some((s) => s.id === schedaId);
  const allenamentoEsiste = !!allenamenti?.some((a) => a.id === allenamentoId);

  return (
    <>
      <Header
        titolo={sessioneId ? "Modifica allenamento" : "Nuovo allenamento"}
        indietro
        azioni={
          sessioneId && (
            <button
              className="btn-icona"
              style={{ color: "var(--ko)" }}
              aria-label="Elimina"
              onClick={elimina}
            >
              <IconaCestino />
            </button>
          )
        }
      />
      <Pagina>
        {bozzaRipristinata && (
          <div className="card riga" style={{ borderColor: "var(--accento)" }}>
            <span className="spazio piccolo">
              Ho ripristinato i dati non salvati del{" "}
              {formatta(isoGiorno(new Date(bozzaRipristinata)), "d MMM")}{" "}
              {new Date(bozzaRipristinata).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </span>
            <button className="btn-icona" onClick={scartaBozza}>
              Scarta
            </button>
          </div>
        )}
        <div className="card colonna" style={{ gap: 12 }}>
          <label className="campo">
            Data
            <input
              type="date"
              value={data}
              max="2100-12-31"
              onChange={(e) => {
                if (!e.target.value) return;
                setSporco(true);
                setData(e.target.value);
              }}
            />
          </label>
          {sessioneId && !schedaEsiste ? (
            // scheda eliminata: si mostrano i nomi salvati nello storico
            <div className="muted">
              {nomiStorici.scheda} · {nomiStorici.allenamento} (scheda
              eliminata)
            </div>
          ) : (
            <>
              <label className="campo">
                Scheda
                <select
                  value={schedaId}
                  onChange={(e) => cambiaScheda(Number(e.target.value))}
                >
                  {!schedaId && <option value={0}>Seleziona…</option>}
                  {schede?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                      {s.attiva ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                Allenamento
                <select
                  value={allenamentoId}
                  onChange={(e) => cambiaAllenamento(Number(e.target.value))}
                >
                  <option value={0}>Seleziona…</option>
                  {allenamentoId > 0 && !allenamentoEsiste && allenamenti && (
                    <option value={allenamentoId}>
                      {nomiStorici.allenamento || "Allenamento"} (eliminato)
                    </option>
                  )}
                  {allenamenti?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        {schede?.length === 0 && (
          <div className="vuoto">
            Crea prima una scheda nella sezione Schede.
          </div>
        )}
        {allenamentoId > 0 && righe.length === 0 && (
          <div className="vuoto">Questo allenamento non ha esercizi.</div>
        )}

        {righe.map((r, i) => (
          <BloccoEsercizio
            key={`${r.esercizioId}-${i}`}
            riga={r}
            data={data}
            sessioneId={sessioneId}
            onChange={(f) => aggiornaRiga(i, f)}
          />
        ))}

        {righe.length > 0 && (
          <>
            <label className="campo">
              Note
              <textarea
                value={note}
                onChange={(e) => {
                  setSporco(true);
                  setNote(e.target.value);
                }}
                placeholder="Sensazioni, dolori, energia…"
              />
            </label>
            <button className="btn btn-primario btn-blocco" onClick={salva}>
              Salva allenamento
            </button>
          </>
        )}
      </Pagina>
    </>
  );
}

/** Un esercizio con le sue serie (ripetizioni + kg) */
function BloccoEsercizio({
  riga,
  data,
  sessioneId,
  onChange,
}: {
  riga: RigaEsercizio;
  data: string;
  sessioneId?: number;
  onChange: (f: (r: RigaEsercizio) => RigaEsercizio) => void;
}) {
  const [info, setInfo] = useState(false);
  // prestazione precedente, mostrata come riferimento
  const ultima = useLiveQuery(
    () => ultimePrestazioni(riga.nome, data, sessioneId),
    [riga.nome, data, sessioneId],
  );
  const ultimaValida = ultima && ultima.data <= data ? ultima : null;

  const setSerie = (j: number, campo: keyof RigaSerie, v: number) =>
    onChange((r) => ({
      ...r,
      serie: r.serie.map((s, k) => (k === j ? { ...s, [campo]: v } : s)),
    }));

  const aggiungiSerie = () =>
    onChange((r) => {
      const ult = r.serie[r.serie.length - 1];
      // la nuova serie parte dallo stesso peso della precedente
      return {
        ...r,
        serie: [...r.serie, { ripetizioni: 0, kg: ult?.kg ?? 0 }],
      };
    });

  const copiaUltima = () =>
    ultimaValida &&
    onChange((r) => ({
      ...r,
      serie: ultimaValida.serie.map(({ ripetizioni, kg }) => ({
        ripetizioni,
        kg,
      })),
    }));

  return (
    <section className="card colonna" style={{ gap: 10 }}>
      <div className="riga">
        <div
          className="spazio"
          onClick={() => riga.descrizione && setInfo((x) => !x)}
        >
          <div style={{ fontWeight: 600, fontSize: 17 }}>{riga.nome}</div>
          {riga.target && (
            <div className="muted">
              Obiettivo {riga.target}
              {riga.descrizione ? (info ? " · nascondi" : " · dettagli") : ""}
            </div>
          )}
        </div>
      </div>
      {info && riga.descrizione && (
        <div className="descrizione" style={{ marginTop: 0 }}>
          {riga.descrizione}
        </div>
      )}

      {ultimaValida && (
        <div className="riga muted piccolo" style={{ flexWrap: "wrap" }}>
          <span className="spazio">
            Ultima volta ({formatta(ultimaValida.data, "d MMM")}):{" "}
            {ultimaValida.serie
              .map((s) => `${s.ripetizioni}×${s.kg}kg`)
              .join(", ")}
          </span>
          <button
            className="btn-icona piccolo"
            style={{ minHeight: 28, padding: "2px 6px" }}
            onClick={copiaUltima}
          >
            Copia
          </button>
        </div>
      )}

      <div className="tabella-serie">
        <span className="intest">#</span>
        <span className="intest">Ripetizioni</span>
        <span className="intest">Kg</span>
        <span />
        {riga.serie.map((s, j) => {
          const rif = ultimaValida?.serie[j];
          return (
            <Fragment key={j}>
              <span className="num-serie">{j + 1}</span>
              <Stepper
                etichetta={`ripetizioni serie ${j + 1}`}
                valore={s.ripetizioni}
                segnaposto={rif ? String(rif.ripetizioni) : undefined}
                onChange={(v) => setSerie(j, "ripetizioni", Math.round(v))}
              />
              <Stepper
                etichetta={`kg serie ${j + 1}`}
                valore={s.kg}
                passo={2.5}
                decimali
                segnaposto={rif ? String(rif.kg) : undefined}
                onChange={(v) => setSerie(j, "kg", v)}
              />
              <button
                className="btn-icona grigio"
                aria-label={`Rimuovi serie ${j + 1}`}
                onClick={() =>
                  onChange((r) => ({
                    ...r,
                    serie: r.serie.filter((_, k) => k !== j),
                  }))
                }
              >
                ×
              </button>
            </Fragment>
          );
        })}
      </div>
      <button className="btn" onClick={aggiungiSerie}>
        <IconaPiu /> Serie
      </button>
    </section>
  );
}
