import type { Dati } from './tipi';
import { convertiDatiLocali, type ContenutoLocale } from '../lib/migrazione';

// 1-2: tabelle della versione locale (Dexie); 3: documenti Firestore
const VERSIONE_BACKUP = 3;

/** Serializza tutti i dati in una stringa JSON */
export function esportaJson(dati: Dati): string {
  return JSON.stringify({ app: 'mygym', versione: VERSIONE_BACKUP, esportatoIl: new Date().toISOString(), contenuto: dati });
}

/** Legge un file di backup di qualsiasi versione e lo converte nel formato attuale */
export function leggiBackup(testo: string): Dati {
  const backup = JSON.parse(testo);
  if (backup?.app !== 'mygym' || !backup.contenuto) throw new Error('File di backup non valido');
  const c = backup.contenuto;
  if ((backup.versione ?? 1) >= 3) {
    return { schede: c.schede ?? [], sessioni: c.sessioni ?? [], diete: c.diete ?? [] };
  }
  // versione locale: tabelle relazionali (i PDF della v1 vengono ignorati)
  return convertiDatiLocali(c as Partial<ContenutoLocale>);
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
