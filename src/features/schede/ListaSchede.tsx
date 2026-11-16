import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { creaScheda } from '../../db/repo';
import { Header, Pagina } from '../../components/Layout';
import { IconaAvanti, IconaImpostazioni, IconaPiu } from '../../components/Icone';
import { FormScheda } from './Form';
import { formatta, isoGiorno } from '../../lib/date';

export default function ListaSchede() {
  const nav = useNavigate();
  const [nuova, setNuova] = useState(false);

  // conteggio allenamenti/esercizi per ogni scheda, aggiornato in tempo reale
  const schede = useLiveQuery(async () => {
    const tutte = await db.schede.toArray();
    tutte.sort((a, b) => Number(b.attiva) - Number(a.attiva) || b.aggiornataIl - a.aggiornataIl);
    return Promise.all(tutte.map(async (s) => {
      const all = await db.allenamenti.where('schedaId').equals(s.id).primaryKeys();
      const nEs = await db.esercizi.where('allenamentoId').anyOf(all).count();
      return { ...s, nAll: all.length, nEs };
    }));
  });

  return (
    <>
      <Header
        titolo="Le mie schede"
        azioni={
          <>
            <Link to="/impostazioni" className="btn-icona grigio" aria-label="Impostazioni"><IconaImpostazioni /></Link>
            <button className="btn-icona" aria-label="Nuova scheda" onClick={() => setNuova(true)}><IconaPiu /></button>
          </>
        }
      />
      <Pagina>
        {schede?.length === 0 && (
          <div className="vuoto">
            <p>Non hai ancora nessuna scheda.</p>
            <button className="btn btn-primario" onClick={() => setNuova(true)}>Crea la prima scheda</button>
          </div>
        )}
        {schede?.map((s) => (
          <Link key={s.id} to={`/schede/${s.id}`} className="card card-link">
            <div className="riga">
              <div className="spazio colonna" style={{ gap: 4 }}>
                <div className="riga">
                  <span className="titolo-card">{s.nome}</span>
                  {s.attiva && <span className="badge">Attiva</span>}
                </div>
                <span className="muted">
                  {s.nAll} allenament{s.nAll === 1 ? 'o' : 'i'} · {s.nEs} esercizi · modificata il{' '}
                  {formatta(isoGiorno(new Date(s.aggiornataIl)))}
                </span>
              </div>
              <span className="muted"><IconaAvanti /></span>
            </div>
          </Link>
        ))}
      </Pagina>
      {nuova && (
        <FormScheda
          onChiudi={() => setNuova(false)}
          onSalva={async (nome, note) => {
            const id = await creaScheda(nome, note);
            setNuova(false);
            nav(`/schede/${id}`);
          }}
        />
      )}
    </>
  );
}
