import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from '../db/db';
import {
  backupScaduto, giorniDa, K_BOZZA_NUOVA, posticipaBackup, ultimoBackup, useLocalStorage,
} from '../lib/promemoria';

/**
 * Avvisi fissi sopra la tab bar:
 * - allenamento non salvato (es. l'app è stata chiusa da iOS mentre lo compilavi)
 * - promemoria backup
 * - nuova versione dell'app disponibile
 */
export function Avvisi() {
  const { pathname } = useLocation();
  const inSessione = pathname.startsWith('/sessione');

  const bozza = useLocalStorage(() => localStorage.getItem(K_BOZZA_NUOVA));
  const ultimo = useLocalStorage(ultimoBackup);
  // dipende anche da frequenza/posticipo: li rilegge a ogni evento di storage
  const scaduto = useLocalStorage(() => String(backupScaduto(true)));
  const ciSonoDati = useLiveQuery(async () => (await db.sessioni.count()) > 0 || (await db.diete.count()) > 0);

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
  const mostraBackup = scaduto === 'true' && !!ciSonoDati && !inSessione && pathname !== '/impostazioni';
  // durante la compilazione di un allenamento l'aggiornamento aspetta (si perderebbero i dati)
  const mostraAggiornamento = daAggiornare && !inSessione;

  const visibili = mostraBozza || mostraBackup || mostraAggiornamento;
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
  const giorni = ultimo ? giorniDa(ultimo) : null;

  return (
    <div className="area-avvisi" ref={area}>
      {mostraBozza && (
        <div className="avviso" role="status">
          <span className="spazio">Hai un allenamento non salvato</span>
          <Link className="btn btn-primario btn-piccolo" to="/sessione/nuova?bozza=1">Riprendi</Link>
        </div>
      )}
      {mostraBackup && (
        <div className="avviso" role="status">
          <span className="spazio">
            {giorni === null ? 'Non hai ancora fatto un backup' : `Ultimo backup ${giorni} giorni fa`}
          </span>
          <button className="btn-icona grigio" onClick={posticipaBackup}>Dopo</button>
          <Link className="btn btn-primario btn-piccolo" to="/impostazioni">Backup</Link>
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
