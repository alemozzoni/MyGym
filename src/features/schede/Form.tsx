import { useState, type FormEvent } from 'react';
import { Modale } from '../../components/Modale';
import type { Esercizio } from '../../db/tipi';

export type DatiEsercizio = Omit<Esercizio, 'id'>;

/** Creazione / modifica di una scheda */
export function FormScheda({ iniziale, onSalva, onChiudi }: {
  iniziale?: { nome: string; note?: string };
  onSalva: (nome: string, note?: string) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [note, setNote] = useState(iniziale?.note ?? '');
  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (nome.trim()) onSalva(nome.trim(), note.trim() || undefined);
  };
  return (
    <Modale titolo={iniziale ? 'Modifica scheda' : 'Nuova scheda'} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">Nome
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Massa autunno 2026" />
        </label>
        <label className="campo">Note (facoltative)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Obiettivo, durata, indicazioni del coach…" />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
      </form>
    </Modale>
  );
}

/** Nome di un allenamento (giorno) */
export function FormAllenamento({ iniziale, onSalva, onChiudi }: {
  iniziale?: string;
  onSalva: (nome: string) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale ?? '');
  return (
    <Modale titolo={iniziale ? 'Rinomina allenamento' : 'Nuovo allenamento'} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); if (nome.trim()) onSalva(nome.trim()); }}>
        <label className="campo">Nome
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Giorno A – Petto e tricipiti" />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
      </form>
    </Modale>
  );
}

/** Dati di un esercizio */
export function FormEsercizio({ iniziale, suggerimenti, onSalva, onChiudi }: {
  iniziale?: Esercizio;
  suggerimenti: string[];
  onSalva: (dati: DatiEsercizio) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [descrizione, setDescrizione] = useState(iniziale?.descrizione ?? '');
  const [serie, setSerie] = useState(String(iniziale?.serieTarget ?? 3));
  const [rip, setRip] = useState(iniziale?.ripTarget ?? '10');
  const [recupero, setRecupero] = useState(iniziale?.recuperoSec ? String(iniziale.recuperoSec) : '90');

  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSalva({
      nome: nome.trim().replace(/\s+/g, ' '),
      descrizione: descrizione.trim(),
      serieTarget: Math.max(1, parseInt(serie) || 1),
      ripTarget: rip.trim() || '-',
      recuperoSec: parseInt(recupero) || undefined,
    });
  };

  return (
    <Modale titolo={iniziale ? 'Modifica esercizio' : 'Nuovo esercizio'} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">Nome esercizio
          <input autoFocus={!iniziale} value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Panca piana bilanciere" list="nomi-esercizi" />
          {/* suggerisce i nomi già usati: stesso nome = stesso grafico nei Progressi */}
          <datalist id="nomi-esercizi">{suggerimenti.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <div className="griglia-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <label className="campo">Serie
            <input inputMode="numeric" value={serie} onChange={(e) => setSerie(e.target.value)} />
          </label>
          <label className="campo">Ripetizioni
            <input value={rip} onChange={(e) => setRip(e.target.value)} placeholder="8-10" />
          </label>
          <label className="campo">Recupero (s)
            <input inputMode="numeric" value={recupero} onChange={(e) => setRecupero(e.target.value)} />
          </label>
        </div>
        <label className="campo">Descrizione / esecuzione
          <textarea rows={4} value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Presa, tempo, punti chiave della tecnica…" />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
      </form>
    </Modale>
  );
}

function BottoniForm({ onChiudi, disabilitato }: { onChiudi: () => void; disabilitato: boolean }) {
  return (
    <div className="griglia-2">
      <button type="button" className="btn" onClick={onChiudi}>Annulla</button>
      <button type="submit" className="btn btn-primario" disabled={disabilitato}>Salva</button>
    </div>
  );
}
