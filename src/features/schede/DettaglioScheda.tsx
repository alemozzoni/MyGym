import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Allenamento, type Esercizio } from "../../db/db";
import * as repo from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import {
  IconaCestino,
  IconaCopia,
  IconaGiu,
  IconaMatita,
  IconaPiu,
  IconaStella,
  IconaSu,
} from "../../components/Icone";
import { FormAllenamento, FormEsercizio, FormScheda } from "./Form";

// quale modale è aperta
type Dialogo =
  | { tipo: "scheda" }
  | { tipo: "allenamento"; allenamento?: Allenamento }
  | { tipo: "esercizio"; allenamentoId: number; esercizio?: Esercizio }
  | null;

export default function DettaglioScheda() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const [modifica, setModifica] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aperti, setAperti] = useState<Set<number>>(new Set()); // descrizioni espanse

  const dati = useLiveQuery(async () => {
    const scheda = await db.schede.get(id);
    if (!scheda) return { scheda: null };
    const allenamenti = await db.allenamenti
      .where("schedaId")
      .equals(id)
      .sortBy("ordine");
    const esercizi = await db.esercizi
      .where("allenamentoId")
      .anyOf(allenamenti.map((a) => a.id))
      .sortBy("ordine");
    const nomi = [
      ...new Set((await db.esercizi.toArray()).map((e) => e.nome)),
    ].sort();
    return { scheda, allenamenti, esercizi, nomi };
  }, [id]);

  if (!dati) return null;
  if (!dati.scheda) {
    return (
      <>
        <Header titolo="Scheda" indietro="/schede" />
        <Pagina>
          <div className="vuoto">Scheda non trovata.</div>
        </Pagina>
      </>
    );
  }
  const { scheda, allenamenti = [], esercizi = [], nomi = [] } = dati;

  const elimina = async () => {
    if (
      !confirm(
        `Eliminare la scheda "${scheda.nome}"?\n\nGli allenamenti già registrati nel calendario resteranno nello storico.`,
      )
    )
      return;
    await repo.eliminaScheda(id);
    nav("/schede", { replace: true });
  };

  const duplica = async () => {
    const nuovo = await repo.duplicaScheda(id);
    nav(`/schede/${nuovo}`);
  };

  const toggleDescrizione = (eid: number) =>
    setAperti((s) => {
      const n = new Set(s);
      if (n.has(eid)) n.delete(eid);
      else n.add(eid);
      return n;
    });

  return (
    <>
      <Header
        titolo={scheda.nome}
        indietro="/schede"
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
        {scheda.note && (
          <div className="card descrizione" style={{ marginTop: 0 }}>
            {scheda.note}
          </div>
        )}

        {modifica && (
          <div className="riga" style={{ flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={() => setDialogo({ tipo: "scheda" })}
            >
              <IconaMatita /> Rinomina
            </button>
            <button className="btn" onClick={duplica}>
              <IconaCopia /> Duplica
            </button>
            <button className="btn btn-pericolo" onClick={elimina}>
              <IconaCestino /> Elimina
            </button>
          </div>
        )}

        {!scheda.attiva && (
          <button className="btn" onClick={() => repo.impostaSchedaAttiva(id)}>
            <IconaStella /> Imposta come scheda attiva
          </button>
        )}

        {allenamenti.length === 0 && (
          <div className="vuoto">
            <p>
              Aggiungi gli allenamenti della scheda (es. Giorno A, Giorno B…).
            </p>
            <button
              className="btn btn-primario"
              onClick={() => setDialogo({ tipo: "allenamento" })}
            >
              <IconaPiu /> Aggiungi allenamento
            </button>
          </div>
        )}

        {allenamenti.map((a, ia) => {
          const lista = esercizi.filter((e) => e.allenamentoId === a.id);
          return (
            <section key={a.id} className="card">
              <div className="riga">
                <h3 className="spazio" style={{ fontSize: 18 }}>
                  {a.nome}
                </h3>
                {modifica && (
                  <>
                    <button
                      className="btn-icona grigio"
                      aria-label="Sposta su"
                      disabled={ia === 0}
                      onClick={() => repo.spostaAllenamento(a.id, -1)}
                    >
                      <IconaSu />
                    </button>
                    <button
                      className="btn-icona grigio"
                      aria-label="Sposta giù"
                      disabled={ia === allenamenti.length - 1}
                      onClick={() => repo.spostaAllenamento(a.id, 1)}
                    >
                      <IconaGiu />
                    </button>
                    <button
                      className="btn-icona"
                      aria-label="Rinomina"
                      onClick={() =>
                        setDialogo({ tipo: "allenamento", allenamento: a })
                      }
                    >
                      <IconaMatita />
                    </button>
                    <button
                      className="btn-icona"
                      style={{ color: "var(--ko)" }}
                      aria-label="Elimina allenamento"
                      onClick={() =>
                        confirm(`Eliminare "${a.nome}" e i suoi esercizi?`) &&
                        repo.eliminaAllenamento(a.id)
                      }
                    >
                      <IconaCestino />
                    </button>
                  </>
                )}
              </div>

              {lista.length === 0 && !modifica && (
                <p className="muted">
                  Nessun esercizio. Tocca "Modifica" per aggiungerne.
                </p>
              )}

              {lista.map((e, ie) => (
                <div key={e.id} className="esercizio">
                  <div className="riga">
                    <div
                      className="spazio"
                      onClick={() => e.descrizione && toggleDescrizione(e.id)}
                      style={{ cursor: e.descrizione ? "pointer" : "default" }}
                    >
                      <div style={{ fontWeight: 600 }}>{e.nome}</div>
                      <div className="muted">
                        {e.serieTarget} × {e.ripTarget}
                        {e.recuperoSec
                          ? ` · rec. ${formattaRecupero(e.recuperoSec)}`
                          : ""}
                        {e.descrizione &&
                          !modifica &&
                          (aperti.has(e.id) ? " · nascondi" : " · dettagli")}
                      </div>
                    </div>
                    {modifica && (
                      <>
                        <button
                          className="btn-icona grigio"
                          aria-label="Sposta su"
                          disabled={ie === 0}
                          onClick={() => repo.spostaEsercizio(e.id, -1)}
                        >
                          <IconaSu />
                        </button>
                        <button
                          className="btn-icona grigio"
                          aria-label="Sposta giù"
                          disabled={ie === lista.length - 1}
                          onClick={() => repo.spostaEsercizio(e.id, 1)}
                        >
                          <IconaGiu />
                        </button>
                        <button
                          className="btn-icona"
                          aria-label="Modifica esercizio"
                          onClick={() =>
                            setDialogo({
                              tipo: "esercizio",
                              allenamentoId: a.id,
                              esercizio: e,
                            })
                          }
                        >
                          <IconaMatita />
                        </button>
                        <button
                          className="btn-icona"
                          style={{ color: "var(--ko)" }}
                          aria-label="Elimina esercizio"
                          onClick={() =>
                            confirm(`Eliminare "${e.nome}"?`) &&
                            repo.eliminaEsercizio(e.id)
                          }
                        >
                          <IconaCestino />
                        </button>
                      </>
                    )}
                  </div>
                  {e.descrizione && (aperti.has(e.id) || modifica) && (
                    <div className="descrizione">{e.descrizione}</div>
                  )}
                </div>
              ))}

              {modifica && (
                <button
                  className="btn btn-blocco"
                  style={{ marginTop: 8 }}
                  onClick={() =>
                    setDialogo({ tipo: "esercizio", allenamentoId: a.id })
                  }
                >
                  <IconaPiu /> Aggiungi esercizio
                </button>
              )}
              {!modifica && lista.length > 0 && (
                <Link
                  className="btn btn-primario btn-blocco"
                  style={{ marginTop: 8 }}
                  to={`/sessione/nuova?scheda=${id}&allenamento=${a.id}`}
                >
                  Registra questo allenamento oggi
                </Link>
              )}
            </section>
          );
        })}

        {modifica && allenamenti.length > 0 && (
          <button
            className="btn btn-blocco"
            onClick={() => setDialogo({ tipo: "allenamento" })}
          >
            <IconaPiu /> Aggiungi allenamento
          </button>
        )}
      </Pagina>

      {dialogo?.tipo === "scheda" && (
        <FormScheda
          iniziale={scheda}
          onChiudi={() => setDialogo(null)}
          onSalva={async (nome, note) => {
            await repo.aggiornaScheda(id, { nome, note });
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === "allenamento" && (
        <FormAllenamento
          iniziale={dialogo.allenamento?.nome}
          onChiudi={() => setDialogo(null)}
          onSalva={async (nome) => {
            if (dialogo.allenamento)
              await repo.rinominaAllenamento(dialogo.allenamento.id, nome);
            else await repo.creaAllenamento(id, nome);
            setModifica(true);
            setDialogo(null);
          }}
        />
      )}
      {dialogo?.tipo === "esercizio" && (
        <FormEsercizio
          iniziale={dialogo.esercizio}
          suggerimenti={nomi}
          onChiudi={() => setDialogo(null)}
          onSalva={async (d) => {
            if (dialogo.esercizio)
              await repo.aggiornaEsercizio(dialogo.esercizio.id, d);
            else await repo.creaEsercizio(dialogo.allenamentoId, d);
            await repo.aggiornaScheda(id, {});
            setDialogo(null);
          }}
        />
      )}
    </>
  );
}

const formattaRecupero = (sec: number) =>
  sec >= 60
    ? `${Math.floor(sec / 60)}'${sec % 60 ? String(sec % 60).padStart(2, "0") + '"' : ""}`
    : `${sec}"`;
