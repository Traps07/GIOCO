# ⚽ Street Soccer

An arcade football game that runs entirely in your browser. Play with **1–5 outfield players plus one fixed goalkeeper on each team**, choose between **225 national teams from every confederation on Earth**, enjoy 90-second matches, golden-goal extra time, first-person penalty shootouts, build **fully custom tournaments** from groups to knock-out brackets, and use the interface in six languages: English, Italian, German, French, Spanish, and Arabic.

## ▶️ Play now

1. Download the repository from GitHub (**Code → Download ZIP**) and extract it.
2. Open **`APRI-PER-GIOCARE.html`** in a browser (Chrome, Edge, Firefox, or Safari).

The single-file game works offline; an internet connection is only needed to load the fonts the first time. `index.html` is the Vite source entry point and should not be opened directly.

## 🎮 Game modes

- **Quick match** — choose **1v1, 2v2, 3v3, 4v4, or 5v5**. Each team always has an additional fixed goalkeeper. A tied match goes to golden-goal extra time and then penalties.
- **Pitch size** — standard dimensions for 1v1 and 2v2; a wider, larger pitch for 3v3, 4v4, and 5v5.
- **Penalty shootout** — jump straight to the spot-kick series.
- **National tournament** — a full tournament builder, not a fixed bracket. Pick the format (**groups + knock-out cup, groups only, round-robin league, or single knock-out**), the number of participants from **4 to 64**, the group size (2–6), how many teams qualify (1–3), a third-place play-off, golden-goal extra time, penalty shoot-outs, seeding (random, seeded pots, or serpentine), upset frequency, and how many group matchdays to play. Participants are drawn from a pool you filter by confederation and by merit tier, or hand-picked one by one. Ten ready-made presets reproduce the real formats: 48-team and 32-team World Cup, Euro, Copa América, Africa Cup of Nations, Asian Cup, Oceanian Cup, a minor-nations cup, a world league, and a straight knock-out. Byes, uneven groups, and truncated calendars are all handled, and every match you do not play is simulated from the teams' coefficients.
- **225 national teams** — every FIFA member association plus the UN and associate states without a national side (Monaco, Tuvalu, Kiribati, Nauru, Vatican City, Réunion, Zanzibar, Guam, …), split into **UEFA, CONMEBOL, CONCACAF, CAF, AFC, and OFC** and into five merit tiers. Each team wears a kit inspired by its real shirt; nations without a professional side get a kit built from their **flag** instead, and the team card labels which of the two you are looking at. Clashing colours are resolved automatically: the away team switches to a generated second kit.
- **Local multiplayer** — one or two people can play on the same keyboard; the number of local players is independent of the on-field team size.

Three difficulty levels and six languages are available, with every nation's name localised in all six.

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

`npm test` runs the whole suite: two-player input handling, the nation database (`test:nations`), server-side rendering of every screen in all six languages (`test:ui`), the tournament engine (`test:tournament`, 120 configuration permutations plus all presets), a gameplay simulation, and a full match loop soak test.

To refresh the standalone game file after making changes:

```bash
npm run build && cp dist/index.html APRI-PER-GIOCARE.html
```

Built with React 19, TypeScript, Vite, Tailwind CSS 4, Canvas 2D, and Web Audio.
