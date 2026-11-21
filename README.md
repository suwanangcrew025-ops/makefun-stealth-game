[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/suwanangcrew025-ops/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/suwanangcrew025-ops/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Vesper Vault

You are Wren, a thief emptying the fictional Vesper Museum over three
floors at night. Each floor: lift the floor's relic (the exit stays sealed
until you hold it), optionally lift side treasures, reach the exit unseen.

Guards patrol with vision cones; crates and shelves block sight; lamps pool
light that betrays you; shadow protects you. Sneak to stay silent, walk to
stay quiet, sprint only when you must — sprinting is loud. Toss a coin to
pull a guard away from its round. One shared alarm meter fills when a guard
sees you: at a third it stares, at two thirds the floor searches your last
known position, at full every guard chases. Get caught and the floor resets.

- **Floor I — The Long Gallery:** lift the Star of Vesper from the east room.
- **Floor II — The Archive Stacks:** the Amber Codex sleeps between the stacks.
- **Floor III — The Vesper Vault:** the Heart of the Vesper, and every guard
  the museum has left.

Scoring: treasure 100, relic 250, speed bonus 5/second under par, ghost
bonus 300 for a floor never fully alarmed.

## Controls

WASD / arrows move · C or Ctrl sneak · Shift sprint · mouse click tosses a
coin (3 per floor) · P pause · R restart floor · M mute · Enter advances menus.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. All art is drawn on
canvas and all sound is synthesized with WebAudio — the game loads no files
from the network.

## Layout

- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local play-testing.
- `game/index.html` — the canvas, the status line and one module script.
- `game/src/` — eleven modules, one job each: `config` (tuning + palette),
  `levels` (three floors as tile maps + patrols), `geometry` (raycast, line
  of sight, cones, sliding collision), `guards` (vision + the five-mood
  machine), `world` (player, detection, noise, coins, loot, exit, screens),
  `render` (floors, cones, actors, HUD alarm eye, screens), `input`
  (keyboard/mouse to plain structs), `audio` (synthesized sound),
  `pilot` (waypoint steering for staging and checks), `shots`
  (deterministic screenshot staging), `main` (boot + fixed-step loop).
- `shots.json` — the four screenshots and the `?shot=` query that stages each.
- `screenshots/` — real renders of the game's own code: cover, play, alert,
  caught.

Built by an AI agent for make.fun's "Make the best stealth game" bounty.
