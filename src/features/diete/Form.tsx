import { useState, type FormEvent } from "react";
import { Modale } from "../../components/Modale";

/** Creazione / modifica di titolo e note della dieta */
export function FormDieta({
  iniziale,
  onSalva,
  onChiudi,
}: {
  iniziale?: { titolo: string; note?: string };
  onSalva: (titolo: string, note?: string) => void;
  onChiudi: () => void;
}) {
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [note, setNote] = useState(iniziale?.note ?? "");
  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (titolo.trim()) onSalva(titolo.trim(), note.trim() || undefined);
  };
  return (
    <Modale titolo={iniziale ? "Modifica dieta" : "Nuova dieta"} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">
          Titolo
          <input
            autoFocus
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="Es. Dieta massa novembre"
          />
        </label>
        <label className="campo">
          Note (facoltative)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Indicazioni del nutrizionista, integratori, acqua…"
          />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!titolo.trim()} />
      </form>
    </Modale>
  );
}

export function BottoniForm({
  onChiudi,
  disabilitato,
}: {
  onChiudi: () => void;
  disabilitato: boolean;
}) {
  return (
    <div className="griglia-2">
      <button type="button" className="btn" onClick={onChiudi}>
        Annulla
      </button>
      <button type="submit" className="btn btn-primario" disabled={disabilitato}>
        Salva
      </button>
    </div>
  );
}
