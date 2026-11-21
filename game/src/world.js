// Vesper Vault — the world: level parsing, the player, detection, noise,
// coins, loot, the exit and the screen state machine. The world is plain
// data plus a fixed-step update; it draws nothing and hears nothing, so a
// headless check can drive it exactly like the browser does.

import {
  TILE,
  COLS,
  ROWS,
  STEP,
  PLAYER_RADIUS,
  GAIT,
  GUARD_SPEED,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  LAMP_RADIUS,
  DARK_EXPOSURE,
  ALARM_DECAY,
  ALARM_SUSPECT,
  ALARM_SEARCH,
  ALARM_FULL,
  CATCH_DISTANCE,
  COIN_COUNT,
  COIN_MAX_THROW,
  COIN_RING_RADIUS,
  SCORE_TREASURE,
  SCORE_RELIC,
  SCORE_GHOST,
  SCORE_SPEED_PER_SECOND,
} from './config.js';
import { clamp, dist, lineOfSight, moveCircle } from './geometry.js';
import { LEVELS, tileCenter } from './levels.js';
import { createGuard, updateGuard, visionTest, sampleExposure } from './guards.js';

const SOLID_CHARS = new Set(['#', 'C', 'S']);

export class World {
  constructor() {
    this.state = 'title'; // title | brief | play | caught | clear | victory
    this.paused = false;
    this.floorIndex = 0;
    this.score = 0;
    this.floorStartScore = 0;
    this.floorTime = 0;
    this.alarm = 0;
    this.alarmWord = 'unseen';
    this.ghostLost = false;
    this.statusMessage = '';
    this.sounds = []; // sound-event queue, drained by the audio layer
    this.loadFloor(0);
    this.state = 'title';
    this.setStatus('Vesper Vault. Press Enter to begin the heist.');
  }

  setStatus(text) {
    this.statusMessage = text;
  }

