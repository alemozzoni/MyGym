import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../../db/db";
import { Header, Pagina } from "../../components/Layout";
import {
  puntiDaSerie,
  record,
  valutaAndamento,
  type PuntoSessione,
  type Stato,
} from "../../lib/calcoli";
import { formatta, isoGiorno } from "../../lib/date";

// Colore delle serie nei grafici: arancio validato per lo sfondo scuro (banda di luminosità e contrasto)
const COLORE_SERIE = "#d95926";
const GRIGLIA = "#2b303b";
const ASSE = "#9aa3b2";

type Metrica = "e1rm" | "caricoMax" | "volume" | "ripTotali";
const METRICHE: Record<Metrica, { etichetta: string; unita: string }> = {
  e1rm: { etichetta: "1RM stimato", unita: "kg" },
  caricoMax: { etichetta: "Carico max", unita: "kg" },
  volume: { etichetta: "Volume", unita: "kg" },
  ripTotali: { etichetta: "Ripetizioni", unita: "rip" },
};

const STATI: Record<
  Stato,
  { icona: string; titolo: string; colore: string; sfondo: string }
> = {
  progresso: {
    icona: "↑",
    titolo: "In progresso",
    colore: "#34c759",
    sfondo: "rgba(52,199,89,.15)",
  },
  stallo: {
    icona: "→",
    titolo: "In stallo",
    colore: "#ffcc00",
    sfondo: "rgba(255,204,0,.15)",
  },
  calo: {
    icona: "↓",
    titolo: "In calo",
    colore: "#ff453a",
    sfondo: "rgba(255,69,58,.15)",
  },
  "dati-insufficienti": {
    icona: "…",
    titolo: "Servono più dati",
    colore: "#9aa3b2",
    sfondo: "#20242d",
  },
};

