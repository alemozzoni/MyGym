import { db, TABELLE } from './db';

// 2: diete strutturate al posto dei PDF
const VERSIONE_BACKUP = 2;

/** Serializza l'intero database in una stringa JSON */
export async function esportaJson(): Promise<string> {
  const contenuto: Record<string, unknown[]> = {};
  for (const t of TABELLE) contenuto[t] = await db.table(t).toArray();
  return JSON.stringify({ app: 'mygym', versione: VERSIONE_BACKUP, esportatoIl: new Date().toISOString(), contenuto });
}

/** Sostituisce tutti i dati con quelli del backup */
export async function importaJson(testo: string) {
  const backup = JSON.parse(testo);
  if (backup?.app !== 'mygym' || !backup.contenuto) throw new Error('File di backup non valido');
  const c = backup.contenuto as Record<string, unknown[]>;
  // nei backup della versione 1 le diete erano PDF: non sono più supportate
  const conDiete = (backup.versione ?? 1) >= 2;
  await db.transaction('rw', TABELLE.map((t) => db.table(t)), async () => {
    for (const t of TABELLE) {
      await db.table(t).clear();
      if (t === 'diete' && !conDiete) continue;
      await db.table(t).bulkAdd(c[t] ?? []);
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
