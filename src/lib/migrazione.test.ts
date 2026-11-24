import { describe, expect, it } from 'vitest';
import { convertiDatiLocali } from './migrazione';

describe('migrazione dei dati locali', () => {
  const convertiti = convertiDatiLocali({
    schede: [{ id: 1, nome: 'Massa', attiva: true, creataIl: 10, aggiornataIl: 20 }],
    allenamenti: [
      { id: 2, schedaId: 1, nome: 'B', ordine: 1 },
      { id: 1, schedaId: 1, nome: 'A', ordine: 0 },
    ],
    esercizi: [
      { id: 2, allenamentoId: 1, nome: 'Croci', descrizione: '', serieTarget: 3, ripTarget: '12', ordine: 1 },
      { id: 1, allenamentoId: 1, nome: 'Panca', descrizione: 'giù', serieTarget: 4, ripTarget: '8', ordine: 0 },
    ],
    sessioni: [{ id: 7, data: '2026-11-10', schedaId: 1, allenamentoId: 1, nomeScheda: 'Massa', nomeAllenamento: 'A' }],
    serie: [
      { sessioneId: 7, esercizioId: 1, nomeEsercizio: 'Panca', ordineEsercizio: 0, numero: 2, ripetizioni: 8, kg: 80 },
      { sessioneId: 7, esercizioId: 0, nomeEsercizio: 'Dip', ordineEsercizio: 1, numero: 1, ripetizioni: 10, kg: 0 },
      { sessioneId: 7, esercizioId: 1, nomeEsercizio: 'Panca', ordineEsercizio: 0, numero: 1, ripetizioni: 8, kg: 75 },
    ],
    diete: [
      { id: 1, titolo: 'PDF vecchio' },
      { id: 2, titolo: 'Massa', attiva: true, giorni: [{ nome: 'Lunedì', pasti: [] }] },
    ],
  });

  it('annida allenamenti ed esercizi nella scheda rispettando l\'ordine', () => {
    const [s] = convertiti.schede;
    expect(s.allenamenti.map((a) => a.nome)).toEqual(['A', 'B']);
    expect(s.allenamenti[0].esercizi.map((e) => e.nome)).toEqual(['Panca', 'Croci']);
    expect(s.id).toBe('locale-scheda-1');
  });

  it('include le serie nella sessione, in ordine, con gli id convertiti', () => {
    const [x] = convertiti.sessioni;
    expect(x.schedaId).toBe('locale-scheda-1');
    expect(x.serie.map((s) => `${s.nomeEsercizio}${s.numero}`)).toEqual(['Panca1', 'Panca2', 'Dip1']);
    expect(x.serie[0].esercizioId).toBe('locale-esercizio-1');
    // esercizio fuori scheda
    expect(x.serie[2].esercizioId).toBe('');
  });

  it('tiene solo le diete strutturate', () => {
    expect(convertiti.diete.map((d) => d.titolo)).toEqual(['Massa']);
  });
});
