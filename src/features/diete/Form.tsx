import { useState, type FormEvent } from "react";
import { Modale } from "../../components/Modale";
import type { Alimento, Pasto } from "../../db/tipi";

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

/** Nome di un giorno della dieta */
export function FormGiorno({
  iniziale,
  onSalva,
  onChiudi,
}: {
  iniziale?: string;
  onSalva: (nome: string) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale ?? "");
  return (
    <Modale titolo={iniziale ? "Rinomina giorno" : "Nuovo giorno"} onChiudi={onChiudi}>
      <form
        className="colonna"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) onSalva(nome.trim());
        }}
      >
        <label className="campo">
          Nome
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Lunedì, Giorno di allenamento…"
          />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
      </form>
    </Modale>
  );
}

/** Nome, orario e note di un pasto */
export function FormPasto({
  iniziale,
  onSalva,
  onChiudi,
}: {
  iniziale?: Pasto;
  onSalva: (dati: Pick<Pasto, "nome" | "orario" | "note">) => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale?.nome ?? "");
  const [orario, setOrario] = useState(iniziale?.orario ?? "");
  const [note, setNote] = useState(iniziale?.note ?? "");
  return (
    <Modale titolo={iniziale ? "Modifica pasto" : "Nuovo pasto"} onChiudi={onChiudi}>
      <form
        className="colonna"
        style={{ gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return;
          onSalva({
            nome: nome.trim(),
            orario: orario.trim() || undefined,
            note: note.trim() || undefined,
          });
        }}
      >
        <label className="campo">
          Nome
          <input
            autoFocus={!iniziale}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Colazione, Pre-allenamento…"
          />
        </label>
        <label className="campo">
          Orario (facoltativo)
          <input
            value={orario}
            onChange={(e) => setOrario(e.target.value)}
            placeholder="Es. 7:30"
          />
        </label>
        <label className="campo">
          Note (facoltative)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Alternative, modalità di cottura…"
          />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
      </form>
    </Modale>
  );
}

const UNITA = ["g", "ml", "pz", "cucchiai", "cucchiaini", "fette", "q.b."];

/** "12,5" → 12.5; campo vuoto o non valido → undefined */
const numero = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return s.trim() && Number.isFinite(n) && n >= 0 ? n : undefined;
};
const testo = (n?: number) => (n === undefined ? "" : String(n));

/** Alimento con quantità e macro facoltative */
export function FormAlimento({
  iniziale,
  precedenti,
  onSalva,
  onElimina,
  onChiudi,
}: {
  iniziale?: Alimento;
  /** alimenti già inseriti nelle diete: suggeriscono nome e valori */
  precedenti: Alimento[];
  onSalva: (a: Alimento) => void;
  onElimina?: () => void;
  onChiudi: () => void;
}) {
  const [nome, setNome] = useState(iniziale?.nome ?? "");
  const [quantita, setQuantita] = useState(iniziale?.quantita ?? "");
  const [unita, setUnita] = useState(iniziale?.unita ?? "g");
  const [kcal, setKcal] = useState(testo(iniziale?.kcal));
  const [proteine, setProteine] = useState(testo(iniziale?.proteine));
  const [carboidrati, setCarboidrati] = useState(testo(iniziale?.carboidrati));
  const [grassi, setGrassi] = useState(testo(iniziale?.grassi));
  const [note, setNote] = useState(iniziale?.note ?? "");

  const nomi = [...new Set(precedenti.map((a) => a.nome))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );

  /** Scegliendo un alimento già usato si ricopiano quantità e macro (se i campi sono vuoti) */
  const completa = (valore: string) => {
    const usato = precedenti.find(
      (a) => a.nome.toLowerCase() === valore.trim().toLowerCase(),
    );
    if (!usato || iniziale) return;
    if (!quantita) setQuantita(usato.quantita);
    if (usato.unita) setUnita(usato.unita);
    if (!kcal) setKcal(testo(usato.kcal));
    if (!proteine) setProteine(testo(usato.proteine));
    if (!carboidrati) setCarboidrati(testo(usato.carboidrati));
    if (!grassi) setGrassi(testo(usato.grassi));
  };

  const invia = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSalva({
      nome: nome.trim().replace(/\s+/g, " "),
      quantita: quantita.trim(),
      unita: unita.trim() || undefined,
      kcal: numero(kcal),
      proteine: numero(proteine),
      carboidrati: numero(carboidrati),
      grassi: numero(grassi),
      note: note.trim() || undefined,
    });
  };

  return (
    <Modale titolo={iniziale ? "Modifica alimento" : "Nuovo alimento"} onChiudi={onChiudi}>
      <form className="colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">
          Alimento
          <input
            autoFocus={!iniziale}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={(e) => completa(e.target.value)}
            placeholder="Es. Fiocchi d'avena"
            list="nomi-alimenti"
          />
          <datalist id="nomi-alimenti">
            {nomi.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <div className="griglia-2">
          <label className="campo">
            Quantità
            <input
              inputMode="decimal"
              value={quantita}
              onChange={(e) => setQuantita(e.target.value)}
              placeholder="80"
            />
          </label>
          <label className="campo">
            Unità
            <input
              value={unita}
              onChange={(e) => setUnita(e.target.value)}
              list="unita-alimenti"
            />
            <datalist id="unita-alimenti">
              {UNITA.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="muted piccolo">
          Valori per la quantità indicata (facoltativi)
        </div>
        <div className="griglia-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <label className="campo">
            Kcal
            <input inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </label>
          <label className="campo">
            Prot.
            <input inputMode="decimal" value={proteine} onChange={(e) => setProteine(e.target.value)} />
          </label>
          <label className="campo">
            Carb.
            <input inputMode="decimal" value={carboidrati} onChange={(e) => setCarboidrati(e.target.value)} />
          </label>
          <label className="campo">
            Grassi
            <input inputMode="decimal" value={grassi} onChange={(e) => setGrassi(e.target.value)} />
          </label>
        </div>
        <label className="campo">
          Note (facoltative)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es. peso a crudo, in alternativa…"
          />
        </label>
        <BottoniForm onChiudi={onChiudi} disabilitato={!nome.trim()} />
        {onElimina && (
          <button type="button" className="btn btn-pericolo" onClick={onElimina}>
            Elimina alimento
          </button>
        )}
      </form>
    </Modale>
  );
}
