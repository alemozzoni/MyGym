import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../db/firebase";
import { useDati, useUtente } from "../../db/dati";
import { leggiBackup, preparaBackup, salvaFile } from "../../db/backup";
import { importaDati } from "../../db/repo";
import { Header, Pagina } from "../../components/Layout";
import { dimensioneFile } from "../../lib/date";

export default function Impostazioni() {
  const utente = useUtente();
  const dati = useDati()!;
  const input = useRef<HTMLInputElement>(null);
  const [messaggio, setMessaggio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const aggiorna = () => setOnline(navigator.onLine);
    window.addEventListener("online", aggiorna);
    window.addEventListener("offline", aggiorna);
    return () => {
      window.removeEventListener("online", aggiorna);
      window.removeEventListener("offline", aggiorna);
    };
  }, []);

  /** Esegue un'importazione mostrando l'esito */
  const esegui = async (f: () => Promise<void>, ok: string) => {
    setMessaggio("");
    setInCorso(true);
    try {
      await f();
      setMessaggio(ok);
    } catch (e) {
      setMessaggio(`Errore: ${(e as Error).message}`);
    } finally {
      setInCorso(false);
    }
  };

  const importaFile = async (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f) return;
    const sostituisci = confirm(
      "Vuoi SOSTITUIRE tutti i dati attuali con quelli del file?\n\nOK = sostituisci · Annulla = aggiungi ai dati attuali",
    );
    await esegui(async () => {
      await importaDati(leggiBackup(await f.text()), dati, sostituisci);
    }, "Backup importato correttamente.");
  };

  // 2° tocco: apre subito il foglio di condivisione (Safari lo richiede)
  const salva = async () => {
    if (file && (await salvaFile(file))) {
      setFile(null);
      setMessaggio("Copia esportata.");
    }
  };

  return (
    <>
      <Header titolo="Impostazioni" indietro="/schede" />
      <Pagina>
        <h3 className="sezione-titolo">Account</h3>
        <div className="card colonna">
          <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
            {utente?.email}
          </div>
          <div className="muted piccolo">
            {online
              ? "Online: le modifiche vengono salvate nel cloud in tempo reale."
              : "Offline: le modifiche sono salvate sul dispositivo e verranno sincronizzate appena torna la connessione."}
          </div>
          <div className="muted">
            {dati.schede.length} schede · {dati.sessioni.length} allenamenti
            registrati · {dati.diete.length} diete
          </div>
          <button
            className="btn btn-pericolo"
            onClick={() =>
              confirm(
                online
                  ? "Uscire dall'account?"
                  : "Sei offline: le modifiche non ancora sincronizzate andrebbero perse. Uscire comunque?",
              ) && signOut(auth)
            }
          >
            Esci
          </button>
        </div>

        <h3 className="sezione-titolo">Copia di sicurezza (facoltativa)</h3>
        <div className="card colonna" style={{ gap: 12 }}>
          <div className="muted piccolo">
            I dati sono già salvati nel tuo account: la copia in un file serve
            solo se vuoi un archivio personale.
          </div>
          {file ? (
            <button className="btn btn-primario btn-blocco" onClick={salva}>
              Salva copia ({dimensioneFile(file.size)})
            </button>
          ) : (
            <button
              className="btn btn-blocco"
              onClick={() => setFile(preparaBackup(dati))}
            >
              Esporta copia JSON
            </button>
          )}
          <button
            className="btn btn-blocco"
            disabled={inCorso || !online}
            onClick={() => input.current?.click()}
          >
            Importa da file
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => importaFile(e.target.files?.[0])}
          />
          {inCorso && <p className="muted" style={{ margin: 0 }}>Importazione…</p>}
          {messaggio && (
            <p className="muted" style={{ margin: 0 }}>
              {messaggio}
            </p>
          )}
        </div>

        <h3 className="sezione-titolo">Installazione su iPhone</h3>
        <div className="card muted piccolo">
          Apri l'app in Safari → tocca <b>Condividi</b> →{" "}
          <b>Aggiungi alla schermata Home</b>. I dati sono legati al tuo
          account: puoi usare l'app anche su altri dispositivi accedendo con la
          stessa email.
        </div>
      </Pagina>
    </>
  );
}
