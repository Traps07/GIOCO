# ⚽ Street Soccer

Calcio arcade nel browser con **da 1 a 5 giocatori di movimento più un portiere fisso per squadra**, partite da 90 secondi, **supplementari con golden goal**, **rigori in prima persona** e **6 lingue** (italiano, inglese, tedesco, francese, spagnolo e arabo).

## ▶️ Per giocare subito

1. Scarica la cartella da GitHub (**Code → Download ZIP**) e decomprimila.
2. Apri **`APRI-PER-GIOCARE.html`** nel browser (Chrome, Edge, Firefox o Safari).

Il file è autonomo e funziona offline; internet serve solo per caricare i font al primo avvio. `index.html` è invece il sorgente Vite e non è il file da aprire direttamente.

## 🎮 Modalità

- **PARTITA 90s** — scegli **1v1, 2v2, 3v3, 4v4 o 5v5**; il portiere è sempre aggiuntivo e fisso. In caso di parità: supplementari e poi rigori.
- **SOLO RIGORI** — vai direttamente alla serie dal dischetto.
- **TORNEO NAZIONALE** — 12 nazionali, 4 gruppi da 3, prime due ai quarti, poi semifinali e finale. Le partite del giocatore usano il formato selezionato.
- **1 o 2 giocatori locali** — la scelta degli utenti è indipendente dal formato delle squadre.
- Selezione di 12 nazionali con kit ispirati a colori e motivi delle maglie da Mondiale; tre livelli di difficoltà e sei lingue.

## ⚽ Possesso e azioni

I giocatori **controllano la palla quando la raccolgono**: non rimbalza via a ogni contatto. Gli avversari pressano e tentano contrasti; un contrasto riuscito strappa il possesso, mentre quello fallito può lasciare la palla contesa. La CPU tenta i contrasti automaticamente; in locale si può intervenire con il comando dedicato.

- **Passaggio**: serve a liberare un compagno e cambiare lato; il ricevente controllato viene selezionato automaticamente.
- **Cross**: pallone alto indirizzato verso l’area e i compagni in posizione da tiro.
- **Tiro a giro**: conclusione volutamente molto potente e con una curva accentuata.
- **Tiro di potenza**: conclusione dritta e rapidissima.
- **Calcio d’angolo**: una parata del portiere può deviare il pallone oltre la linea di fondo e assegnare un corner alla squadra avversaria. I corner non vengono assegnati nel formato 1v1.

## ⌨️ Comandi

In modalità **1 giocatore**:

| Tasto | Azione |
| --- | --- |
| `WASD` / Frecce | Movimento |
| `Shift` | Scatto |
| `Spazio` | Tiro |
| `C` | Passaggio |
| `V` | Cross |
| `F` | Tiro a giro |
| `R` | Tiro di potenza |
| `E` | Contrasto |
| `Q` / `Tab` | Cambia giocatore, solo dal 2v2 in su |
| `Esc` / `P` | Pausa |

In modalità **2 giocatori** (anche ai rigori):

| Giocatore | Movimento | Scatto | Tiro | Passaggio | Cross | Giro | Potenza | Contrasto | Cambio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **P1 · casa** | `WASD` | `Shift` sinistro | `Spazio` | `C` | `V` | `F` | `R` | `E` | `Q` / `Tab` |
| **P2 · ospiti** | `↑ ↓ ← →` | `Shift` destro | `Invio` | `/` | `M` | `U` | `O` | `I` | `.` |

Il cambio giocatore è disattivato in 1v1: ciascuno controlla l’unico giocatore di movimento della propria squadra. Su mobile sono disponibili joystick e pulsanti touch per passaggio, cross, tiro a giro, tiro di potenza e contrasto.

Durante i rigori, movimento e azione servono a mirare/calciare o a spostare il guantone e tuffarsi.

## 🛠️ Sviluppo

Richiede Node.js 18 o superiore:

```bash
npm install
npm run dev
npm run build
```

Per aggiornare il file giocabile autonomo dopo una modifica:

```bash
npm run build && cp dist/index.html APRI-PER-GIOCARE.html
```

Tecnologie: React 19 · TypeScript · Vite · Tailwind CSS 4 · Canvas 2D · WebAudio.