export default function Progressi() {
  const [params, setParams] = useSearchParams();
  const [metricaScelta, setMetrica] = useState<Metrica | null>(null);

  // tutte le serie con la data della relativa sessione
  const righe = useLiveQuery(async () => {
    const [serie, sessioni] = await Promise.all([
      db.serie.toArray(),
      db.sessioni.toArray(),
    ]);
    const dataDi = new Map(sessioni.map((s) => [s.id, s.data]));
    return {
      serie: serie
        .filter((s) => dataDi.has(s.sessioneId))
        .map((s) => ({ ...s, data: dataDi.get(s.sessioneId)! })),
      sessioni,
    };
  });

  // elenco esercizi, i più recenti in alto
  const esercizi = useMemo(() => {
    const m = new Map<
      string,
      { nome: string; ultima: string; sessioni: Set<number> }
    >();
    for (const s of righe?.serie ?? []) {
      const e = m.get(s.nomeEsercizio) ?? {
        nome: s.nomeEsercizio,
        ultima: s.data,
        sessioni: new Set(),
      };
      if (s.data > e.ultima) e.ultima = s.data;
      e.sessioni.add(s.sessioneId);
      m.set(s.nomeEsercizio, e);
    }
    return [...m.values()].sort(
      (a, b) =>
        b.ultima.localeCompare(a.ultima) || a.nome.localeCompare(b.nome),
    );
  }, [righe]);

  const nome = params.get("es") ?? esercizi[0]?.nome ?? "";
  const punti = useMemo(
    () =>
      puntiDaSerie(
        (righe?.serie ?? []).filter((s) => s.nomeEsercizio === nome),
      ),
    [righe, nome],
  );
  const andamento = valutaAndamento(punti);
  const pr = record(punti);
  const metrica: Metrica = andamento.corpoLibero
    ? "ripTotali"
    : (metricaScelta ?? "e1rm");

  // sessioni per settimana nelle ultime 8 settimane
  const frequenza = useMemo(() => {
    const inizio = startOfWeek(addWeeks(new Date(), -7), { weekStartsOn: 1 });
    const settimane = Array.from({ length: 8 }, (_, i) => {
      const d = addWeeks(inizio, i);
      return {
        chiave: isoGiorno(d),
        etichetta: format(d, "d MMM", { locale: it }),
        allenamenti: 0,
      };
    });
    for (const s of righe?.sessioni ?? []) {
      const k = isoGiorno(startOfWeek(parseISO(s.data), { weekStartsOn: 1 }));
      const w = settimane.find((x) => x.chiave === k);
      if (w) w.allenamenti++;
    }
    return settimane;
  }, [righe]);

  if (!righe) return null;

  if (!esercizi.length) {
    return (
      <>
        <Header titolo="Progressi" />
        <Pagina>
          <div className="vuoto">
            <p>Ancora nessun dato.</p>
            <p className="piccolo">
              Registra i tuoi allenamenti nel Calendario: qui vedrai i grafici
              di ogni esercizio.
            </p>
          </div>
        </Pagina>
      </>
    );
  }

  const st = STATI[andamento.stato];
  const percento = `${andamento.variazione >= 0 ? "+" : ""}${(andamento.variazione * 100).toFixed(1).replace(".", ",")}%`;
  const dati = punti.map((p) => ({
    ...p,
    etichetta: formatta(p.data, "d MMM"),
  }));

  return (
    <>
      <Header titolo="Progressi" />
      <Pagina>
        <label className="campo">
          Esercizio
          <select
            value={nome}
            onChange={(e) =>
              setParams({ es: e.target.value }, { replace: true })
            }
          >
            {esercizi.map((e) => (
              <option key={e.nome} value={e.nome}>
                {e.nome} ({e.sessioni.size})
              </option>
            ))}
          </select>
        </label>

        {/* Stato: icona + etichetta + testo, mai solo colore */}
        <div className="card stato">
          <div
            className="stato-icona"
            style={{ background: st.sfondo, color: st.colore }}
            aria-hidden="true"
          >
            {st.icona}
          </div>
          <div className="spazio">
            <div style={{ fontWeight: 700, fontSize: 17 }}>{st.titolo}</div>
            <div className="muted">
              {andamento.stato === "dati-insufficienti"
                ? `Servono almeno 4 sessioni (ne hai ${punti.length}).`
                : `${percento} di ${andamento.corpoLibero ? "ripetizioni totali" : "1RM stimato"} nelle ultime sessioni rispetto alle precedenti.`}
            </div>
          </div>
        </div>

        <div className="kpi">
          {andamento.corpoLibero ? (
            <div>
              <div className="valore">{pr.ripTotali?.ripTotali ?? 0}</div>
              <div className="etichetta">Record ripetizioni</div>
            </div>
          ) : (
            <>
              <div>
                <div className="valore">
                  {pr.caricoMax?.caricoMax ?? 0}
                  <small> kg</small>
                </div>
                <div className="etichetta">Carico max</div>
              </div>
              <div>
                <div className="valore">
                  {pr.e1rm?.e1rm ?? 0}
                  <small> kg</small>
                </div>
                <div className="etichetta">1RM stimato</div>
              </div>
            </>
          )}
          <div>
            <div className="valore">{punti.length}</div>
            <div className="etichetta">Sessioni</div>
          </div>
        </div>

        <div className="card colonna" style={{ gap: 12 }}>
          {!andamento.corpoLibero && (
            <div className="segmenti" role="tablist">
              {(Object.keys(METRICHE) as Metrica[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={m === metrica}
                  className={m === metrica ? "attivo" : ""}
                  onClick={() => setMetrica(m)}
                >
                  {METRICHE[m].etichetta}
                </button>
              ))}
            </div>
          )}
          <div className="muted piccolo">
            {METRICHE[metrica].etichetta} ({METRICHE[metrica].unita}) per
            sessione
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart
                data={dati}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke={GRIGLIA} vertical={false} />
                <XAxis
                  dataKey="etichetta"
                  stroke={ASSE}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />
                <YAxis
                  stroke={ASSE}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  width={48}
                />
                <Tooltip
                  itemStyle={{ color: "#f2f4f8" }}
                  cursor={{ stroke: ASSE, strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#171a21",
                    border: "1px solid #2b303b",
                    borderRadius: 10,
                    color: "#f2f4f8",
                  }}
                  labelStyle={{ color: "#9aa3b2" }}
                  formatter={(v) => [
                    `${v} ${METRICHE[metrica].unita}`,
                    METRICHE[metrica].etichetta,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metrica}
                  stroke={COLORE_SERIE}
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: COLORE_SERIE,
                    stroke: "#171a21",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, stroke: "#171a21", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h3 className="sezione-titolo">Storico</h3>
        <div className="card" style={{ padding: 0 }}>
          {[...punti]
            .reverse()
            .slice(0, 15)
            .map((p, i) => {
              const serie = righe.serie.filter(
                (s) => s.nomeEsercizio === nome && s.sessioneId === p.sessioneId,
              );
              return (
                <div
                  key={p.sessioneId ?? i}
                  className="riga"
                  style={{
                    padding: "10px 14px",
                    borderTop: "1px solid var(--bordo)",
                  }}
                >
                  <div style={{ width: 64, fontWeight: 600 }}>
                    {formatta(p.data, "d MMM")}
                  </div>
                  <div className="spazio muted piccolo">
                    {serie
                      .sort((a, b) => a.numero - b.numero)
                      .map((s) =>
                        s.kg ? `${s.ripetizioni}×${s.kg}` : `${s.ripetizioni}`,
                      )
                      .join(" · ")}
                  </div>
                  {!andamento.corpoLibero && (
                    <div className="piccolo" title="1RM stimato">
                      {p.e1rm} kg
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <h3 className="sezione-titolo">Allenamenti a settimana</h3>
        <div className="card">
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <BarChart
                data={frequenza}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid stroke={GRIGLIA} vertical={false} />
                <XAxis
                  dataKey="etichetta"
                  stroke={ASSE}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  stroke={ASSE}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip
                  itemStyle={{ color: "#f2f4f8" }}
                  cursor={{ fill: "rgba(255,255,255,.05)" }}
                  contentStyle={{
                    background: "#171a21",
                    border: "1px solid #2b303b",
                    borderRadius: 10,
                    color: "#f2f4f8",
                  }}
                  labelFormatter={(l) => `Settimana dal ${l}`}
                  formatter={(v) => [v, "Allenamenti"]}
                />
                <Bar
                  dataKey="allenamenti"
                  fill={COLORE_SERIE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Pagina>
    </>
  );
}
