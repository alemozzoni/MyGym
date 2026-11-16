import { beforeEach, describe, expect, it } from 'vitest';

// localStorage e window minimi per l'ambiente Node dei test
const archivio = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => archivio.get(k) ?? null,
    setItem: (k: string, v: string) => void archivio.set(k, v),
    removeItem: (k: string) => void archivio.delete(k),
  },
  window: { dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} },
});

const p = await import('./promemoria');
const GIORNO = 86_400_000;

beforeEach(() => archivio.clear());

describe('promemoria backup', () => {
  it('nessun promemoria senza dati', () => expect(p.backupScaduto(false)).toBe(false));
  it('promemoria se non è mai stato fatto un backup', () => expect(p.backupScaduto(true)).toBe(true));
  it('frequenza predefinita 7 giorni', () => {
    archivio.set('mygym:ultimoBackup', String(Date.now() - 6 * GIORNO));
    expect(p.backupScaduto(true)).toBe(false);
    archivio.set('mygym:ultimoBackup', String(Date.now() - 7 * GIORNO));
    expect(p.backupScaduto(true)).toBe(true);
  });
  it('frequenza personalizzata e disattivazione', () => {
    archivio.set('mygym:ultimoBackup', String(Date.now() - 4 * GIORNO));
    p.impostaFrequenza(3);
    expect(p.backupScaduto(true)).toBe(true);
    p.impostaFrequenza(0);
    expect(p.backupScaduto(true)).toBe(false);
  });
  it('dopo un backup il promemoria sparisce', () => {
    p.registraBackup();
    expect(p.backupScaduto(true)).toBe(false);
    expect(p.giorniDa(p.ultimoBackup())).toBe(0);
  });
  it('"Dopo" rimanda di un giorno', () => {
    p.posticipaBackup();
    expect(p.backupScaduto(true)).toBe(false);
    expect(p.backupScaduto(true, Date.now() + GIORNO + 1000)).toBe(true);
  });
});

describe('bozze', () => {
  it('salva, rilegge ed elimina', () => {
    const k = p.chiaveBozza();
    p.salvaBozza(k, { a: 1 });
    expect(p.leggiBozza<{ a: number }>(k)).toEqual({ a: 1 });
    p.eliminaBozza(k);
    expect(p.leggiBozza(k)).toBeNull();
  });
  it('chiavi separate per sessione nuova ed esistente', () => {
    expect(p.chiaveBozza()).not.toBe(p.chiaveBozza(5));
  });
  it('bozza corrotta → null', () => {
    archivio.set('mygym:bozza:nuova', '{rotto');
    expect(p.leggiBozza('mygym:bozza:nuova')).toBeNull();
  });
});
