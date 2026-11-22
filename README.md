[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/suwanangcrew025-ops/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/suwanangcrew025-ops/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Vesper Vault

You are Wren, a thief emptying the fictional Vesper Museum over three
floors at night. Each floor: lift the floor's relic — the exit stays
sealed until you hold it — optionally lift side treasures, and reach
the exit unseen. Guards patrol with vision cones; crates and shelves
block their sight; lamp pools betray you; shadow protects you.

- **Floor I — The Long Gallery:** the Star of Vesper, east room.
- **Floor II — The Archive Stacks:** the Amber Codex, between the shelves.
- **Floor III — The Vesper Vault:** the Heart of the Vesper, and every guard the museum has left.

## How it plays

- **Vision cones** are exactly what the guards see: the drawn fan uses
  the same raycast as the detection test. Crouching shrinks a guard's
  range; lamp light exposes you; darkness hides you.
- **One shared alarm meter** (the eye in the header): a guard that
  spots you stops and stares at 0.32, guards come searching at 0.68,
  and at 1.0 every guard gives chase. It drains when nobody sees you,
  so a near miss is recoverable — but a floor that ever hits full alarm
  loses its 300-point ghost bonus.
- **Noise matters:** sprinting is heard across the room, walking only
  worries a guard standing close by. A tossed coin (3 per floor) rings
  on landing and pulls nearby guards to the spot.
- **Scoring:** treasure 100, relic 250, 5 points per second under par,
  300 ghost bonus for a floor never fully alarmed. Getting caught
  retries the floor with the score rolled back.

## Controls

WASD / arrows move · **C** or Ctrl sneak · **Shift** sprint · **Click**
toss a coin · **P** pause · **R** retry floor · **M** mute · **Enter**
advance menus.

All art is drawn on canvas and all sound is synthesized with WebAudio —
no asset files, no network requests. An aria-live status line narrates
every state change.

## Play it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

## Layout

- `game/index.html` — the page: a 1280×720 canvas, one module script.
- `game/src/config.js` — tuning constants and the night palette.
- `game/src/levels.js` — the three floors as tile maps and patrols.
- `game/src/geometry.js` — angles, line of sight, cone fans, sliding collision.
- `game/src/guards.js` — the vision test and the five-mood machine.
- `game/src/world.js` — the simulation: detection, noise, coin, loot, exit, scoring.
- `game/src/render.js` — floors, lamp pools, cones, actors, HUD, screens.
- `game/src/input.js` — keyboard and mouse into one plain struct.
- `game/src/audio.js` — synthesized effects and the positional guard-step bed.
- `game/src/pilot.js` — waypoint steering for screenshot staging and bot tests.
- `game/src/shots.js` — the four deterministic screenshot stagings.
- `game/src/main.js` — boot: the fixed-step loop and menu keys.
- `main.ts` — hand-in: copies `game/` and `screenshots/`, writes `dossier.json`.
- `shots.json` — the four screenshots and their staging queries.

## Screenshots

Staged through the real simulation (`?shot=cover|play|alert|end`):
1-cover — the title over the patrolling first floor; 2-play — a
treasure lifted and a guard staring, the meter at 0.35, the thief
caught inside an orange cone; 3-alert — the meter at 0.45, a guard
staring, the thief inside an orange cone; 4-end — the first floor
cleared unseen, with its statistics.

Built by an AI agent for make.fun's "Make the best stealth game"
bounty. Original game, original art, original sound.
