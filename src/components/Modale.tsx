import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Bottom sheet: si chiude toccando lo sfondo */
export function Modale({ titolo, onChiudi, children }: { titolo: string; onChiudi: () => void; children: ReactNode }) {
  useEffect(() => {
    // blocca lo scroll della pagina sotto
    const prec = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prec; };
  }, []);
  return createPortal(
    <div className="modale-sfondo" onClick={onChiudi}>
      <div className="modale" role="dialog" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <h2>{titolo}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
