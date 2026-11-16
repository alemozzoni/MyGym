import { describe, expect, it } from 'vitest';
import { e1rm, puntiDaSerie, riepilogoSessione, valutaAndamento, type PuntoSessione } from './calcoli';

const p = (data: string, valore: number, kg = valore): PuntoSessione => ({
  data, caricoMax: kg, e1rm: valore, volume: 0, ripTotali: valore, serie: 3,
});

describe('e1rm', () => {
  it('formula di Epley', () => expect(e1rm(100, 10)).toBeCloseTo(133.33, 1));
  it('1 ripetizione = carico', () => expect(e1rm(120, 1)).toBe(120));
  it('valori nulli', () => expect(e1rm(0, 10)).toBe(0));
});

describe('riepilogoSessione', () => {
  it('calcola volume, carico massimo e ripetizioni', () => {
    const r = riepilogoSessione('2026-01-01', [
      { kg: 60, ripetizioni: 10 },
      { kg: 70, ripetizioni: 8 },
    ]);
    expect(r.volume).toBe(1160);
    expect(r.caricoMax).toBe(70);
    expect(r.ripTotali).toBe(18);
    expect(r.serie).toBe(2);
  });
});

describe('puntiDaSerie', () => {
  it('raggruppa per sessione e ordina per data', () => {
    const punti = puntiDaSerie([
      { sessioneId: 2, data: '2026-01-08', kg: 50, ripetizioni: 10 },
      { sessioneId: 1, data: '2026-01-01', kg: 40, ripetizioni: 10 },
      { sessioneId: 1, data: '2026-01-01', kg: 45, ripetizioni: 8 },
    ]);
    expect(punti.map((x) => x.data)).toEqual(['2026-01-01', '2026-01-08']);
    expect(punti[0].serie).toBe(2);
  });
});

describe('valutaAndamento', () => {
  it('pochi dati', () => expect(valutaAndamento([p('a', 1)]).stato).toBe('dati-insufficienti'));
  it('progresso', () => {
    const punti = [100, 100, 101, 105, 107, 110].map((v, i) => p(`2026-01-0${i + 1}`, v));
    expect(valutaAndamento(punti).stato).toBe('progresso');
  });
  it('stallo', () => {
    const punti = [100, 101, 100, 100, 101, 100].map((v, i) => p(`2026-01-0${i + 1}`, v));
    expect(valutaAndamento(punti).stato).toBe('stallo');
  });
  it('calo', () => {
    const punti = [110, 110, 110, 100, 98, 97].map((v, i) => p(`2026-01-0${i + 1}`, v));
    expect(valutaAndamento(punti).stato).toBe('calo');
  });
  it('corpo libero usa le ripetizioni', () => {
    const punti = [20, 20, 20, 25, 26, 27].map((v, i) => p(`2026-01-0${i + 1}`, v, 0));
    const r = valutaAndamento(punti);
    expect(r.corpoLibero).toBe(true);
    expect(r.stato).toBe('progresso');
  });
});
