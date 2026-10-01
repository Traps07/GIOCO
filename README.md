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
- **Survival** — an endless ladder of 60-second rounds, one player only. The first goal of a round decides it: score (or hold the draw to the whistle) and the next nation walks on; concede once and the run is over. Extra time and penalties are switched off, so every round is sudden death. Nothing is chosen by hand except your own team: opponents come off a strength ladder that starts with the weakest nation in the world, climbs through the 225 teams and then rotates the top 20, difficulty steps up on its own (two rounds per tier, from the level you left in the menu up to **Extreme**), the CPU gains +2.5% per round survived (capped at +30%, keepers included), and your longest streak is kept on the device (`ss3v3-survival-best`) and shown in the menu. The round number sits under the clock, and the final screen tells you where you fell and whether it was a record.
- **National tournament** — a full tournament builder, not a fixed bracket. Pick the format (**groups + knock-out cup, groups only, round-robin league, or single knock-out**), the number of participants from **4 to 64**, the group size (2–6), how many teams qualify (1–3), a third-place play-off, golden-goal extra time, penalty shoot-outs, seeding (random, seeded pots, or serpentine), upset frequency, and how many group matchdays to play. Participants are drawn from a pool you filter by confederation and by merit tier, or hand-picked one by one. Ten ready-made presets reproduce the real formats: 48-team and 32-team World Cup, Euro, Copa América, Africa Cup of Nations, Asian Cup, Oceanian Cup, a minor-nations cup, a world league, and a straight knock-out. Byes, uneven groups, and truncated calendars are all handled, and every match you do not play is simulated from the teams' coefficients. **The tournament saves itself**: leave for the menu (or close the tab) and the saved bracket appears on the main menu with a *Resume* button — plus a discard button if you want to start clean.
- **225 national teams** — every FIFA member association plus the UN and associate states without a national side (Monaco, Tuvalu, Kiribati, Nauru, Vatican City, Réunion, Zanzibar, Guam, …), split into **UEFA, CONMEBOL, CONCACAF, CAF, AFC, and OFC** and into five merit tiers. Each team wears a kit inspired by its real shirt; nations without a professional side get a kit built from their **flag** instead, and the team card labels which of the two you are looking at. Clashing colours are resolved automatically: the away team switches to a generated second kit.
- **Local multiplayer** — one or two people can play on the same keyboard; the number of local players is independent of the on-field team size.

Four difficulty levels and six languages are available, with every nation's name localised in all six.

| Difficulty | AI speed | Shot range | Shot / pass error | Decision time | Keeper reads penalties | Through balls |
| --- | --- | --- | --- | --- | --- | --- |
| Easy | 218 | 300 | 0.17 / 0.24 | 0.85 s | 20% | 10% |
| Normal | 252 | 385 | 0.10 / 0.14 | 0.50 s | 32% | 24% |
| Hard | 284 | 450 | 0.055 / 0.08 | 0.30 s | 45% | 40% |
| **Extreme** | 316 | 520 | 0.030 / 0.045 | 0.16 s | 56% | 55% |

**Extreme** is the wall: its giveaway passes and mistimed strikes are cut roughly in half again, it dives on your penalty before you have finished the run-up more than half the time, it slips a through ball in on 55% of the passes it plays, and your own aim on the spot wobbles 32% more than at Normal. The level is available in quick matches and in the custom tournament builder, and it is the ceiling the survival ladder climbs to.

The Settings screen lets you mute game audio, remap keyboard controls, choose a match length of **60, 90, 120, or 180 seconds**, and change the interface language. English is the default for a new player profile. Extra time remains 30 seconds.

## ⭐ Star ratings and shirt numbers

Every nation carries a merit tier from one to five stars. The tier is not decorative: it drives a coefficient (20–99) that the match engine reads, so **Brazil really is faster, stronger and more precise than Bolivia**.

| What the rating changes | Effect of a 5★ side and a 1★ side compared with an average nation |
| --- | --- |
| Sprint and run speed | ±9% for the player you control, ±20% for CPU units |
| Shot power and shooting range | ±15% on every strike, and the AI attacks from further out |
| Passing and shooting error | ±20% for the human, ±22% for the AI: a weak side sprays the last ball |
| Duels | ±18% on tackle odds per side: a big tier gap swings duels by up to ~44% |
| Goalkeeper | ±13% on tracking speed and on reading penalty kicks |

The team-select screen shows a strength bar and the raw coefficient for both sides, so you can pick a giant or take a minor nation up against the world.

Shirt numbers are fixed to the classic arcade sequence: **the player you control always wears 10**, then 9, 11, 7 and 8 fill the rest of the formation — 10 alone in 1v1, 10 and 9 in 2v2, 10-9-11 in 3v3, 10-9-11-7 in 4v4, and 10-9-11-7-8 in 5v5. In two-player mode both humans get the 10; the CPU side numbers itself in formation order.

## ⚽ Possession and actions

Players keep possession after collecting the ball rather than losing it on every touch. Opponents press and attempt tackles, but tackles have a reduced chance of winning the ball. The CPU also makes passes and supports attacks.

- **Pass** — point the movement keys or stick toward a teammate. The game tries to pass to the teammate in that direction, even if they are farther away. If nobody is there, it passes to the nearest teammate. The receiver runs toward the ball.
- **Through ball** (`B` / `P` / `LT`) — a firm, low ball played into the space *ahead* of a teammate. The game only picks a target that is running forward with field behind the defensive line and a lane that is not fully blocked; when the closest defender is standing on the line, it degrades into a safe short pass instead of giving the ball away. Control switches to the runner, who keeps attacking the space for a moment: on hard the CPU uses the same read on 40% of its passes.
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
| `B` | Through ball |
| `V` | Cross |
| `F` | Curl shot |
| `R` | Power shot |
| `E` | Tackle |
| `Q` | Switch player (2v2 and above) |
| `Esc` | Pause / resume |

### Two players on one keyboard

| Player | Movement | Sprint | Shoot | Pass | Through | Cross | Curl | Power | Tackle | Switch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **P1 · Home** | `W` `A` `S` `D` | `Left Shift` | `Space` | `C` | `B` | `V` | `F` | `R` | `E` | `Q` |
| **P2 · Away** | Arrow keys | `Right Shift` | `Enter` | `/` | `P` | `M` | `U` | `O` | `I` | `.` |

### Controllers and touch

USB and Bluetooth controllers supported by the browser's Gamepad API work with Xbox, PlayStation, Switch, and generic gamepads. The default layout is: stick/D-pad to move, `A/×` to shoot, `B/○` to pass, `LT/L2` for the through ball, `X/□` to cross, `Y/△` to curl, `LB/L1` for a power shot, `RB/R1` to tackle, `RT/R2` to sprint, `Select` or `L3` to switch players, and Start to pause. Controller bindings are not changed by the keyboard remapping screen.

On mobile, use the on-screen joystick and action buttons — the through ball has its own `THROUGH` button in the mini-button cluster. Two-player touch controls use independent joysticks.

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
