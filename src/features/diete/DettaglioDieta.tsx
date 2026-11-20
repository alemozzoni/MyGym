import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Alimento } from "../../db/db";
import * as repo from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import {
  IconaCestino,
  IconaCopia,
  IconaMatita,
  IconaStella,
} from "../../components/Icone";
import {
  formattaMacro,
  haMacro,
  totaliGiorno,
  totaliPasto,
} from "../../lib/dieta";
import { FormDieta } from "./Form";

/** "80 g", "1 pz", "q.b." */
export const quantitaAlimento = (a: Alimento) =>
  [a.quantita, a.unita].filter(Boolean).join(" ");

export default function DettaglioDieta() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const [modifica, setModifica] = useState(false);
  const [rinomina, setRinomina] = useState(false);
  const [giornoSel, setGiornoSel] = useState(0);

  const dieta = useLiveQuery(
    async () => (await db.diete.get(id)) ?? null,
    [id],
  );

  if (dieta === undefined) return null;
  if (!dieta) {
    return (
      <>
        <Header titolo="Dieta" indietro="/diete" />
        <Pagina>
          <div className="vuoto">Dieta non trovata.</div>
        </Pagina>
      </>
    );
  }

  const giorno = dieta.giorni[Math.min(giornoSel, dieta.giorni.length - 1)];

  const elimina = async () => {
    if (!confirm(`Eliminare la dieta "${dieta.titolo}"?`)) return;
    await repo.eliminaDieta(id);
    nav("/diete", { replace: true });
  };

  const duplica = async () => nav(`/diete/${await repo.duplicaDieta(id)}`);

  return (
    <>
      <Header
        titolo={dieta.titolo}
        indietro="/diete"
        azioni={
          <button
            className="btn-icona"
            onClick={() => setModifica((m) => !m)}
            style={{ fontWeight: 600, fontSize: 16 }}
          >
            {modifica ? "Fine" : "Modifica"}
          </button>
        }
      />
      <Pagina>
        {dieta.note && (
          <div className="card descrizione" style={{ marginTop: 0 }}>
            {dieta.note}
          </div>
        )}

        {modifica && (
          <div className="riga" style={{ flexWrap: "wrap" }}>
            <button className="btn" onClick={() => setRinomina(true)}>
              <IconaMatita /> Titolo e note
            </button>
            <button className="btn" onClick={duplica}>
              <IconaCopia /> Duplica
            </button>
            <button className="btn btn-pericolo" onClick={elimina}>
              <IconaCestino /> Elimina
            </button>
          </div>
        )}

        {!dieta.attiva && (
          <button className="btn" onClick={() => repo.impostaDietaAttiva(id)}>
            <IconaStella /> Imposta come dieta attiva
          </button>
        )}

        {dieta.giorni.length > 1 && (
          <div className="segmenti" style={{ overflowX: "auto" }}>
            {dieta.giorni.map((g, i) => (
              <button
                key={i}
                className={g === giorno ? "attivo" : ""}
                style={{ whiteSpace: "nowrap" }}
                onClick={() => setGiornoSel(i)}
              >
                {g.nome}
              </button>
            ))}
          </div>
        )}

        {giorno && (
          <>
            <div className="riga">
              <h3 className="spazio" style={{ fontSize: 17 }}>
                {giorno.nome}
              </h3>
            </div>
            {haMacro(giorno.pasti.flatMap((p) => p.alimenti)) && (
              <div className="muted">
                Totale giorno: {formattaMacro(totaliGiorno(giorno))}
              </div>
            )}

            {giorno.pasti.map((p, i) => (
              <section key={i} className="card colonna">
                <div className="riga">
                  <div className="spazio">
                    <div className="titolo-card">{p.nome}</div>
                    {p.orario && <div className="muted">{p.orario}</div>}
                  </div>
                </div>
                {p.alimenti.length === 0 && (
                  <div className="muted piccolo">Nessun alimento.</div>
                )}
                {p.alimenti.map((a, j) => (
                  <div
                    key={j}
                    className="riga"
                    style={{ alignItems: "baseline" }}
                  >
                    <span
                      className="spazio"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {a.nome}
                      {a.note && <span className="muted"> · {a.note}</span>}
                    </span>
                    <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {quantitaAlimento(a)}
                    </span>
                  </div>
                ))}
                {haMacro(p.alimenti) && (
                  <div className="muted piccolo">
                    {formattaMacro(totaliPasto(p))}
                  </div>
                )}
                {p.note && <div className="descrizione">{p.note}</div>}
              </section>
            ))}
          </>
        )}
      </Pagina>

      {rinomina && (
        <FormDieta
          iniziale={dieta}
          onChiudi={() => setRinomina(false)}
          onSalva={async (titolo, note) => {
            await repo.aggiornaDieta(id, { titolo, note });
            setRinomina(false);
          }}
        />
      )}
    </>
  );
}
