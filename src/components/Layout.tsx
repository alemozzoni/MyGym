import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { IconaCalendario, IconaDieta, IconaGrafico, IconaIndietro, IconaSchede } from './Icone';

/** Intestazione fissa con titolo, pulsante indietro opzionale e azioni a destra */
export function Header({ titolo, indietro, azioni }: { titolo: string; indietro?: boolean | string; azioni?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="header">
      {indietro && (
        <button className="btn-icona" aria-label="Indietro"
          onClick={() => (typeof indietro === 'string' ? nav(indietro) : nav(-1))}>
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
  const voci = [
    { to: '/schede', etichetta: 'Schede', icona: <IconaSchede /> },
    { to: '/calendario', etichetta: 'Calendario', icona: <IconaCalendario /> },
    { to: '/progressi', etichetta: 'Progressi', icona: <IconaGrafico /> },
    { to: '/diete', etichetta: 'Diete', icona: <IconaDieta /> },
  ];
  return (
    <nav className="tabbar">
      {voci.map((v) => (
        <NavLink key={v.to} to={v.to}>
          {v.icona}
          <span>{v.etichetta}</span>
        </NavLink>
      ))}
    </nav>
  );
}
