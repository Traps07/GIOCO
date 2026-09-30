# ⚽ Street Soccer

An arcade football game that runs entirely in your browser. Play with **1–5 outfield players plus one fixed goalkeeper on each team**, enjoy 90-second matches, golden-goal extra time, first-person penalty shootouts, and six interface languages: English, Italian, German, French, Spanish, and Arabic.

## ▶️ Play now

1. Download the repository from GitHub (**Code → Download ZIP**) and extract it.
2. Open **`APRI-PER-GIOCARE.html`** in a browser (Chrome, Edge, Firefox, or Safari).

The single-file game works offline; an internet connection is only needed to load the fonts the first time. `index.html` is the Vite source entry point and should not be opened directly.

## 🎮 Game modes

- **Quick match** — choose **1v1, 2v2, 3v3, 4v4, or 5v5**. Each team always has an additional fixed goalkeeper. A tied match goes to golden-goal extra time and then penalties.
- **Pitch size** — standard dimensions for 1v1 and 2v2; a wider, larger pitch for 3v3, 4v4, and 5v5.
- **Penalty shootout** — jump straight to the spot-kick series.
- **National tournament** — 12 national teams in 4 groups of 3. The top two teams from each group advance to the quarter-finals, followed by the semi-finals and final.
- **Local multiplayer** — one or two people can play on the same keyboard; the number of local players is independent of the on-field team size.
- Choose from 12 national teams with kits inspired by World Cup colours and shirt designs. Three difficulty levels and six languages are available.

The Settings screen lets you mute game audio, remap keyboard controls, choose a match length of **60, 90, 120, or 180 seconds**, and change the interface language. English is the default for a new player profile. Extra time remains 30 seconds.

## ⚽ Possession and actions

Players keep possession after collecting the ball rather than losing it on every touch. Opponents press and attempt tackles, but tackles have a reduced chance of winning the ball. The CPU also makes passes and supports attacks.

- **Pass** — point the movement keys or stick toward a teammate. The game tries to pass to the teammate in that direction, even if they are farther away. If nobody is there, it passes to the nearest teammate. The receiver runs toward the ball.
- **Cross** — send a lofted ball into the box toward teammates in a shooting position.
- **Curl shot** — a powerful curved shot that scores on 95% of uncovered attempts; the goalkeeper or an outfield player can still block its path.
- **Power shot** — a fast, direct strike.
- **Corner kick** — a goalkeeper save can deflect the ball over the goal line for a corner, including in 1v1.
- **Kick-off** — after a goal, the team that conceded starts with possession.

## ⌨️ Default keyboard controls

Every keyboard binding can be changed in **Settings**. These are the defaults:

### One player

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| `Left Shift` | Sprint |
| `Space` | Shoot |
| `C` | Pass |
| `V` | Cross |
| `F` | Curl shot |
| `R` | Power shot |
| `E` | Tackle |
| `Q` | Switch player (2v2 and above) |
| `Esc` | Pause / resume |

### Two players on one keyboard

| Player | Movement | Sprint | Shoot | Pass | Cross | Curl | Power | Tackle | Switch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **P1 · Home** | `W` `A` `S` `D` | `Left Shift` | `Space` | `C` | `V` | `F` | `R` | `E` | `Q` |
| **P2 · Away** | Arrow keys | `Right Shift` | `Enter` | `/` | `M` | `U` | `O` | `I` | `.` |

### Controllers and touch

USB and Bluetooth controllers supported by the browser's Gamepad API work with Xbox, PlayStation, Switch, and generic gamepads. The default layout is: stick/D-pad to move, `A/×` to shoot, `B/○` to pass, `X/□` to cross, `Y/△` to curl, `LB/L1` for a power shot, `RB/R1` to tackle, `RT/R2` to sprint, `LT/L2` or Select to switch players, and Start to pause. Controller bindings are not changed by the keyboard remapping screen.

On mobile, use the on-screen joystick and action buttons. Two-player touch controls use independent joysticks.

## 🛠️ Development

Requires Node.js 18 or later:

```bash
npm install
npm run dev
npm run build
npm test
```

To refresh the standalone game file after making changes:

```bash
npm run build && cp dist/index.html APRI-PER-GIOCARE.html
```

Built with React 19, TypeScript, Vite, Tailwind CSS 4, Canvas 2D, and Web Audio.
