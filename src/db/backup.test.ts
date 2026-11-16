import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db } from './db';
import { esportaJson, importaJson } from './backup';
import { creaAllenamento, creaEsercizio, creaScheda, eliminaScheda, salvaSessione } from './repo';

describe('backup e repository', () => {
  it('esporta e reimporta tutti i dati, PDF compresi', async () => {
    const s = await creaScheda('Prova');
    const a = await creaAllenamento(s, 'Giorno A');
    const e = await creaEsercizio(a, { nome: 'Panca piana', descrizione: '', serieTarget: 3, ripTarget: '8' });
    await salvaSessione({ data: '2026-11-16', schedaId: s, allenamentoId: a }, [
      { esercizioId: e, nomeEsercizio: 'Panca piana', ordineEsercizio: 0, numero: 1, ripetizioni: 8, kg: 80 },
    ]);
    await db.diete.add({ titolo: 'Dieta', dati: new Uint8Array([1, 2, 3]).buffer, dimensione: 3, caricataIl: 1 } as never);

    const json = await esportaJson();
    await Promise.all(db.tables.map((t) => t.clear()));
    await importaJson(json);

    expect(await db.schede.count()).toBe(1);
    expect(await db.serie.count()).toBe(1);
    const dieta = await db.diete.toCollection().first();
    expect([...new Uint8Array(dieta!.dati)]).toEqual([1, 2, 3]);
  });

  it('eliminando la scheda lo storico resta', async () => {
    const s = (await db.schede.toCollection().first())!.id;
    await eliminaScheda(s);
    expect(await db.esercizi.count()).toBe(0);
    expect(await db.serie.count()).toBe(1);
    expect((await db.sessioni.toCollection().first())!.nomeScheda).toBe('Prova');
  });
});
