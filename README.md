# MyGym

PWA per iPhone: schede di allenamento, calendario con serie/ripetizioni/kg, grafici dei progressi e PDF delle diete.
I dati restano **solo sul dispositivo** (IndexedDB). Usa *Impostazioni → Esporta backup* periodicamente.

## Comandi

```bash
npm install          # dipendenze
npm run dev          # sviluppo su http://localhost:5173
npm test             # test (calcoli, backup, repository)
npm run build        # build di produzione in dist/
npm run preview      # anteprima della build
npm run icons        # rigenera le icone da public/favicon.svg
```

## Pubblicazione e installazione su iPhone

L'app è pubblicata su **GitHub Pages**: <https://alemozzoni.github.io/MyGym/>

- Ogni push su `main` avvia `.github/workflows/deploy.yml`, che esegue i test, compila e pubblica.
- Sull'iPhone: apri il link in **Safari** → *Condividi* → *Aggiungi alla schermata Home*.
- Gli aggiornamenti arrivano da soli: quando una nuova versione è pronta compare il banner *Nuova versione disponibile → Aggiorna*.

> Usa l'app sempre dall'icona in Home. Rimuovere l'icona cancella anche i dati: prima esporta un backup.
> Per salvare il backup su Google Drive: *Impostazioni* → *Esporta backup* → *Salva backup* → *Salva su File* → *Drive*.

### Protezione dei dati
- **Promemoria backup**: avviso quando l'ultimo backup è più vecchio della frequenza scelta in Impostazioni (predefinita: 7 giorni).
- **Bozze automatiche**: l'allenamento che stai compilando viene salvato a ogni modifica; se iOS chiude l'app compare *Hai un allenamento non salvato → Riprendi*.

## Struttura

- `src/db/` – schema Dexie, operazioni (`repo.ts`), backup JSON
- `src/lib/calcoli.ts` – 1RM stimato (Epley), volume, rilevamento progresso/stallo/calo
- `src/lib/promemoria.ts` – promemoria backup e bozze (localStorage)
- `src/features/` – schede, calendario/sessioni, progressi, diete, impostazioni
