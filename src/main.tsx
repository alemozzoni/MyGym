import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// chiede al browser di non cancellare i dati locali in caso di poco spazio
navigator.storage?.persist?.().catch(() => {});

// iPhone (app installata in Home): quando la tastiera si chiude, iOS a volte non
// ricalcola la posizione degli elementi fissi (la barra in basso resta a metà
// schermo finché non si tocca la pagina). Uno scroll "nullo" forza il ricalcolo.
const vv = window.visualViewport;
if (vv) {
  let altezzaPrecedente = vv.height;
  vv.addEventListener("resize", () => {
    if (vv.height > altezzaPrecedente) {
      // la tastiera si è chiusa: si ricalcola subito e dopo l'animazione
      const ricalcola = () => window.scrollTo(window.scrollX, window.scrollY);
      ricalcola();
      setTimeout(ricalcola, 300);
    }
    altezzaPrecedente = vv.height;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
