import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useDati } from "../../db/dati";
import type { Sessione } from "../../db/tipi";
import { perData } from "../../lib/modello";
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
  const tutte = useDati()!.sessioni;
  const sessioni = useMemo(
    () => tutte.filter((s) => s.data >= da && s.data <= a).sort(perData),
    [tutte, da, a],
  );

  const perGiorno = useMemo(() => {
    const m = new Map<string, Sessione[]>();
    for (const s of sessioni) m.set(s.data, [...(m.get(s.data) ?? []), s]);
    return m;
  }, [sessioni]);

  const delGiorno = tutte
    .filter((s) => s.data === selezionato)
    .sort(perData)
    .map((s) => ({
      ...s,
      nEsercizi: new Set(s.serie.map((x) => x.nomeEsercizio)).size,
      nSerie: s.serie.length,
    }));

  const scegli = (iso: string) => setParams({ giorno: iso }, { replace: true });
  const sessioniMese = sessioni.filter((s) =>
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

        {delGiorno.length === 0 && (
          <p className="muted" style={{ margin: "0 4px" }}>
            Nessun allenamento registrato.
          </p>
        )}
        {delGiorno.map((s) => (
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