  loadFloor(index) {
    this.floorIndex = index;
    const level = LEVELS[index];
    this.level = level;
    this.solids = [];
    this.lamps = [];
    this.treasures = [];
    this.exitTiles = [];
    let start = tileCenter(2, 2);
    this.relic = null;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = level.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (SOLID_CHARS.has(ch)) {
          this.solids.push({ x: px, y: py, w: TILE, h: TILE, kind: ch });
        } else if (ch === 'L') {
          this.lamps.push({ x: px + TILE / 2, y: py + TILE / 2 });
        } else if (ch === 'P') {
          start = { x: px + TILE / 2, y: py + TILE / 2 };
        } else if (ch === 'R') {
          this.relic = { x: px + TILE / 2, y: py + TILE / 2, taken: false };
        } else if (ch === 'T') {
          this.treasures.push({ x: px + TILE / 2, y: py + TILE / 2, taken: false });
        } else if (ch === 'E') {
          this.exitTiles.push({ x: px, y: py, w: TILE, h: TILE });
        }
      }
    }
    this.player = {
      x: start.x,
      y: start.y,
      facing: -Math.PI / 2,
      sneaking: false,
      gait: 'walk',
      moving: false,
      coins: COIN_COUNT,
      stepTimer: 0,
    };
    this.guards = level.patrols.map((def, i) => createGuard(def, i));
    this.coins = []; // coins in flight
    this.rings = []; // landed coin rings, still ringing
    this.alarm = 0;
    this.alarmWord = 'unseen';
    this.ghostLost = false;
    this.floorTime = 0;
    this.floorStartScore = this.score;
    this.lastKnownX = start.x;
    this.lastKnownY = start.y;
  }

  get lootTotal() {
    return this.treasures.length + 1;
  }

  get lootGot() {
    return this.treasures.filter((t) => t.taken).length + (this.relic?.taken ? 1 : 0);
  }

  exposureAt(x, y) {
    return sampleExposure(x, y, this.lamps, LAMP_RADIUS);
  }

  // The shared alarm word the HUD eye and the status line show.
  alarmWordFor(alarm) {
    if (alarm >= ALARM_FULL) return 'ALARM';
    if (alarm >= ALARM_SEARCH) return 'HUNTED';
    if (alarm >= ALARM_SUSPECT) return 'SEEN?';
    return 'unseen';
  }

  // --- screen transitions -------------------------------------------------

  startGame() {
    this.score = 0;
    this.loadFloor(0);
    this.state = 'brief';
    this.setStatus(`${this.level.name}. ${this.level.brief}`);
  }

  beginFloor() {
    this.state = 'play';
    this.setStatus(`${this.level.name}. Stay in the dark. Lift ${this.level.relicName}.`);
  }

  retryFloor() {
    this.score = this.floorStartScore;
    this.loadFloor(this.floorIndex);
    this.state = 'brief';
    this.setStatus(`Back to ${this.level.name}. The museum resets; so do you.`);
  }

  nextFloor() {
    if (this.floorIndex + 1 >= LEVELS.length) {
      this.state = 'victory';
      this.setStatus(`The vault is empty. Final score ${this.score}. You vanished.`);
      this.sounds.push({ name: 'victory' });
      return;
    }
    this.loadFloor(this.floorIndex + 1);
    this.state = 'brief';
    this.setStatus(`${this.level.name}. ${this.level.brief}`);
  }

  // --- fixed-step update --------------------------------------------------

  update(dt, input) {
    if (this.state === 'title') {
      // The museum lives behind the title: guards walk their rounds.
      for (let i = 0; i < this.guards.length; i++) {
        updateGuard(this.guards[i], this.level.patrols[i], dt, this.solids, {
          seesPlayer: false,
          playerX: this.player.x,
          playerY: this.player.y,
        });
      }
      return;
    }
    if (this.state !== 'play' || this.paused) return;
    this.floorTime += dt;

    // --- the player -------------------------------------------------------
    const p = this.player;
    const mx = input.mx || 0;
    const my = input.my || 0;
    const moving = mx !== 0 || my !== 0;
    p.sneaking = !!input.sneak;
    p.gait = p.sneaking ? 'sneak' : input.sprint ? 'sprint' : 'walk';
    const speed = GAIT[p.gait].speed;
    if (moving) {
      const len = Math.hypot(mx, my);
      const dx = (mx / len) * speed * dt;
      const dy = (my / len) * speed * dt;
      const moved = moveCircle(p.x, p.y, dx, dy, PLAYER_RADIUS, this.solids);
      p.moving = moved.x !== p.x || moved.y !== p.y;
      p.x = moved.x;
      p.y = moved.y;
      p.facing = Math.atan2(my, mx);
      p.stepTimer -= dt;
      if (p.stepTimer <= 0 && p.moving) {
        p.stepTimer = p.gait === 'sprint' ? 0.28 : p.gait === 'walk' ? 0.42 : 0.6;
        this.sounds.push({ name: 'step', gait: p.gait });
      }
    } else {
      p.moving = false;
    }

    // --- coin toss ----------------------------------------------------------
    if (input.coinTarget && p.coins > 0) {
      const d = dist(p.x, p.y, input.coinTarget.x, input.coinTarget.y);
      const cl = Math.min(d, COIN_MAX_THROW);
      const a = Math.atan2(input.coinTarget.y - p.y, input.coinTarget.x - p.x);
      this.coins.push({
        x0: p.x,
        y0: p.y,
        x1: p.x + Math.cos(a) * cl,
        y1: p.y + Math.sin(a) * cl,
        x: p.x,
        y: p.y,
        t: 0,
        dur: 0.45,
      });
      p.coins -= 1;
      this.sounds.push({ name: 'coinThrow' });
      this.setStatus(`Coin away — ${p.coins} left.`);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.t += dt;
      const k = Math.min(c.t / c.dur, 1);
      c.x = c.x0 + (c.x1 - c.x0) * k;
      c.y = c.y0 + (c.y1 - c.y0) * k;
      if (k >= 1) {
        this.coins.splice(i, 1);
        this.rings.push({ x: c.x1, y: c.y1, ttl: 0.9 });
        this.sounds.push({ name: 'coinRing' });
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].ttl -= dt;
      if (this.rings[i].ttl <= 0) this.rings.splice(i, 1);
    }

    // --- noise: what the guards hear this step ---------------------------
    const heard = []; // {x, y, radius}
    if (moving && p.gait === 'sprint') {
      heard.push({ x: p.x, y: p.y, radius: GAIT.sprint.hearing });
    }
    if (moving && p.gait === 'walk') {
      heard.push({ x: p.x, y: p.y, radius: GAIT.walk.hearing, suspectOnly: true });
    }
    for (const ring of this.rings) {
      heard.push({ x: ring.x, y: ring.y, radius: COIN_RING_RADIUS });
    }

    // --- vision and the shared alarm --------------------------------------
    const exposure = this.exposureAt(p.x, p.y);
    let bestFill = 0;
    let bestGuard = null;
    for (const g of this.guards) {
      g.fillRate = visionTest(g, p, exposure, this.solids);
      g.seesPlayer = g.fillRate > 0;
      if (g.seesPlayer) {
        this.lastKnownX = p.x;
        this.lastKnownY = p.y;
        if (g.fillRate > bestFill) {
          bestFill = g.fillRate;
          bestGuard = g;
        }
      }
    }
    if (bestFill > 0) {
      this.alarm = clamp(this.alarm + bestFill * dt, 0, 1);
    } else {
      this.alarm = clamp(this.alarm - ALARM_DECAY * dt, 0, 1);
    }
    const word = this.alarmWordFor(this.alarm);
    if (word !== this.alarmWord) {
      this.alarmWord = word;
      if (word === 'SEEN?') this.setStatus('Seen? A guard is staring at you — break line of sight.');
      if (word === 'HUNTED') this.setStatus('Hunted. Guards are searching your last known position.');
      if (word === 'ALARM') this.setStatus('ALARM. Every guard is chasing you. Run for the dark.');
      if (word === 'unseen') this.setStatus('Unseen. The dark is yours again.');
    }
    if (this.alarm >= ALARM_FULL) this.ghostLost = true;

    // --- guard moods -------------------------------------------------------
    for (let i = 0; i < this.guards.length; i++) {
      const g = this.guards[i];
      const sense = {
        seesPlayer: g.seesPlayer,
        playerX: p.x,
        playerY: p.y,
      };
      // Thresholds: a guard that sees you goes suspect, then the floor
      // searches your last known spot, then everyone chases.
      if (this.alarm >= ALARM_FULL && g.mood !== 'chase') {
        g.mood = 'chase';
        g.lastSeenX = this.lastKnownX;
        g.lastSeenY = this.lastKnownY;
        g.lostTime = 0;
        if (i === 0 || bestGuard === g) this.sounds.push({ name: 'alarm' });
      } else if (this.alarm >= ALARM_SEARCH && g.mood !== 'chase' && g.mood !== 'search') {
        g.mood = 'search';
        g.targetX = this.lastKnownX;
        g.targetY = this.lastKnownY;
        g.searchTime = 0;
        g.sweepTime = 0;
      } else if (this.alarm >= ALARM_SUSPECT && g.seesPlayer && g.mood === 'patrol') {
        g.mood = 'suspect';
        g.targetX = p.x;
        g.targetY = p.y;
        g.sweepTime = 0;
      }
      // Hearing, per guard: sprinting and coin rings pull a search,
      // walking only makes a nearby patrolling guard suspect.
      for (const h of heard) {
        if (dist(g.x, g.y, h.x, h.y) <= h.radius) {
          if (h.suspectOnly) {
            if (g.mood === 'patrol') {
              sense.suspected = { x: h.x, y: h.y };
            }
          } else {
            sense.heard = { x: h.x, y: h.y };
          }
          break;
        }
      }
      updateGuard(g, this.level.patrols[i], dt, this.solids, sense);
    }

    // --- caught? ------------------------------------------------------------
    for (const g of this.guards) {
      if (g.mood === 'chase' && dist(g.x, g.y, p.x, p.y) < CATCH_DISTANCE) {
        this.state = 'caught';
        this.score = this.floorStartScore;
        this.sounds.push({ name: 'caught' });
        this.setStatus('Caught. The guards march you out — press R to try the floor again.');
        return;
      }
    }

    // --- loot ---------------------------------------------------------------
    for (const t of this.treasures) {
      if (!t.taken && dist(p.x, p.y, t.x, t.y) < 26) {
        t.taken = true;
        this.score += SCORE_TREASURE;
        this.sounds.push({ name: 'treasure' });
        this.setStatus(`Treasure lifted. ${this.lootGot} of ${this.lootTotal} pieces. Score ${this.score}.`);
      }
    }
    if (this.relic && !this.relic.taken && dist(p.x, p.y, this.relic.x, this.relic.y) < 26) {
      this.relic.taken = true;
      this.score += SCORE_RELIC;
      this.sounds.push({ name: 'relic' });
      this.setStatus(`You hold ${this.level.relicName}. The exit is open — vanish.`);
    }

    // --- exit -----------------------------------------------------------------
    if (this.relic?.taken) {
      for (const e of this.exitTiles) {
        if (p.x >= e.x && p.x < e.x + e.w && p.y >= e.y && p.y < e.y + e.h) {
          const under = Math.max(0, this.level.par - this.floorTime);
          const speedBonus = Math.round(under * SCORE_SPEED_PER_SECOND);
          const ghostBonus = this.ghostLost ? 0 : SCORE_GHOST;
          this.score += speedBonus + ghostBonus;
          this.clearStats = {
            time: this.floorTime,
            speedBonus,
            ghostBonus,
            loot: this.lootGot,
            lootTotal: this.lootTotal,
            score: this.score,
          };
          this.state = 'clear';
          this.sounds.push({ name: 'floorClear' });
          this.setStatus(
            `${this.level.name} cleared in ${this.floorTime.toFixed(1)} seconds. Score ${this.score}.`,
          );
          return;
        }
      }
    }
  }
}

// The world advances in fixed 1/60s steps; a caller that feeds real time
// accumulates it and steps whole units, so the simulation never depends on
// the frame rate.
export function stepWorld(world, dt, input) {
  world.update(dt, input);
}

export { STEP, VISION_RANGE, VISION_HALF_ANGLE, LAMP_RADIUS, DARK_EXPOSURE };
