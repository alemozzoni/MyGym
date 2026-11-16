import { useEffect, useState } from 'react';

/** Campo numerico con pulsanti − / + grandi, comodi da usare in palestra */
export function Stepper({ valore, onChange, passo = 1, min = 0, decimali = false, etichetta, segnaposto }: {
  valore: number;
  onChange: (v: number) => void;
  passo?: number;
  min?: number;
  decimali?: boolean;
  etichetta: string;
  segnaposto?: string; // es. il valore dell'ultima volta
}) {
  // testo locale: permette di scrivere "72," senza che venga subito riformattato
  const [testo, setTesto] = useState(valore ? String(valore) : '');
  useEffect(() => {
    if (parseNum(testo) !== valore) setTesto(valore ? String(valore) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valore]);

  const cambia = (delta: number) => {
    const nuovo = Math.max(min, Math.round((valore + delta) * 100) / 100);
    onChange(nuovo);
  };

  return (
    <div className="stepper">
      <button type="button" aria-label={`Diminuisci ${etichetta}`} onClick={() => cambia(-passo)}>−</button>
      <input
        aria-label={etichetta}
        inputMode={decimali ? 'decimal' : 'numeric'}
        value={testo}
        placeholder={segnaposto ?? '0'}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setTesto(e.target.value);
          onChange(Math.max(min, parseNum(e.target.value)));
        }}
      />
      <button type="button" aria-label={`Aumenta ${etichetta}`} onClick={() => cambia(passo)}>+</button>
    </div>
  );
}

const parseNum = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
