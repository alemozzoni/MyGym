import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
// build "legacy": include i polyfill necessari alle versioni di Safari meno recenti
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { db, type Dieta } from "../../db/db";
import { Header } from "../../components/Layout";
import { IconaCondividi } from "../../components/Icone";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Safari iOS limita i canvas a ~16,7 milioni di pixel: restiamo ampiamente sotto
const MAX_PIXEL_PAGINA = 6_000_000;

/**
 * Visualizza tutte le pagine del PDF.
 * Ogni pagina viene disegnata su un canvas temporaneo e convertita in immagine:
 * i canvas su iPhone consumano molta memoria e oltre una certa soglia restano bianchi.
 */
export default function VisualizzatorePdf() {
  const id = Number(useParams().id);
  const [dieta, setDieta] = useState<Dieta | null | undefined>();
  const [errore, setErrore] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [zoom, setZoom] = useState(1);
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.diete.get(id).then((d) => setDieta(d ?? null));
  }, [id]);

  useEffect(() => {
    if (!dieta || !contenitore.current) return;
    const box = contenitore.current;
    const urls: string[] = [];
    let annullato = false;
    setErrore("");
    setCaricamento(true);
    // copia dei byte: pdf.js trasferisce il buffer al worker e lo renderebbe inutilizzabile
    const task = pdfjs.getDocument({
      data: new Uint8Array(dieta.dati.slice(0)),
    });
    (async () => {
      try {
        const pdf = await task.promise;
        box.replaceChildren();
        const larghezzaCss = (box.clientWidth - 16) * zoom;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        for (let n = 1; n <= pdf.numPages && !annullato; n++) {
          const pagina = await pdf.getPage(n);
          const base = pagina.getViewport({ scale: 1 });
          let scala = (larghezzaCss / base.width) * dpr;
          // limite di pixel per pagina
          const pixel = base.width * base.height * scala * scala;
          if (pixel > MAX_PIXEL_PAGINA)
            scala *= Math.sqrt(MAX_PIXEL_PAGINA / pixel);
          const viewport = pagina.getViewport({ scale: scala });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await pagina.render({ canvas, viewport }).promise;
          const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, "image/jpeg", 0.9),
          );
          // libera subito la memoria del canvas (importante su iOS)
          canvas.width = 0;
          canvas.height = 0;
          pagina.cleanup();
          if (!blob || annullato) break;

          const url = URL.createObjectURL(blob);
          urls.push(url);
          const img = document.createElement("img");
          img.src = url;
          img.alt = `Pagina ${n}`;
          img.style.width = `${larghezzaCss}px`;
          img.style.aspectRatio = `${base.width} / ${base.height}`;
          box.appendChild(img);
          if (n === 1) setCaricamento(false);
        }
      } catch (e) {
        if (!annullato) setErrore((e as Error).message);
      } finally {
        if (!annullato) setCaricamento(false);
      }
    })();
    return () => {
      annullato = true;
      task.destroy();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [dieta, zoom]);

  const condividi = async () => {
    if (!dieta) return;
    // il file è già in memoria: share() parte subito dopo il tocco, come richiede Safari
    const file = new File([dieta.dati], `${dieta.titolo}.pdf`, {
      type: "application/pdf",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        /* annullato */
      }
    } else {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  return (
    <>
      <Header
        titolo={dieta?.titolo ?? "Dieta"}
        indietro="/diete"
        azioni={
          dieta && (
            <>
              <button
                className="btn-icona"
                aria-label="Riduci"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
              >
                −
              </button>
              <button
                className="btn-icona"
                aria-label="Ingrandisci"
                onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                disabled={zoom >= 3}
              >
                +
              </button>
              <button
                className="btn-icona"
                aria-label="Condividi"
                onClick={condividi}
              >
                <IconaCondividi />
              </button>
            </>
          )
        }
      />
      {dieta === null && <div className="vuoto">PDF non trovato.</div>}
      {errore && (
        <div className="vuoto">Impossibile aprire il PDF: {errore}</div>
      )}
      {dieta && caricamento && !errore && (
        <div className="vuoto">Caricamento…</div>
      )}
      <div style={{ overflowX: "auto" }}>
        <div ref={contenitore} className="pdf-pagine" />
      </div>
    </>
  );
}
