import { describe, expect, it } from "vitest";
import type { GiornoDieta } from "../db/db";
import { formattaMacro, haMacro, sposta, totaliGiorno, totaliPasto } from "./dieta";

const giorno: GiornoDieta = {
  nome: "Lunedì",
  pasti: [
    {
      nome: "Colazione",
      alimenti: [
        { nome: "Avena", quantita: "80", unita: "g", kcal: 300, proteine: 10, carboidrati: 50, grassi: 6 },
        { nome: "Latte", quantita: "200", unita: "ml", kcal: 90, proteine: 7 },
      ],
    },
    { nome: "Pranzo", alimenti: [{ nome: "Riso", quantita: "100", unita: "g", kcal: 350.4, carboidrati: 78 }] },
    { nome: "Cena", alimenti: [{ nome: "Verdure", quantita: "q.b." }] },
  ],
};

describe("dieta", () => {
  it("somma i macro del pasto ignorando i valori mancanti", () => {
    expect(totaliPasto(giorno.pasti[0])).toEqual({ kcal: 390, proteine: 17, carboidrati: 50, grassi: 6 });
    expect(totaliPasto(giorno.pasti[2])).toEqual({ kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 });
  });

  it("somma i pasti del giorno", () => {
    expect(totaliGiorno(giorno)).toEqual({ kcal: 740.4, proteine: 17, carboidrati: 128, grassi: 6 });
    expect(formattaMacro(totaliGiorno(giorno))).toBe("740 kcal · P 17 · C 128 · G 6");
  });

  it("riconosce se ci sono macro inserite", () => {
    expect(haMacro(giorno.pasti[0].alimenti)).toBe(true);
    expect(haMacro(giorno.pasti[2].alimenti)).toBe(false);
  });

  it("sposta un elemento senza uscire dai limiti", () => {
    expect(sposta(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(sposta(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
