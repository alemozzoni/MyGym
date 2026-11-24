import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../db/firebase";

// messaggi comprensibili per gli errori più comuni di Firebase Auth
const ERRORI: Record<string, string> = {
  "auth/invalid-credential": "Email o password non corretti.",
  "auth/invalid-email": "Indirizzo email non valido.",
  "auth/email-already-in-use": "Esiste già un account con questa email: accedi.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/too-many-requests": "Troppi tentativi: riprova tra qualche minuto.",
  "auth/network-request-failed": "Nessuna connessione: per il primo accesso serve internet.",
};
const messaggioErrore = (e: unknown) =>
  ERRORI[(e as { code?: string }).code ?? ""] ?? (e as Error).message;

/** Accesso con email e password (il metodo più affidabile in una PWA su iPhone) */
export default function Accesso() {
  const [modo, setModo] = useState<"accedi" | "registrati">("accedi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [attesa, setAttesa] = useState(false);

  const invia = async (e: FormEvent) => {
    e.preventDefault();
    // chiude la tastiera PRIMA di entrare nell'app: su iPhone, se si chiude
    // mentre la pagina cambia, la barra in basso resta posizionata troppo in alto
    (document.activeElement as HTMLElement | null)?.blur();
    setMessaggio("");
    setAttesa(true);
    try {
      if (modo === "accedi")
        await signInWithEmailAndPassword(auth, email.trim(), password);
      else await createUserWithEmailAndPassword(auth, email.trim(), password);
      // l'app si apre da sola quando cambia lo stato dell'accesso
    } catch (err) {
      setMessaggio(messaggioErrore(err));
    } finally {
      setAttesa(false);
    }
  };

  const recupera = async () => {
    if (!email.trim()) return setMessaggio("Scrivi prima la tua email.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessaggio("Ti ho inviato un'email per reimpostare la password.");
    } catch (err) {
      setMessaggio(messaggioErrore(err));
    }
  };

  return (
    <main className="contenuto accesso">
      <div style={{ textAlign: "center" }}>
        <img src="icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 16 }} />
        <h1 style={{ fontSize: 26, marginTop: 8 }}>MyGym</h1>
        <p className="muted">
          I tuoi allenamenti e le tue diete, sincronizzati su tutti i dispositivi.
        </p>
      </div>
      <div className="segmenti">
        <button className={modo === "accedi" ? "attivo" : ""} onClick={() => setModo("accedi")}>
          Accedi
        </button>
        <button className={modo === "registrati" ? "attivo" : ""} onClick={() => setModo("registrati")}>
          Crea account
        </button>
      </div>
      <form className="card colonna" style={{ gap: 12 }} onSubmit={invia}>
        <label className="campo">
          Email
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="campo">
          Password
          <input
            type="password"
            autoComplete={modo === "accedi" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn btn-primario btn-blocco"
          disabled={attesa || !email.trim() || !password}
        >
          {attesa ? "Attendere…" : modo === "accedi" ? "Accedi" : "Crea account"}
        </button>
        {modo === "accedi" && (
          <button type="button" className="btn-icona" onClick={recupera}>
            Password dimenticata?
          </button>
        )}
        {messaggio && <p className="muted" style={{ margin: 0 }}>{messaggio}</p>}
      </form>
    </main>
  );
}
