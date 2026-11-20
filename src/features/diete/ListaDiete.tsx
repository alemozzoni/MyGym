import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { creaDieta } from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import { IconaAvanti, IconaPiu } from "../../components/Icone";
import { formatta, isoGiorno } from "../../lib/date";
import { formattaMacro, haMacro, totaliGiorno } from "../../lib/dieta";
import { FormDieta } from "./Form";

export default function ListaDiete() {
  const nav = useNavigate();
  const [nuova, setNuova] = useState(false);

  const diete = useLiveQuery(async () => {
    const tutte = await db.diete.toArray();
    // prima la dieta attiva, poi le più recenti
    return tutte.sort(
      (a, b) =>
        Number(b.attiva) - Number(a.attiva) || b.aggiornataIl - a.aggiornataIl,
    );
  });

  return (
    <>
      <Header
        titolo="Diete"
        azioni={
          <button
            className="btn-icona"
            aria-label="Nuova dieta"
            onClick={() => setNuova(true)}
          >
            <IconaPiu />
          </button>
        }
      />
      <Pagina>
        {diete?.length === 0 && (
          <div className="vuoto">
            <p>
              Inserisci la tua dieta divisa per giorni e pasti, con alimenti,
              quantità e macro.
            </p>
            <button className="btn btn-primario" onClick={() => setNuova(true)}>
              Crea la prima dieta
            </button>
          </div>
        )}
        {diete?.map((d) => {
          const nAlimenti = d.giorni.reduce(
            (n, g) => n + g.pasti.reduce((m, p) => m + p.alimenti.length, 0),
            0,
          );
          const primo = d.giorni[0];
          const conMacro =
            primo && haMacro(primo.pasti.flatMap((p) => p.alimenti));
          return (
            <Link key={d.id} to={`/diete/${d.id}`} className="card card-link">
              <div className="riga">
                <div className="spazio colonna" style={{ gap: 4 }}>
                  <div className="riga">
                    <span className="titolo-card" style={{ overflowWrap: "anywhere" }}>
                      {d.titolo}
                    </span>
                    {d.attiva && <span className="badge">Attiva</span>}
                  </div>
                  <span className="muted">
                    {d.giorni.length} giorn{d.giorni.length === 1 ? "o" : "i"} ·{" "}
                    {nAlimenti} alimenti · modificata il{" "}
                    {formatta(isoGiorno(new Date(d.aggiornataIl)))}
                  </span>
                  {conMacro && (
                    <span className="muted piccolo">
                      {primo.nome}: {formattaMacro(totaliGiorno(primo))}
                    </span>
                  )}
                </div>
                <span className="muted">
                  <IconaAvanti />
                </span>
              </div>
            </Link>
          );
        })}
      </Pagina>
      {nuova && (
        <FormDieta
          onChiudi={() => setNuova(false)}
          onSalva={async (titolo, note) => {
            const id = await creaDieta(titolo, note);
            setNuova(false);
            nav(`/diete/${id}`);
          }}
        />
      )}
    </>
  );
}
