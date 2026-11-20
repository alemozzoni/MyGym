import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db } from './db';
import { esportaJson, importaJson } from './backup';
import { aggiornaDieta, creaAllenamento, creaDieta, creaEsercizio, creaScheda, eliminaScheda, salvaSessione } from './repo';

describe('backup e repository', () => {
  it('esporta e reimporta tutti i dati, diete comprese', async () => {
    const s = await creaScheda('Prova');
    const a = await creaAllenamento(s, 'Giorno A');
    const e = await creaEsercizio(a, { nome: 'Panca piana', descrizione: '', serieTarget: 3, ripTarget: '8' });
    await salvaSessione({ data: '2026-11-16', schedaId: s, allenamentoId: a }, [
      { esercizioId: e, nomeEsercizio: 'Panca piana', ordineEsercizio: 0, numero: 1, ripetizioni: 8, kg: 80 },
    ]);
    const d = await creaDieta('Dieta');
    await aggiornaDieta(d, {
      giorni: [{ nome: 'Lunedì', pasti: [{ nome: 'Pranzo', alimenti: [{ nome: 'Riso', quantita: '100', unita: 'g', kcal: 350 }] }] }],
    });

    const json = await esportaJson();
    await Promise.all(db.tables.map((t) => t.clear()));
    await importaJson(json);

    expect(await db.schede.count()).toBe(1);
    expect(await db.serie.count()).toBe(1);
    const dieta = await db.diete.toCollection().first();
    expect(dieta!.giorni[0].pasti[0].alimenti[0]).toMatchObject({ nome: 'Riso', kcal: 350 });
  });

  it('eliminando la scheda lo storico resta', async () => {
    const s = (await db.schede.toCollection().first())!.id;
    await eliminaScheda(s);
    expect(await db.esercizi.count()).toBe(0);
    expect(await db.serie.count()).toBe(1);
    expect((await db.sessioni.toCollection().first())!.nomeScheda).toBe('Prova');
  });

  it('un backup della versione 1 si importa senza i vecchi PDF', async () => {
    const v1 = JSON.stringify({
      app: 'mygym', versione: 1,
      contenuto: { schede: [{ id: 5, nome: 'Vecchia', attiva: true, creataIl: 1, aggiornataIl: 1 }], diete: [{ id: 1, titolo: 'PDF', dati: 'AQID' }] },
    });
    await importaJson(v1);
    expect((await db.schede.toArray()).map((s) => s.nome)).toEqual(['Vecchia']);
    expect(await db.diete.count()).toBe(0);
  });
});
