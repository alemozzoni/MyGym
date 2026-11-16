import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IconaCalendario, IconaDieta, IconaGrafico, IconaIndietro, IconaSchede } from './Icone';

/** Intestazione fissa con titolo, pulsante indietro opzionale e azioni a destra */
export function Header({ titolo, indietro, azioni }: { titolo: string; indietro?: boolean | string; azioni?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="header">
      {indietro && (
        <button className="btn-icona" aria-label="Indietro"
          onClick={() => {
            if (typeof indietro === 'string') return nav(indietro);
            // pagina aperta direttamente (nessuna cronologia, es. app riaperta): si torna al calendario
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
            if (idx > 0) nav(-1);
            else nav('/calendario', { replace: true });
          }}>
          <IconaIndietro />
        </button>
      )}
      <h1>{titolo}</h1>
      {azioni}
    </header>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return <main className="contenuto">{children}</main>;
}

export function TabBar() {
  const { pathname } = useLocation();
  const voci = [
    { to: '/schede', etichetta: 'Schede', icona: <IconaSchede /> },
    { to: '/calendario', etichetta: 'Calendario', icona: <IconaCalendario /> },
    { to: '/progressi', etichetta: 'Progressi', icona: <IconaGrafico /> },
    { to: '/diete', etichetta: 'Diete', icona: <IconaDieta /> },
  ];
  return (
    <nav className="tabbar">
      {voci.map((v) => (
        <NavLink key={v.to} to={v.to}
          // la compilazione di un allenamento appartiene alla sezione Calendario
          className={({ isActive }) => (isActive || (v.to === '/calendario' && pathname.startsWith('/sessione')) ? 'active' : '')}>
          {v.icona}
          <span>{v.etichetta}</span>
        </NavLink>
      ))}
    </nav>
  );
}
