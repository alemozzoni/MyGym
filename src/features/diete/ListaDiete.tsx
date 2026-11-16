import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { aggiungiDieta } from '../../db/repo';
import { Header, Pagina } from '../../components/Layout';
import { IconaAvanti, IconaCestino, IconaDieta, IconaMatita, IconaPiu } from '../../components/Icone';
import { dimensioneFile, formatta, isoGiorno } from '../../lib/date';

export default function ListaDiete() {
  const input = useRef<HTMLInputElement>(null);
  const [caricamento, setCaricamento] = useState(false);
  // non carichiamo i byte dei PDF per l'elenco: solo i metadati
  const diete = useLiveQuery(async () => {
    const tutte: { id: number; titolo: string; dimensione: number; caricataIl: number }[] = [];
    await db.diete.orderBy('caricataIl').reverse().each(({ id, titolo, dimensione, caricataIl }) =>
      tutte.push({ id, titolo, dimensione, caricataIl }));
    return tutte;
  });

  const carica = async (files: FileList | null) => {
    if (!files?.length) return;
    setCaricamento(true);
    try {
      for (const f of Array.from(files)) {
        if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
          alert(`"${f.name}" non è un PDF.`);
          continue;
        }
        await aggiungiDieta(f);
      }
    } catch (e) {
      alert(`Errore durante il caricamento: ${(e as Error).message}`);
    } finally {
      setCaricamento(false);
      if (input.current) input.current.value = '';
    }
  };

  const rinomina = async (id: number, attuale: string) => {
    const nuovo = prompt('Nuovo titolo', attuale)?.trim();
    if (nuovo) await db.diete.update(id, { titolo: nuovo });
  };

  return (
    <>
      <Header
        titolo="Diete"
        azioni={<button className="btn-icona" aria-label="Carica PDF" onClick={() => input.current?.click()}><IconaPiu /></button>}
      />
      <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => carica(e.target.files)} />
      <Pagina>
        {caricamento && <p className="muted">Caricamento…</p>}
        {diete?.length === 0 && (
          <div className="vuoto">
            <p>Carica i PDF delle tue diete per averli sempre a portata di mano, anche offline.</p>
            <button className="btn btn-primario" onClick={() => input.current?.click()}>Carica PDF</button>
          </div>
        )}
        {diete?.map((d) => (
          <div key={d.id} className="card riga">
            <Link to={`/diete/${d.id}`} className="riga spazio" style={{ color: 'inherit', textDecoration: 'none' }}>
              <span style={{ color: 'var(--accento)' }}><IconaDieta /></span>
              <div className="spazio">
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{d.titolo}</div>
                <div className="muted piccolo">{formatta(isoGiorno(new Date(d.caricataIl)))} · {dimensioneFile(d.dimensione)}</div>
              </div>
            </Link>
            <button className="btn-icona grigio" aria-label="Rinomina" onClick={() => rinomina(d.id, d.titolo)}><IconaMatita /></button>
            <button className="btn-icona" style={{ color: 'var(--ko)' }} aria-label="Elimina"
              onClick={() => confirm(`Eliminare "${d.titolo}"?`) && db.diete.delete(d.id)}><IconaCestino /></button>
            <Link to={`/diete/${d.id}`} className="muted" aria-hidden="true"><IconaAvanti /></Link>
          </div>
        ))}
      </Pagina>
    </>
  );
}
