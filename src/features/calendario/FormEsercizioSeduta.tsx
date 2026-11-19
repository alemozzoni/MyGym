import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Modale } from "../../components/Modale";
import { db, type Esercizio } from "../../db/db";

/**
 * Scelta di un esercizio durante la registrazione dell'allenamento:
 * nome libero (con i suggerimenti dei nomi già usati) oppure un esercizio della scheda.
 */
export function FormEsercizioSeduta({
  titolo,
  iniziale,
  dallaScheda,
  onNome,
  onEsercizio,
  onChiudi,
}: {
  titolo: string;
  iniziale?: string;
  /** esercizi della scheda proposti come scelta rapida */
  dallaScheda: Esercizio[];
  onNome: (nome: string) => void;
  onEsercizio: (e: Esercizio) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale ?? "");

  // tutti i nomi già usati: stesso nome = stesso grafico nei Progressi
  const suggerimenti = useLiveQuery(async () => {
    const svolti = (await db.serie
      .orderBy("nomeEsercizio")
      .uniqueKeys()) as string[];
    const inScheda = (await db.esercizi.toArray()).map((e) => e.nome);
    return [...new Set([...svolti, ...inScheda])].sort((a, b) =>
      a.localeCompare(b, "it"),
    );
  });

  const invia = (e: FormEvent) => {
    e.preventDefault();
    const pulito = nome.trim().replace(/\s+/g, " ");
    if (pulito) onNome(pulito);
  };

  return (
    <Modale titolo={titolo} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">
          Nome esercizio
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Croci ai cavi"
            list="nomi-esercizi-seduta"
          />
          <datalist id="nomi-esercizi-seduta">
            {suggerimenti?.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="griglia-2">
          <button type="button" className="btn" onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="submit"
            className="btn btn-primario"
            disabled={!nome.trim()}
          >
            Conferma
          </button>
        </div>
      </form>

      {dallaScheda.length > 0 && (
        <>
          <div className="sezione-titolo" style={{ margin: "4px 0 0" }}>
            Dalla scheda
          </div>
          <div className="colonna">
            {dallaScheda.map((e) => (
              <button
                key={e.id}
                className="btn"
                style={{ justifyContent: "space-between" }}
                onClick={() => onEsercizio(e)}
              >
                <span>{e.nome}</span>
                <span className="muted piccolo">
                  {e.serieTarget} × {e.ripTarget}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modale>
  );
}
