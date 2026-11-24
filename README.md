# MyGym

PWA per iPhone: schede di allenamento, calendario con serie/ripetizioni/kg, grafici dei progressi e diete con pasti, alimenti e macro.
I dati sono salvati su **Firebase** (Firestore) e legati al tuo account: si sincronizzano da soli tra i dispositivi e l'app funziona anche **offline** (le modifiche partono appena torna la connessione).

> La versione precedente, con i dati solo sul dispositivo, è sul branch `v1` (tag `v1.1.0`).

## Comandi

```bash
npm install          # dipendenze
npm run dev          # sviluppo su http://localhost:5173 (progetto Firebase reale)
npm run dev:emulatori  # sviluppo con gli emulatori locali (firebase emulators:start --project demo-mygym)
npm test             # test (calcoli, dieta, migrazione, backup)
npm run build        # build di produzione in dist/
npm run preview      # anteprima della build
npm run icons        # rigenera le icone da public/favicon.svg
```

## Pubblicazione e installazione su iPhone

L'app è pubblicata su **GitHub Pages**: <https://alemozzoni.github.io/MyGym/>

- Ogni push su `main` avvia `.github/workflows/deploy.yml`, che esegue i test, compila e pubblica.
- Sull'iPhone: apri il link in **Safari** → *Condividi* → *Aggiungi alla schermata Home*.
- Gli aggiornamenti arrivano da soli: quando una nuova versione è pronta compare il banner *Nuova versione disponibile → Aggiorna*.

### Firebase
- Configurazione web in `src/firebase-config.ts` (non è segreta: i dati sono protetti dalle regole).
- Regole di sicurezza in `firestore.rules`: ogni utente legge e scrive solo `utenti/{uid}/…`.
- Accesso con email e password (Authentication → Email/Password); il dominio `alemozzoni.github.io` deve essere tra i domini autorizzati.

### Protezione dei dati
- **Sincronizzazione**: ogni modifica viene salvata subito in locale e inviata al cloud; gli altri dispositivi la ricevono in tempo reale.
- **Migrazione**: al primo accesso, se sul dispositivo ci sono i dati della versione locale, compare *Ci sono dati salvati su questo dispositivo → Importa*. Si possono importare anche i vecchi file di backup da *Impostazioni*.
- **Bozze automatiche**: l'allenamento che stai compilando viene salvato a ogni modifica; se iOS chiude l'app compare *Hai un allenamento non salvato → Riprendi*.

## Struttura

- `src/db/` – Firebase (`firebase.ts`), dati in tempo reale (`dati.tsx`), scritture (`repo.ts`), tipi, backup JSON, lettura dei dati locali v1 (`locale.ts`)
- `src/lib/calcoli.ts` – 1RM stimato (Epley), volume, rilevamento progresso/stallo/calo
- `src/lib/modello.ts`, `dieta.ts`, `migrazione.ts` – logica pura (ultime prestazioni, totali macro, conversione dei dati locali)
- `src/lib/promemoria.ts` – bozze degli allenamenti (localStorage)
- `src/features/` – accesso, schede, calendario/sessioni, progressi, diete, impostazioni

## Licenza

Distribuito con licenza [MIT](LICENSE).
