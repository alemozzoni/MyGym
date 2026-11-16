import { db, TABELLE } from './db';

const VERSIONE_BACKUP = 1;

// Conversione ArrayBuffer <-> base64 a blocchi (evita stack overflow su file grandi)
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** Serializza l'intero database in una stringa JSON */
export async function esportaJson(): Promise<string> {
  const contenuto: Record<string, unknown[]> = {};
  for (const t of TABELLE) contenuto[t] = await db.table(t).toArray();
  contenuto.diete = (contenuto.diete as { dati: ArrayBuffer }[]).map((d) => ({
    ...d,
    dati: bufferToBase64(d.dati),
  }));
  return JSON.stringify({ app: 'mygym', versione: VERSIONE_BACKUP, esportatoIl: new Date().toISOString(), contenuto });
}

/** Sostituisce tutti i dati con quelli del backup */
export async function importaJson(testo: string) {
  const backup = JSON.parse(testo);
  if (backup?.app !== 'mygym' || !backup.contenuto) throw new Error('File di backup non valido');
  const c = backup.contenuto as Record<string, unknown[]>;
  await db.transaction('rw', TABELLE.map((t) => db.table(t)), async () => {
    for (const t of TABELLE) {
      await db.table(t).clear();
      let righe = c[t] ?? [];
      if (t === 'diete') {
        righe = (righe as { dati: string }[]).map((d) => ({ ...d, dati: base64ToBuffer(d.dati) }));
      }
      await db.table(t).bulkAdd(righe);
    }
  });
}

/** Scarica il backup; su iPhone usa il foglio di condivisione (Salva su File / iCloud) */
export async function scaricaBackup() {
  const json = await esportaJson();
  const nome = `mygym-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], nome, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup MyGym' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
