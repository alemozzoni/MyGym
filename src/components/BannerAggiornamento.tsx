import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registra il service worker (app offline) e, quando è pronta una nuova versione,
 * mostra un banner: l'aggiornamento si applica solo quando lo decidi tu,
 * così non si perdono dati mentre stai compilando un allenamento.
 */
export function BannerAggiornamento() {
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

  if (!daAggiornare) return null;
  return (
    <div className="banner-aggiornamento" role="status">
      <span className="spazio">Nuova versione disponibile</span>
      <button className="btn-icona grigio" onClick={() => setDaAggiornare(false)}>Dopo</button>
      <button className="btn btn-primario" style={{ minHeight: 36, padding: '6px 14px' }} onClick={aggiorna}>
        Aggiorna
      </button>
    </div>
  );
}
