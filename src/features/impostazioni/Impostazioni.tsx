import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { importaJson, preparaBackup, salvaFile } from "../../db/backup";
import { Header, Pagina } from "../../components/Layout";
import { dimensioneFile, formatta, isoGiorno } from "../../lib/date";
import {
  frequenzaBackup,
  giorniDa,
  impostaFrequenza,
  registraBackup,
  ultimoBackup,
  useLocalStorage,
} from "../../lib/promemoria";

const FREQUENZE = [
  { giorni: 3, etichetta: "Ogni 3 giorni" },
  { giorni: 7, etichetta: "Ogni settimana" },
  { giorni: 14, etichetta: "Ogni 2 settimane" },
  { giorni: 30, etichetta: "Ogni mese" },
  { giorni: 0, etichetta: "Mai (disattivato)" },
];

export default function Impostazioni() {
  const input = useRef<HTMLInputElement>(null);
  const [messaggio, setMessaggio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preparazione, setPreparazione] = useState(false);
  const [spazio, setSpazio] = useState<{
    usato?: number;
    persistente?: boolean;
  }>({});
  const ultimo = useLocalStorage(ultimoBackup);
  const frequenza = useLocalStorage(frequenzaBackup);

  // solo query Dexie dentro useLiveQuery (le API esterne vanno fuori)
  const conteggi = useLiveQuery(async () => ({
    schede: await db.schede.count(),
    sessioni: await db.sessioni.count(),
    diete: await db.diete.count(),
  }));

  useEffect(() => {
    (async () => {
      const stima = await navigator.storage
        ?.estimate?.()
        .catch(() => undefined);
      const persistente = await navigator.storage
        ?.persisted?.()
        .catch(() => undefined);
      setSpazio({ usato: stima?.usage, persistente });
    })();
  }, [conteggi]);

  // 1° tocco: prepara il file (lettura del database)
  const prepara = async () => {
    setMessaggio("");
    setPreparazione(true);
    try {
      setFile(await preparaBackup());
    } catch (e) {
      setMessaggio(`Errore: ${(e as Error).message}`);
    } finally {
      setPreparazione(false);
    }
  };

  // 2° tocco: apre subito il foglio di condivisione (Safari lo richiede)
  const salva = async () => {
    if (!file) return;
    if (await salvaFile(file)) {
      registraBackup();
      setFile(null);
      setMessaggio(
        "Backup esportato. Controlla che sia stato salvato nella cartella scelta.",
      );
    }
  };

  const importa = async (f: File | undefined) => {
    if (!f) return;
    if (
      !confirm(
        "Importando il backup TUTTI i dati attuali verranno sostituiti. Continuare?",
      )
    ) {
      if (input.current) input.current.value = "";
      return;
    }
    try {
      await importaJson(await f.text());
      setMessaggio("Backup importato correttamente.");
    } catch (e) {
      setMessaggio(`Errore: ${(e as Error).message}`);
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  const giorni = ultimo ? giorniDa(ultimo) : null;

  return (
    <>
      <Header titolo="Impostazioni" indietro="/schede" />
      <Pagina>
        <h3 className="sezione-titolo">Dati</h3>
        <div className="card colonna">
          <div className="muted">
            {conteggi?.schede ?? 0} schede · {conteggi?.sessioni ?? 0}{" "}
            allenamenti registrati · {conteggi?.diete ?? 0} diete
            {spazio.usato !== undefined &&
              ` · ${dimensioneFile(spazio.usato)} usati`}
          </div>
          <div className="muted piccolo">
            I dati sono salvati solo su questo dispositivo
            {spazio.persistente
              ? " (archiviazione persistente attiva)."
              : "."}{" "}
            Esporta un backup regolarmente.
          </div>
        </div>

        <h3 className="sezione-titolo">Backup</h3>
        <div className="card colonna" style={{ gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              Ultimo backup:{" "}
              {giorni === null
                ? "mai"
                : giorni === 0
                  ? "oggi"
                  : `${formatta(isoGiorno(new Date(ultimo)))} (${giorni} giorn${giorni === 1 ? "o" : "i"} fa)`}
            </div>
            <div className="muted piccolo">
              Per salvarlo su Google Drive: tocca <b>Salva backup</b> →{" "}
              <b>Salva su File</b> → <b>Drive</b> (serve l'app Google Drive
              installata).
            </div>
          </div>
          {file ? (
            <button className="btn btn-primario btn-blocco" onClick={salva}>
              Salva backup ({dimensioneFile(file.size)})
            </button>
          ) : (
            <button
              className="btn btn-primario btn-blocco"
              onClick={prepara}
              disabled={preparazione}
            >
              {preparazione ? "Preparazione…" : "Esporta backup"}
            </button>
          )}
          <button
            className="btn btn-blocco"
            onClick={() => input.current?.click()}
          >
            Importa backup
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => importa(e.target.files?.[0])}
          />
          {messaggio && (
            <p className="muted" style={{ margin: 0 }}>
              {messaggio}
            </p>
          )}
          <label className="campo">
            Promemoria backup
            <select
              value={frequenza}
              onChange={(e) => impostaFrequenza(Number(e.target.value))}
            >
              {FREQUENZE.map((f) => (
                <option key={f.giorni} value={f.giorni}>
                  {f.etichetta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <h3 className="sezione-titolo">Installazione su iPhone</h3>
        <div className="card muted piccolo">
          Apri l'app in Safari → tocca <b>Condividi</b> →{" "}
          <b>Aggiungi alla schermata Home</b>. Usala sempre dall'icona: i dati
          dell'app installata sono separati da quelli di Safari. Se rimuovi
          l'icona, i dati vengono cancellati: prima esporta un backup.
        </div>
      </Pagina>
    </>
  );
}
