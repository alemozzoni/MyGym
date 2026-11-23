import type { Alimento, GiornoDieta, Pasto } from "../db/tipi";

export interface Macro {
  kcal: number;
  proteine: number;
  carboidrati: number;
  grassi: number;
}

const ZERO: Macro = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };

const somma = (a: Macro, b: Partial<Macro>): Macro => ({
  kcal: a.kcal + (b.kcal ?? 0),
  proteine: a.proteine + (b.proteine ?? 0),
  carboidrati: a.carboidrati + (b.carboidrati ?? 0),
  grassi: a.grassi + (b.grassi ?? 0),
});

/** true se almeno un alimento ha qualche valore nutrizionale inserito */
export const haMacro = (alimenti: Alimento[]) =>
  alimenti.some(
    (a) =>
      a.kcal !== undefined ||
      a.proteine !== undefined ||
      a.carboidrati !== undefined ||
      a.grassi !== undefined,
  );

export const totaliPasto = (p: Pasto): Macro =>
  p.alimenti.reduce<Macro>(somma, { ...ZERO });

export const totaliGiorno = (g: GiornoDieta): Macro =>
  g.pasti.map(totaliPasto).reduce(somma, { ...ZERO });

/** "560 kcal · P 32 · C 70 · G 15" (arrotondato) */
export const formattaMacro = (m: Macro) =>
  `${Math.round(m.kcal)} kcal · P ${Math.round(m.proteine)} · C ${Math.round(m.carboidrati)} · G ${Math.round(m.grassi)}`;
