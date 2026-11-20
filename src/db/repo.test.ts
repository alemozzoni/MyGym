import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import * as repo from './repo';

const serie = (esercizioId: number, nome: string, kg: number, rip = 8) => ({
  esercizioId, nomeEsercizio: nome, ordineEsercizio: 0, numero: 1, ripetizioni: rip, kg,
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('schede', () => {
  it('la prima scheda creata è attiva, le successive no', async () => {
    const a = await repo.creaScheda('A');
    const b = await repo.creaScheda('B');
    expect((await db.schede.get(a))!.attiva).toBe(true);
    expect((await db.schede.get(b))!.attiva).toBe(false);
  });

  it('una sola scheda attiva alla volta', async () => {
    const a = await repo.creaScheda('A');
    const b = await repo.creaScheda('B');
    await repo.impostaSchedaAttiva(b);
    expect((await db.schede.get(a))!.attiva).toBe(false);
    expect((await db.schede.get(b))!.attiva).toBe(true);
  });

  it('eliminando la scheda attiva ne diventa attiva un\'altra', async () => {
    const a = await repo.creaScheda('A');
    const b = await repo.creaScheda('B');
    await repo.eliminaScheda(a);
    expect((await db.schede.get(b))!.attiva).toBe(true);
  });

  it('duplica allenamenti ed esercizi', async () => {
    const s = await repo.creaScheda('A');
    const al = await repo.creaAllenamento(s, 'Giorno A');
    await repo.creaEsercizio(al, { nome: 'Squat', descrizione: 'giù', serieTarget: 4, ripTarget: '6' });
    const copia = await repo.duplicaScheda(s);
    const allCopia = await db.allenamenti.where('schedaId').equals(copia).toArray();
    expect(allCopia).toHaveLength(1);
    const esCopia = await db.esercizi.where('allenamentoId').equals(allCopia[0].id).toArray();
    expect(esCopia.map((e) => e.nome)).toEqual(['Squat']);
    expect((await db.schede.get(copia))!.nome).toBe('A (copia)');
  });

  it('riordina gli esercizi', async () => {
    const s = await repo.creaScheda('A');
    const al = await repo.creaAllenamento(s, 'G');
    const base = { descrizione: '', serieTarget: 3, ripTarget: '10' };
    const e1 = await repo.creaEsercizio(al, { ...base, nome: 'Uno' });
    await repo.creaEsercizio(al, { ...base, nome: 'Due' });
    await repo.spostaEsercizio(e1, 1);
    const ordinati = await db.esercizi.where('allenamentoId').equals(al).sortBy('ordine');
    expect(ordinati.map((e) => e.nome)).toEqual(['Due', 'Uno']);
    // spostare oltre il limite non fa nulla
    await repo.spostaEsercizio(e1, 1);
    expect((await db.esercizi.where('allenamentoId').equals(al).sortBy('ordine')).map((e) => e.nome)).toEqual(['Due', 'Uno']);
  });
});

describe('sessioni', () => {
  it('la modifica sostituisce le serie e ignora quelle vuote', async () => {
    const s = await repo.creaScheda('A');
    const al = await repo.creaAllenamento(s, 'G');
    const id = await repo.salvaSessione({ data: '2026-11-01', schedaId: s, allenamentoId: al }, [serie(1, 'Panca', 60)]);
    await repo.salvaSessione({ id, data: '2026-11-02', schedaId: s, allenamentoId: al }, [
      serie(1, 'Panca', 70),
      { ...serie(1, 'Panca', 0, 0), numero: 2 },
    ]);
    const salvate = await db.serie.where('sessioneId').equals(id).toArray();
    expect(salvate).toHaveLength(1);
    expect(salvate[0].kg).toBe(70);
    expect((await db.sessioni.get(id))!.data).toBe('2026-11-02');
    expect(await db.sessioni.count()).toBe(1);
  });

  it('ultime prestazioni: sessione precedente più recente, esclusa quella in modifica', async () => {
    const s = await repo.creaScheda('A');
    const al = await repo.creaAllenamento(s, 'G');
    await repo.salvaSessione({ data: '2026-11-01', schedaId: s, allenamentoId: al }, [serie(1, 'Panca', 60)]);
    const id2 = await repo.salvaSessione({ data: '2026-11-08', schedaId: s, allenamentoId: al }, [serie(1, 'Panca', 65)]);
    await repo.salvaSessione({ data: '2026-11-15', schedaId: s, allenamentoId: al }, [serie(1, 'Panca', 70)]);

    expect((await repo.ultimePrestazioni('Panca', '2026-11-10'))!.serie[0].kg).toBe(65);
    expect((await repo.ultimePrestazioni('Panca', '2026-11-08', id2))!.serie[0].kg).toBe(60);
    expect(await repo.ultimePrestazioni('Panca', '2026-10-01')).toBeNull();
    expect(await repo.ultimePrestazioni('Stacco', '2026-12-01')).toBeNull();
  });

  it('elimina sessione e relative serie', async () => {
    const id = await repo.salvaSessione({ data: '2026-11-01', schedaId: 1, allenamentoId: 1 }, [serie(1, 'Panca', 60)]);
    await repo.eliminaSessione(id);
    expect(await db.sessioni.count()).toBe(0);
    expect(await db.serie.count()).toBe(0);
  });
});

describe('diete', () => {
  it('la prima dieta è attiva e parte con un giorno e i pasti base', async () => {
    const a = await repo.creaDieta('Massa');
    const b = await repo.creaDieta('Definizione');
    const da = (await db.diete.get(a))!;
    expect(da.attiva).toBe(true);
    expect((await db.diete.get(b))!.attiva).toBe(false);
    expect(da.giorni).toHaveLength(1);
    expect(da.giorni[0].pasti.map((p) => p.nome)).toContain('Pranzo');
  });

  it('la copia è indipendente dall\'originale', async () => {
    const a = await repo.creaDieta('Massa');
    const copia = await repo.duplicaDieta(a);
    const c = (await db.diete.get(copia))!;
    c.giorni[0].nome = 'Modificato';
    await repo.aggiornaDieta(copia, { giorni: c.giorni });
    expect((await db.diete.get(a))!.giorni[0].nome).toBe('Giorno 1');
    expect(c.titolo).toBe('Massa (copia)');
    expect(c.attiva).toBe(false);
  });

  it('eliminando la dieta attiva ne diventa attiva un\'altra', async () => {
    const a = await repo.creaDieta('A');
    const b = await repo.creaDieta('B');
    await repo.eliminaDieta(a);
    expect((await db.diete.get(b))!.attiva).toBe(true);
  });
});
