import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useDati } from '../db/dati';
import { leggiDatiLocali } from '../db/locale';
import { importaDati } from '../db/repo';
import { convertiDatiLocali } from '../lib/migrazione';
import { K_BOZZA_NUOVA, useLocalStorage } from '../lib/promemoria';

const K_MIGRAZIONE = 'mygym:migrazione'; // "fatta" o "ignorata"

/** Dati della vecchia versione locale ancora presenti sul dispositivo e non ancora importati */
function useDatiLocali() {
  const [locali, setLocali] = useState<Awaited<ReturnType<typeof leggiDatiLocali>>>(null);
  useEffect(() => {
    if (localStorage.getItem(K_MIGRAZIONE)) return;
    leggiDatiLocali().then(setLocali).catch(() => setLocali(null));
  }, []);
  const chiudi = (esito: 'fatta' | 'ignorata') => {
    localStorage.setItem(K_MIGRAZIONE, esito);
    setLocali(null);
  };
  return { locali, chiudi };
}

/**
 * Avvisi fissi sopra la tab bar:
 * - allenamento non salvato (es. l'app è stata chiusa da iOS mentre lo compilavi)
 * - dati della versione locale da importare nel cloud
 * - nuova versione dell'app disponibile
 */
export function Avvisi() {
  const { pathname } = useLocation();
  const inSessione = pathname.startsWith('/sessione');

  const bozza = useLocalStorage(() => localStorage.getItem(K_BOZZA_NUOVA));
  const dati = useDati();
  const { locali, chiudi } = useDatiLocali();
  const [importazione, setImportazione] = useState(false);

  const importa = async () => {
    if (!locali || !dati) return;
    setImportazione(true);
    try {
      // si aggiungono ai dati già presenti nel cloud (id stabili: niente doppioni se ripetuta)
      await importaDati(convertiDatiLocali(locali), dati, false);
      chiudi('fatta');
      alert('Dati importati: ora sono salvati nel tuo account.');
    } catch (e) {
      alert(`Importazione non riuscita (serve la connessione): ${(e as Error).message}`);
    } finally {
      setImportazione(false);
    }
  };

  const {
    needRefresh: [daAggiornare, setDaAggiornare],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registrazione) {
      // controlla la presenza di nuove versioni ogni ora mentre l'app è aperta
      if (registrazione) setInterval(() => registrazione.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  const aggiorna = async () => {
    await updateServiceWorker(true);
    // se la libreria non ricarica da sola (es. primo avvio, nessuna versione precedente
    // in controllo della pagina), ricarichiamo noi: la nuova versione è già attiva
    setTimeout(() => window.location.reload(), 1000);
  };

  const mostraBozza = !!bozza && !inSessione;
  const mostraMigrazione = !!locali && !!dati && !inSessione;
  // durante la compilazione di un allenamento l'aggiornamento aspetta (si perderebbero i dati)
  const mostraAggiornamento = daAggiornare && !inSessione;

  const visibili = mostraBozza || mostraMigrazione || mostraAggiornamento;
  const area = useRef<HTMLDivElement>(null);
  // spazio extra in fondo alla pagina pari all'altezza degli avvisi: non coprono i contenuti
  useEffect(() => {
    const radice = document.documentElement;
    if (!visibili || !area.current) {
      radice.style.setProperty('--avvisi-h', '0px');
      return;
    }
    const el = area.current;
    const ro = new ResizeObserver(() => radice.style.setProperty('--avvisi-h', `${el.offsetHeight + 10}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      radice.style.setProperty('--avvisi-h', '0px');
    };
  }, [visibili]);

  if (!visibili) return null;

  return (
    <div className="area-avvisi" ref={area}>
      {mostraBozza && (
        <div className="avviso" role="status">
          <span className="spazio">Hai un allenamento non salvato</span>
          <Link className="btn btn-primario btn-piccolo" to="/sessione/nuova?bozza=1">Riprendi</Link>
        </div>
      )}
      {mostraMigrazione && (
        <div className="avviso" role="status">
          <span className="spazio">Ci sono dati salvati su questo dispositivo</span>
          <button className="btn-icona grigio"
            onClick={() => confirm('Non importare i dati locali? Potrai farlo da Impostazioni.') && chiudi('ignorata')}>
            No
          </button>
          <button className="btn btn-primario btn-piccolo" onClick={importa} disabled={importazione}>
            {importazione ? 'Importo…' : 'Importa'}
          </button>
        </div>
      )}
      {mostraAggiornamento && (
        <div className="avviso" role="status">
          <span className="spazio">Nuova versione disponibile</span>
          <button className="btn-icona grigio" onClick={() => setDaAggiornare(false)}>Dopo</button>
          <button className="btn btn-primario btn-piccolo" onClick={aggiorna}>Aggiorna</button>
        </div>
      )}
    </div>
  );
}
