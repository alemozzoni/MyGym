import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { db, type Dieta } from '../../db/db';
import { Header } from '../../components/Layout';
import { IconaCondividi } from '../../components/Icone';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Visualizza tutte le pagine del PDF su canvas.
 * Safari iOS in un iframe mostra spesso solo la prima pagina, per questo usiamo pdf.js.
 */
export default function VisualizzatorePdf() {
  const id = Number(useParams().id);
  const [dieta, setDieta] = useState<Dieta | null | undefined>();
  const [errore, setErrore] = useState('');
  const [zoom, setZoom] = useState(1);
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.diete.get(id).then((d) => setDieta(d ?? null));
  }, [id]);

  useEffect(() => {
    if (!dieta || !contenitore.current) return;
    const box = contenitore.current;
    let annullato = false;
    // copia dei byte: pdf.js trasferisce il buffer al worker e lo renderebbe inutilizzabile
    const task = pdfjs.getDocument({ data: new Uint8Array(dieta.dati.slice(0)) });
    (async () => {
      try {
        const pdf = await task.promise;
        box.innerHTML = '';
        const larghezza = box.clientWidth - 16;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        for (let n = 1; n <= pdf.numPages && !annullato; n++) {
          const pagina = await pdf.getPage(n);
          const base = pagina.getViewport({ scale: 1 });
          // risoluzione proporzionale a larghezza schermo × zoom × densità pixel
          const viewport = pagina.getViewport({ scale: (larghezza / base.width) * zoom * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${(viewport.width / dpr)}px`;
          canvas.style.maxWidth = 'none';
          box.appendChild(canvas);
          await pagina.render({ canvas, viewport }).promise;
        }
      } catch (e) {
        if (!annullato) setErrore((e as Error).message);
      }
    })();
    return () => {
      annullato = true;
      task.destroy();
    };
  }, [dieta, zoom]);

  const condividi = async () => {
    if (!dieta) return;
    const file = new File([dieta.dati], `${dieta.titolo}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: dieta.titolo }); } catch { /* annullato */ }
    } else {
      window.open(URL.createObjectURL(file), '_blank');
    }
  };

  return (
    <>
      <Header
        titolo={dieta?.titolo ?? 'Dieta'}
        indietro="/diete"
        azioni={dieta && (
          <>
            <button className="btn-icona" aria-label="Riduci" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}>−</button>
            <button className="btn-icona" aria-label="Ingrandisci" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}>+</button>
            <button className="btn-icona" aria-label="Condividi" onClick={condividi}><IconaCondividi /></button>
          </>
        )}
      />
      {dieta === null && <div className="vuoto">PDF non trovato.</div>}
      {errore && <div className="vuoto">Impossibile aprire il PDF: {errore}</div>}
      <div style={{ overflowX: 'auto' }}>
        <div ref={contenitore} className="pdf-pagine" />
      </div>
    </>
  );
}
