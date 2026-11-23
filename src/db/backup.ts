import type { Dati } from './tipi';

// 3: documenti Firestore (1-2 erano le tabelle della versione locale)
const VERSIONE_BACKUP = 3;

/** Serializza tutti i dati in una stringa JSON */
export function esportaJson(dati: Dati): string {
  return JSON.stringify({ app: 'mygym', versione: VERSIONE_BACKUP, esportatoIl: new Date().toISOString(), contenuto: dati });
}

/** Legge un file di backup di qualsiasi versione e lo converte nel formato attuale */
export function leggiBackup(testo: string): Dati {
  const backup = JSON.parse(testo);
  if (backup?.app !== 'mygym' || !backup.contenuto) throw new Error('File di backup non valido');
  if ((backup.versione ?? 1) < 3) throw new Error('Backup della versione locale: non ancora supportato');
  const c = backup.contenuto;
  return { schede: c.schede ?? [], sessioni: c.sessioni ?? [], diete: c.diete ?? [] };
}

/** Prepara il file di backup */
export function preparaBackup(dati: Dati): File {
  const json = esportaJson(dati);
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
