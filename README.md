# ⚽ Street Soccer 3v3

Calcio 3 contro 3 che gira interamente nel browser: partite lampo da 90 secondi, **supplementari con golden goal**, **calci di rigore in prima persona** e **6 lingue** (Italiano, English, Deutsch, Français, Español, العربية).

## ▶️ Per giocare SUBITO (senza installare niente)

1. Scarica la cartella da GitHub (**Code → Download ZIP**) e decomprimila.
2. Apri con doppio click il file **`APRI-PER-GIOCARE.html`** nel browser (Chrome, Edge, Firefox, Safari).

> ⚠️ **Attenzione**: aprire `index.html` mostra una **pagina bianca**. È normale!
> Quello è il file sorgente che punta al codice TypeScript (`/src/main.tsx`), che il
> browser non sa eseguire. Il gioco vero e proprio, già "compilato" in un unico
> file autonomo, è **`APRI-PER-GIOCARE.html`** — quello va aprire.

Funziona anche offline e su smartphone/tablet: serve internet solo per caricare i font all'inizio
(in mancanza, il gioco usa i font di sistema).

## 🎮 Modalità e comandi

- **PARTITA 90s** — partita completa; in caso di parità: tempi supplementari (golden goal) e poi rigori
- **SOLO RIGORI** — direttamente alla serie dal dischetto (meglio di 5 + morte subita)
- Difficoltà: FACILE / NORMALE / DIFFICILE · Selettore lingua nel menu

| Tasto | Azione |
| --- | --- |
| `WASD` / Frecce | Movimento (nei rigori: mirino / guantone) |
| `Shift` | Scatto |
| `Spazio` | Tiro (rigori: calcia / tuffo) |
| `C` | Passaggio |
| `Q` / `Tab` | Cambia giocatore |
| `Esc` / `P` | Pausa |

Su mobile: joystick a sinistra, pulsanti a destra.

## 🛠️ Per sviluppatori (modificare il gioco)

Richiede [Node.js](https://nodejs.org/) (versione 18+):

```bash
npm install      # installa le dipendenze (solo la prima volta)
npm run dev      # avvia il gioco in sviluppo su http://localhost:5173
npm run build    # genera dist/index.html (file unico con tutto dentro)
```

Per aggiornare il file giocabile dopo una modifica:

```bash
npm run build && cp dist/index.html APRI-PER-GIOCARE.html
```

Tecnologie: React 19 · TypeScript · Vite · Tailwind CSS 4 · Canvas 2D · WebAudio.
