import { describe, expect, it } from 'vitest';
import type { Scheda, Sessione } from '../db/tipi';
import { copiaAllenamenti, nomiEsercizi, sposta, ultimePrestazioni } from './modello';

const sessione = (id: string, data: string, kg: number, creataIl = 0): Sessione => ({
  id, data, schedaId: 's', allenamentoId: 'a', nomeScheda: 'S', nomeAllenamento: 'A', creataIl,
  serie: [{ esercizioId: 'e', nomeEsercizio: 'Panca', ordineEsercizio: 0, numero: 1, ripetizioni: 8, kg }],
});

describe('ultimePrestazioni', () => {
  const sessioni = [sessione('a', '2026-11-01', 60), sessione('b', '2026-11-08', 65), sessione('c', '2026-11-15', 70)];

  it('sessione precedente più recente, esclusa quella in modifica', () => {
    expect(ultimePrestazioni(sessioni, 'Panca', '2026-11-10')!.serie[0].kg).toBe(65);
    expect(ultimePrestazioni(sessioni, 'Panca', '2026-11-08', 'b')!.serie[0].kg).toBe(60);
    expect(ultimePrestazioni(sessioni, 'Panca', '2026-10-01')).toBeNull();
    expect(ultimePrestazioni(sessioni, 'Stacco', '2026-12-01')).toBeNull();
  });

  it('stessa data: vale la sessione creata per ultima', () => {
    const doppie = [sessione('y', '2026-11-01', 90, 2), sessione('x', '2026-11-01', 80, 1)];
    expect(ultimePrestazioni(doppie, 'Panca', '2026-11-01')!.serie[0].kg).toBe(90);
  });
});

describe('schede', () => {
  const scheda: Scheda = {
    id: 's', nome: 'A', attiva: true, creataIl: 1, aggiornataIl: 1,
    allenamenti: [{ id: 'a1', nome: 'G', esercizi: [{ id: 'e1', nome: 'Squat', descrizione: '', serieTarget: 4, ripTarget: '6' }] }],
  };

  it('la copia ha nuovi id e gli stessi contenuti', () => {
    const copia = copiaAllenamenti(scheda);
    expect(copia[0].id).not.toBe('a1');
    expect(copia[0].esercizi[0].id).not.toBe('e1');
    expect(copia[0].esercizi[0].nome).toBe('Squat');
    copia[0].esercizi[0].nome = 'Altro';
    expect(scheda.allenamenti[0].esercizi[0].nome).toBe('Squat');
  });

  it('nomi degli esercizi da schede e storico, senza doppioni', () => {
    expect(nomiEsercizi([scheda], [sessione('a', '2026-11-01', 60)])).toEqual(['Panca', 'Squat']);
  });
});

describe('sposta', () => {
  it('sposta un elemento senza uscire dai limiti', () => {
    expect(sposta(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(sposta(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
