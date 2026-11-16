import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { importaJson, scaricaBackup } from '../../db/backup';
import { Header, Pagina } from '../../components/Layout';
import { dimensioneFile } from '../../lib/date';

export default function Impostazioni() {
  const input = useRef<HTMLInputElement>(null);
  const [messaggio, setMessaggio] = useState('');

  const info = useLiveQuery(async () => {
    const stima = await navigator.storage?.estimate?.();
    const persistente = await navigator.storage?.persisted?.();
    return {
      schede: await db.schede.count(),
      sessioni: await db.sessioni.count(),
      diete: await db.diete.count(),
      usato: stima?.usage,
      persistente,
    };
  });

  const importa = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm('Importando il backup TUTTI i dati attuali verranno sostituiti. Continuare?')) return;
    try {
      await importaJson(await f.text());
      setMessaggio('Backup importato correttamente.');
    } catch (e) {
      setMessaggio(`Errore: ${(e as Error).message}`);
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <Header titolo="Impostazioni" indietro="/schede" />
      <Pagina>
        <h3 className="sezione-titolo">Dati</h3>
        <div className="card colonna">
          <div className="muted">
            {info?.schede ?? 0} schede · {info?.sessioni ?? 0} allenamenti registrati · {info?.diete ?? 0} PDF
            {info?.usato !== undefined && ` · ${dimensioneFile(info.usato)} usati`}
          </div>
          <div className="muted piccolo">
            I dati sono salvati solo su questo dispositivo
            {info?.persistente ? ' (archiviazione persistente attiva).' : '.'} Esporta un backup ogni tanto e
            salvalo su File/iCloud.
          </div>
        </div>

        <button className="btn btn-primario btn-blocco" onClick={() => scaricaBackup().catch((e) => setMessaggio(e.message))}>
          Esporta backup
        </button>
        <button className="btn btn-blocco" onClick={() => input.current?.click()}>Importa backup</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => importa(e.target.files?.[0])} />
        {messaggio && <p className="muted">{messaggio}</p>}

        <h3 className="sezione-titolo">Installazione su iPhone</h3>
        <div className="card muted piccolo">
          Apri l'app in Safari → tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>. Usala sempre dall'icona:
          i dati dell'app installata sono separati da quelli di Safari.
        </div>
      </Pagina>
    </>
  );
}
