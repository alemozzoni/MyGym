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

/** Prepara il file di backup (operazione asincrona: legge tutto il database) */
export async function preparaBackup(): Promise<File> {
  const json = await esportaJson();
  // nome con data locale (non UTC)
  const d = new Date();
  const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return new File([json], `mygym-backup-${data}.json`, { type: 'application/json' });
}

/**
 * Salva un file già pronto. Va chiamata DIRETTAMENTE nel gestore del tocco:
 * Safari apre il foglio di condivisione solo subito dopo un gesto dell'utente.
 * Restituisce true se il file è stato salvato/condiviso, false se annullato.
 */
export async function salvaFile(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // altri errori: si prova con il download classico
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
