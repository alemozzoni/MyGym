import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { db } from "../../db/db";
import { Header, Pagina } from "../../components/Layout";
import { IconaAvanti, IconaIndietro, IconaPiu } from "../../components/Icone";
import { dataEstesa, isoGiorno, oggi } from "../../lib/date";
import { coloreAllenamento } from "../../lib/colori";

export default function Calendario() {
  const [params, setParams] = useSearchParams();
  // giorno selezionato salvato nell'URL: tornando indietro resta selezionato
  // giorno non valido nell'URL → oggi (evita errori di date-fns)
  const giornoUrl = params.get("giorno");
  const selezionato =
    giornoUrl && /^\d{4}-\d{2}-\d{2}$/.test(giornoUrl) && !isNaN(Date.parse(giornoUrl))
      ? giornoUrl
      : oggi();
  const [mese, setMese] = useState(() => startOfMonth(parseISO(selezionato)));

  const giorni = useMemo(() => {
    const inizio = startOfWeek(startOfMonth(mese), { weekStartsOn: 1 });
    const fine = endOfWeek(endOfMonth(mese), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inizio, end: fine });
  }, [mese]);

  const da = isoGiorno(giorni[0]);
  const a = isoGiorno(giorni[giorni.length - 1]);
  const sessioni = useLiveQuery(
    () => db.sessioni.where("data").between(da, a, true, true).toArray(),
    [da, a],
  );

  const perGiorno = useMemo(() => {
    const m = new Map<string, NonNullable<typeof sessioni>>();
    for (const s of sessioni ?? [])
      m.set(s.data, [...(m.get(s.data) ?? []), s]);
    return m;
  }, [sessioni]);

  const delGiorno = useLiveQuery(async () => {
    const lista = await db.sessioni.where("data").equals(selezionato).toArray();
    return Promise.all(
      lista.map(async (s) => {
        const serie = await db.serie.where("sessioneId").equals(s.id).toArray();
        return {
          ...s,
          nEsercizi: new Set(serie.map((x) => x.nomeEsercizio)).size,
          nSerie: serie.length,
        };
      }),
    );
  }, [selezionato]);

  const scegli = (iso: string) => setParams({ giorno: iso }, { replace: true });
  const sessioniMese = (sessioni ?? []).filter((s) =>
    isSameMonth(parseISO(s.data), mese),
  ).length;

  return (
    <>
      <Header titolo="Calendario" />
      <Pagina>
        <div className="card">
          <div className="riga" style={{ marginBottom: 12 }}>
            <button
              className="btn-icona"
              aria-label="Mese precedente"
              onClick={() => setMese((m) => addMonths(m, -1))}
            >
              <IconaIndietro />
            </button>
            <div className="spazio" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  textTransform: "capitalize",
                }}
              >
                {format(mese, "MMMM yyyy", { locale: it })}
              </div>
              <div className="muted piccolo">
                {sessioniMese} allenament{sessioniMese === 1 ? "o" : "i"}
              </div>
            </div>
            <button
              className="btn-icona"
              aria-label="Mese successivo"
              onClick={() => setMese((m) => addMonths(m, 1))}
            >
              <IconaAvanti />
            </button>
          </div>
          <div className="cal-intestazione">
            {["L", "M", "M", "G", "V", "S", "D"].map((g, i) => (
              <div key={i}>{g}</div>
            ))}
          </div>
          <div className="cal-griglia">
            {giorni.map((g) => {
              const iso = isoGiorno(g);
              const lista = perGiorno.get(iso) ?? [];
              const classi = [
                "cal-giorno",
                !isSameMonth(g, mese) && "fuori",
                iso === oggi() && "oggi",
                iso === selezionato && "selezionato",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={iso}
                  className={classi}
                  onClick={() => scegli(iso)}
                >
                  {g.getDate()}
                  <span className="cal-punti">
                    {lista.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        style={{
                          background:
                            iso === selezionato
                              ? "#fff"
                              : coloreAllenamento(s.nomeAllenamento),
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="riga">
          <h3 className="spazio" style={{ fontSize: 17 }}>
            {dataEstesa(selezionato)}
          </h3>
          {selezionato !== oggi() && (
            <button
              className="btn-icona"
              onClick={() => {
                scegli(oggi());
                setMese(startOfMonth(new Date()));
              }}
            >
              Oggi
            </button>
          )}
        </div>

        {delGiorno?.length === 0 && (
          <p className="muted" style={{ margin: "0 4px" }}>
            Nessun allenamento registrato.
          </p>
        )}
        {delGiorno?.map((s) => (
          <Link key={s.id} to={`/sessione/${s.id}`} className="card card-link">
            <div className="riga">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: coloreAllenamento(s.nomeAllenamento),
                  flexShrink: 0,
                }}
              />
              <div className="spazio">
                <div style={{ fontWeight: 600 }}>
                  {s.nomeAllenamento || "Allenamento"}
                </div>
                <div className="muted">
                  {s.nomeScheda} · {s.nEsercizi} esercizi · {s.nSerie} serie
                </div>
              </div>
              <span className="muted">
                <IconaAvanti />
              </span>
            </div>
          </Link>
        ))}

        <Link
          to={`/sessione/nuova?data=${selezionato}`}
          className="btn btn-primario btn-blocco"
        >
          <IconaPiu /> Aggiungi allenamento
        </Link>
      </Pagina>
    </>
  );
}
