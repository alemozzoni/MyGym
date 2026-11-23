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

beforeEach(() => archivio.clear());

describe('bozze', () => {
  it('salva, rilegge ed elimina', () => {
    const k = p.chiaveBozza();
    p.salvaBozza(k, { a: 1 });
    expect(p.leggiBozza<{ a: number }>(k)).toEqual({ a: 1 });
    p.eliminaBozza(k);
    expect(p.leggiBozza(k)).toBeNull();
  });
  it('chiavi separate per sessione nuova ed esistente', () => {
    expect(p.chiaveBozza()).not.toBe(p.chiaveBozza('abc'));
  });
  it('bozza corrotta → null', () => {
    archivio.set('mygym:bozza:nuova', '{rotto');
    expect(p.leggiBozza('mygym:bozza:nuova')).toBeNull();
  });
});
