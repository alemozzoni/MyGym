import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "../firebase-config";

// In sviluppo (`npm run dev:emulatori`) si usano gli emulatori locali di Firebase:
// nessun dato reale viene toccato.
const emulatori = import.meta.env.VITE_EMULATORI === "1";

export const app = initializeApp(
  emulatori
    ? { apiKey: "demo", authDomain: "localhost", projectId: "demo-mygym" }
    : firebaseConfig,
);
export const auth = getAuth(app);

// Cache persistente in IndexedDB: l'app funziona offline (es. in palestra senza campo)
// e le modifiche vengono inviate da sole quando torna la connessione.
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  // i campi facoltativi lasciati vuoti (undefined) vengono semplicemente omessi
  ignoreUndefinedProperties: true,
});

if (emulatori) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
}
