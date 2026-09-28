# ⚽ Street Soccer 3v3

Calcio 3 contro 3 che gira interamente nel browser: partite lampo da 90 secondi, **supplementari con golden goal**, **calci di rigore in prima persona**, **modalità 2 giocatori in locale** e **6 lingue** (Italiano, English, Deutsch, Français, Español, العربية).

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
- **1 GIOCATORE** — guidi la squadra BLU contro la IA. Difficoltà: FACILE / NORMALE / DIFFICILE
- **2 GIOCATORI** — due persone sullo stesso dispositivo, una metà campo ciascuna.
  La difficoltà non si applica: non c'è IA. Selettore lingua nel menu.

### Comandi

| | Giocatore 1 | Giocatore 2 |
| --- | --- | --- |
| Movimento | `WASD` / Frecce | `I` `J` `K` `L` |
| Scatto | `Shift` sinistro | `Shift` destro |
| Tiro | `Spazio` | `Invio` (o `Numpad 0`) |
| Passaggio | `C` | `M` (o `Numpad 2`) |
| Cambia giocatore | `Q` / `Tab` | `,` (o `Numpad 3`) |
| Nei rigori | mira / guantone | mira / guantone |

Pausa: `Esc` / `P` (vale per entrambi).

Le due tastiere sono completamente disgiunte: le mani non si pestano i piedi.
Ogni giocatore comanda un calciatore della propria squadra, gli altri due proseguono da soli.

Su mobile: joystick a sinistra e pulsanti a destra. In 2 giocatori lo schermo si divide
a metà — P1 a sinistra, P2 a destra, ciascuno con joystick e pulsanti nel proprio mezzo.

## 🛠️ Per sviluppatori (modificare il gioco)

Richiede [Node.js](https://nodejs.org/) (versione 18+):

```bash
npm install      # installa le dipendenze (solo la prima volta)
npm run dev      # avvia il gioco in sviluppo su http://localhost:5173
npm run build    # genera dist/index.html (file unico con tutto dentro)
npm test         # gira i test headless del motore (input 1P/2P e ciclo partita)
```

I test in `test-2p.mjs` e `test-soak.mjs` esercitano il motore vero in Node, con
canvas e audio finti: verificano che P1 e P2 restino indipendenti, che i tasti di
P2 restino inerti in 1 giocatore e che una partita 2 giocatori arrivi al fischio
finale senza incasinarsi.

Per aggiornare il file giocabile dopo una modifica:

```bash
npm run build && cp dist/index.html APRI-PER-GIOCARE.html
```

Tecnologie: React 19 · TypeScript · Vite · Tailwind CSS 4 · Canvas 2D · WebAudio.
