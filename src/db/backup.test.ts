import { describe, expect, it } from 'vitest';
import { esportaJson, leggiBackup } from './backup';
import type { Dati } from './tipi';

const dati: Dati = {
  schede: [{ id: 's1', nome: 'Massa', attiva: true, allenamenti: [], creataIl: 1, aggiornataIl: 1 }],
  sessioni: [{ id: 'x1', data: '2026-11-20', schedaId: 's1', allenamentoId: 'a1', nomeScheda: 'Massa', nomeAllenamento: 'A', serie: [], creataIl: 2 }],
  diete: [{ id: 'd1', titolo: 'Dieta', attiva: true, giorni: [{ nome: 'Lunedì', pasti: [] }], creataIl: 1, aggiornataIl: 1 }],
};

describe('backup', () => {
  it('esporta e rilegge i dati attuali', () => {
    expect(leggiBackup(esportaJson(dati))).toEqual(dati);
  });

  it('converte un backup della versione locale ignorando i PDF', () => {
    const v1 = JSON.stringify({
      app: 'mygym', versione: 1,
      contenuto: {
        schede: [{ id: 5, nome: 'Vecchia', attiva: true, creataIl: 1, aggiornataIl: 1 }],
        diete: [{ id: 1, titolo: 'PDF', dati: 'AQID' }],
      },
    });
    const letti = leggiBackup(v1);
    expect(letti.schede.map((s) => s.nome)).toEqual(['Vecchia']);
    expect(letti.diete).toEqual([]);
  });

  it('rifiuta file non validi', () => {
    expect(() => leggiBackup('{"app":"altro"}')).toThrow('non valido');
  });
});
