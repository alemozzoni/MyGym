import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDati } from "../../db/dati";
import type { Alimento, GiornoDieta } from "../../db/tipi";
import * as repo from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import {
  IconaAvanti,
  IconaCestino,
  IconaCopia,
  IconaGiu,
  IconaIndietro,
  IconaMatita,
  IconaPiu,
  IconaStella,
  IconaSu,
} from "../../components/Icone";
import {
  formattaMacro,
  haMacro,
  totaliGiorno,
  totaliPasto,
} from "../../lib/dieta";
import { sposta } from "../../lib/modello";
import { FormAlimento, FormDieta, FormGiorno, FormPasto } from "./Form";

/** "80 g", "1 pz", "q.b." */
export const quantitaAlimento = (a: Alimento) =>
  [a.quantita, a.unita].filter(Boolean).join(" ");

// quale modale è aperta (indici riferiti al giorno selezionato)
type Dialogo =
  | { tipo: "dieta" }
  | { tipo: "giorno"; nuovo: boolean }
  | { tipo: "pasto"; indice?: number }
  | { tipo: "alimento"; pasto: number; indice?: number }
  | null;

export default function DettaglioDieta() {
  const id = useParams().id ?? "";
  const nav = useNavigate();
  const [modifica, setModifica] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [giornoSel, setGiornoSel] = useState(0);

  const diete = useDati()!.diete;
  const dieta = diete.find((d) => d.id === id);
  // tutti gli alimenti già inseriti: suggerimenti per nome, quantità e macro
  const precedenti = diete.flatMap((d) =>
    d.giorni.flatMap((g) => g.pasti.flatMap((p) => p.alimenti)),
  );

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

  const gi = Math.min(giornoSel, dieta.giorni.length - 1);
  const giorno = dieta.giorni[gi];

  /** Applica una modifica a una copia dei giorni e la salva */
  const salvaGiorni = (f: (giorni: GiornoDieta[]) => GiornoDieta[]) =>
    repo.aggiornaDieta(id, { giorni: f(structuredClone(dieta.giorni)) });
  /** Modifica solo il giorno selezionato */
  const salvaGiorno = (f: (g: GiornoDieta) => void) =>
    salvaGiorni((giorni) => {
      f(giorni[gi]);
      return giorni;
    });

  const elimina = () => {
    if (!confirm(`Eliminare la dieta "${dieta.titolo}"?`)) return;
    repo.eliminaDieta(dieta, diete);
    nav("/diete", { replace: true });
  };

  const duplica = () => nav(`/diete/${repo.duplicaDieta(dieta)}`);

  const duplicaGiorno = async () => {
    salvaGiorni((giorni) => {
      const copia = structuredClone(giorni[gi]);
      copia.nome = `${copia.nome} (copia)`;
      giorni.splice(gi + 1, 0, copia);
      return giorni;
    });
    setGiornoSel(gi + 1);
  };

  const eliminaGiorno = async () => {
    if (!confirm(`Eliminare il giorno "${giorno.nome}" e i suoi pasti?`))
      return;
    salvaGiorni((giorni) => giorni.filter((_, i) => i !== gi));
    setGiornoSel(Math.max(0, gi - 1));
  };

  const spostaGiorno = async (d: -1 | 1) => {
    salvaGiorni((giorni) => sposta(giorni, gi, d));
    setGiornoSel(Math.min(Math.max(0, gi + d), dieta.giorni.length - 1));
  };

  const totGiorno = haMacro(giorno.pasti.flatMap((p) => p.alimenti));

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
            <button
              className="btn"
              onClick={() => setDialogo({ tipo: "dieta" })}
            >
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
          <button className="btn" onClick={() => repo.impostaDietaAttiva(id, diete)}>
            <IconaStella /> Imposta come dieta attiva
          </button>
        )}

        {(dieta.giorni.length > 1 || modifica) && (
          <div className="riga">
            <div className="segmenti spazio" style={{ overflowX: "auto" }}>
              {dieta.giorni.map((g, i) => (
                <button
                  key={i}
                  className={i === gi ? "attivo" : ""}
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => setGiornoSel(i)}
                >
                  {g.nome}
                </button>
              ))}
            </div>
            {modifica && (
              <button
                className="btn-icona"
                aria-label="Nuovo giorno"
                onClick={() => setDialogo({ tipo: "giorno", nuovo: true })}
              >
                <IconaPiu />
              </button>
            )}
          </div>
        )}

        <div className="riga">
          <h3 className="spazio" style={{ fontSize: 17 }}>
            {giorno.nome}
          </h3>
          {modifica && (
            <>
              <button
                className="btn-icona grigio"
                aria-label="Sposta giorno prima"
                disabled={gi === 0}
                style={{ opacity: gi === 0 ? 0.3 : 1 }}
                onClick={() => spostaGiorno(-1)}
              >
                <IconaIndietro />
              </button>
              <button
                className="btn-icona grigio"
                aria-label="Sposta giorno dopo"
                disabled={gi === dieta.giorni.length - 1}
                style={{ opacity: gi === dieta.giorni.length - 1 ? 0.3 : 1 }}
                onClick={() => spostaGiorno(1)}
              >
                <IconaAvanti />
              </button>
              <button
                className="btn-icona grigio"
                aria-label="Rinomina giorno"
                onClick={() => setDialogo({ tipo: "giorno", nuovo: false })}
              >
                <IconaMatita />
              </button>
              <button
                className="btn-icona grigio"
                aria-label="Duplica giorno"
                onClick={duplicaGiorno}
              >
                <IconaCopia />
              </button>
              {dieta.giorni.length > 1 && (
                <button
                  className="btn-icona"
                  style={{ color: "var(--ko)" }}
                  aria-label="Elimina giorno"
                  onClick={eliminaGiorno}
                >
                  <IconaCestino />
                </button>
              )}
            </>
          )}
        </div>
        {totGiorno && (
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
              {modifica && (
                <>
                  <button
                    className="btn-icona grigio"
                    aria-label="Sposta pasto su"
                    disabled={i === 0}
                    style={{ opacity: i === 0 ? 0.3 : 1 }}
                    onClick={() =>
                      salvaGiorno((g) => {
                        g.pasti = sposta(g.pasti, i, -1);
                      })
                    }
                  >
                    <IconaSu />
                  </button>
                  <button
                    className="btn-icona grigio"
                    aria-label="Sposta pasto giù"
                    disabled={i === giorno.pasti.length - 1}
                    style={{ opacity: i === giorno.pasti.length - 1 ? 0.3 : 1 }}
                    onClick={() =>
                      salvaGiorno((g) => {
                        g.pasti = sposta(g.pasti, i, 1);
                      })
                    }
                  >
                    <IconaGiu />
                  </button>
                  <button
                    className="btn-icona grigio"
                    aria-label={`Modifica ${p.nome}`}
                    onClick={() => setDialogo({ tipo: "pasto", indice: i })}
                  >
                    <IconaMatita />
                  </button>
                  <button
                    className="btn-icona"
                    style={{ color: "var(--ko)" }}
                    aria-label={`Elimina ${p.nome}`}
                    onClick={() =>
                      confirm(`Eliminare il pasto "${p.nome}"?`) &&
                      salvaGiorno((g) => {
                        g.pasti.splice(i, 1);
                      })
                    }
                  >
                    <IconaCestino />
                  </button>
                </>
              )}
            </div>

            {p.alimenti.length === 0 && (
              <div className="muted piccolo">
                {modifica
                  ? "Nessun alimento."
                  : "Nessun alimento: tocca Modifica per inserirli."}
              </div>
            )}
            {p.alimenti.map((a, j) => {
              const contenuto = (
                <>
                  <span className="spazio" style={{ overflowWrap: "anywhere" }}>
                    {a.nome}
                    {a.note && <span className="muted"> · {a.note}</span>}
                  </span>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {quantitaAlimento(a)}
                  </span>
                </>
              );
              // in modifica ogni alimento si tocca per cambiarlo
              return modifica ? (
                <button
                  key={j}
                  className="riga riga-alimento"
                  onClick={() =>
                    setDialogo({ tipo: "alimento", pasto: i, indice: j })
                  }
                >
                  {contenuto}
                  <span className="muted">
                    <IconaMatita />
                  </span>
                </button>
              ) : (
                <div
                  key={j}
                  className="riga"
                  style={{ alignItems: "baseline" }}
                >
                  {contenuto}
                </div>
              );
            })}
            {haMacro(p.alimenti) && (
              <div className="muted piccolo">
                {formattaMacro(totaliPasto(p))}
              </div>
            )}
            {p.note && <div className="descrizione">{p.note}</div>}
            {modifica && (
              <button
                className="btn"
                onClick={() => setDialogo({ tipo: "alimento", pasto: i })}
              >
                <IconaPiu /> Alimento
              </button>
            )}
          </section>
        ))}

        {modifica && (
          <button className="btn" onClick={() => setDialogo({ tipo: "pasto" })}>
            <IconaPiu /> Aggiungi pasto
          </button>
        )}
      </Pagina>

      {dialogo?.tipo === "dieta" && (
        <FormDieta
          iniziale={dieta}
          onChiudi={() => setDialogo(null)}
          onSalva={async (titolo, note) => {
            repo.aggiornaDieta(id, { titolo, note });
            setDialogo(null);
          }}
        />
      )}

      {dialogo?.tipo === "giorno" && (
        <FormGiorno
          iniziale={dialogo.nuovo ? undefined : giorno.nome}
          onChiudi={() => setDialogo(null)}
          onSalva={async (nome) => {
            if (dialogo.nuovo) {
              // il nuovo giorno parte con gli stessi nomi dei pasti, senza alimenti
              salvaGiorni((giorni) => [
                ...giorni,
                {
                  nome,
                  pasti: giorno.pasti.map(({ nome, orario }) => ({
                    nome,
                    orario,
                    alimenti: [],
                  })),
                },
              ]);
              setGiornoSel(dieta.giorni.length);
            } else {
              salvaGiorno((g) => {
                g.nome = nome;
              });
            }
            setDialogo(null);
          }}
        />
      )}

      {dialogo?.tipo === "pasto" && (
        <FormPasto
          iniziale={
            dialogo.indice !== undefined
              ? giorno.pasti[dialogo.indice]
              : undefined
          }
          onChiudi={() => setDialogo(null)}
          onSalva={async (dati) => {
            salvaGiorno((g) => {
              if (dialogo.indice === undefined)
                g.pasti.push({ ...dati, alimenti: [] });
              else Object.assign(g.pasti[dialogo.indice], dati);
            });
            setDialogo(null);
          }}
        />
      )}

      {dialogo?.tipo === "alimento" && (
        <FormAlimento
          iniziale={
            dialogo.indice !== undefined
              ? giorno.pasti[dialogo.pasto].alimenti[dialogo.indice]
              : undefined
          }
          precedenti={precedenti}
          onChiudi={() => setDialogo(null)}
          onElimina={
            dialogo.indice === undefined
              ? undefined
              : async () => {
                  salvaGiorno((g) => {
                    g.pasti[dialogo.pasto].alimenti.splice(dialogo.indice!, 1);
                  });
                  setDialogo(null);
                }
          }
          onSalva={async (a) => {
            salvaGiorno((g) => {
              const alimenti = g.pasti[dialogo.pasto].alimenti;
              if (dialogo.indice === undefined) alimenti.push(a);
              else alimenti[dialogo.indice] = a;
            });
            setDialogo(null);
          }}
        />
      )}
    </>
  );
}
