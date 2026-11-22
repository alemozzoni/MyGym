import { lazy, Suspense } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { TabBar } from "./components/Layout";
import { Avvisi } from "./components/Avvisi";
import { DatiProvider, useUtente } from "./db/dati";
import Accesso from "./features/accesso/Accesso";
import ListaSchede from "./features/schede/ListaSchede";
import DettaglioScheda from "./features/schede/DettaglioScheda";
import Calendario from "./features/calendario/Calendario";
import Sessione from "./features/calendario/Sessione";
import ListaDiete from "./features/diete/ListaDiete";
import DettaglioDieta from "./features/diete/DettaglioDieta";
import Impostazioni from "./features/impostazioni/Impostazioni";

// sezione pesante (grafici) caricata solo quando serve
const Progressi = lazy(() => import("./features/progressi/Progressi"));

// HashRouter: funziona su qualsiasi hosting statico senza configurazioni di rewrite
export default function App() {
  return (
    <DatiProvider>
      <HashRouter>
        <Contenuto />
      </HashRouter>
    </DatiProvider>
  );
}

function Contenuto() {
  const utente = useUtente();
  // verifica dell'accesso in corso (dura pochi istanti, anche offline)
  if (utente === undefined) return null;
  if (!utente) return <Accesso />;
  return (
    <div className="app">
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/schede" replace />} />
          <Route path="/schede" element={<ListaSchede />} />
          <Route path="/schede/:id" element={<DettaglioScheda />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/sessione/nuova" element={<SessioneNuovaIstanza />} />
          <Route path="/sessione/:id" element={<SessioneNuovaIstanza />} />
          <Route path="/progressi" element={<Progressi />} />
          <Route path="/diete" element={<ListaDiete />} />
          <Route path="/diete/:id" element={<DettaglioDieta />} />
          <Route path="/impostazioni" element={<Impostazioni />} />
          <Route path="*" element={<Navigate to="/schede" replace />} />
        </Routes>
      </Suspense>
      <TabBar />
      <Avvisi />
    </div>
  );
}

// ogni navigazione verso una sessione crea un form nuovo (evita di riusare lo stato precedente)
function SessioneNuovaIstanza() {
  const { key } = useLocation();
  return <Sessione key={key} />;
}
