import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/Layout';
import { BannerAggiornamento } from './components/BannerAggiornamento';
import ListaSchede from './features/schede/ListaSchede';
import DettaglioScheda from './features/schede/DettaglioScheda';
import Calendario from './features/calendario/Calendario';
import Sessione from './features/calendario/Sessione';
import ListaDiete from './features/diete/ListaDiete';
import Impostazioni from './features/impostazioni/Impostazioni';

// sezioni pesanti (grafici e pdf.js) caricate solo quando servono
const Progressi = lazy(() => import("./features/progressi/Progressi"));
const VisualizzatorePdf = lazy(() => import("./features/diete/VisualizzatorePdf"));

// HashRouter: funziona su qualsiasi hosting statico senza configurazioni di rewrite
export default function App() {
  return (
    <HashRouter>
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
          <Route path="/diete/:id" element={<VisualizzatorePdf />} />
          <Route path="/impostazioni" element={<Impostazioni />} />
          <Route path="*" element={<Navigate to="/schede" replace />} />
        </Routes>
        </Suspense>
        <TabBar />
        <BannerAggiornamento />
      </div>
    </HashRouter>
  );
}

// ogni navigazione verso una sessione crea un form nuovo (evita di riusare lo stato precedente)
function SessioneNuovaIstanza() {
  const { key } = useLocation();
  return <Sessione key={key} />;
}
