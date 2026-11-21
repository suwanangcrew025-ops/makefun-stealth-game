// Vesper Vault — the world: level parsing, the player, detection, noise,
// the coin, loot, the exit, scoring and the screen state machine.
// The world is DOM-free and deterministic: no Math.random anywhere, a
// fixed 1/60s step, and every run from the same inputs lands on the same
// state, which is what makes the screenshots reproducible.

import {
  ALARM_DECAY,
  ALARM_FULL,
  ALARM_SEARCH,
  ALARM_SUSPECT,
  CATCH_DISTANCE,
  COINS_PER_FLOOR,
  COIN_FLIGHT_TIME,
  COIN_MAX_THROW,
  COIN_RING_RADIUS,
  HEAR_SPRINT,
  HEAR_WALK,
  PAR_TIMES,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  SCORE_GHOST,
  SCORE_RELIC,
  SCORE_SPEED_PER_SECOND,
  SCORE_TREASURE,
  SPEED_SNEAK,
  SPEED_SPRINT,
  SPEED_WALK,
  STEP,
  TILE,
} from './config.js';
import { FLOORS } from './levels.js';
import { attemptMove, distance, tileCenter } from './geometry.js';
import { createGuard, updateGuard, updateGuardAmbient, visionRate } from './guards.js';

export function alarmWord(world) {
  if (world.alarm < ALARM_SUSPECT) return 'unseen';
  if (world.alarm < ALARM_SEARCH) return 'SEEN?';
  if (world.alarm < ALARM_FULL) return 'HUNTED';
  return 'ALARM';
}

export function createWorld(floorIndex = 0, score = 0) {
  const world = {
    floorIndex,
    floor: FLOORS[floorIndex],
    grid: [],
    player: { x: 0, y: 0, gait: 'walk', coins: COINS_PER_FLOOR },
    guards: [],
    treasures: [],
    relic: null,
    lamps: [],
    exits: [],
    alarm: 0,
    alarmEverFull: false,
    score,
    floorStartScore: score,
    floorTime: 0,
    lootCount: 0,
    lootTotal: 0,
    exitOpen: false,
    screen: 'title',
    lastKnown: { x: 0, y: 0 },
    coin: null,
    sounds: [],
    status: '',
    statusDirty: true,
    clearStats: null,
    steps: 0,
    stepTimer: 0,
    caughtBy: -1,
  };
  loadFloor(world, floorIndex);
  setStatus(world, 'Vesper Vault — press Enter to begin.');
  return world;
}

function setStatus(world, text) {
  if (world.status !== text) {
    world.status = text;
    world.statusDirty = true;
  }
}

// Parse one floor's tile map into the live world: markers become floor
// tiles and their positions are kept in the matching lists.
export function loadFloor(world, floorIndex) {
  const def = FLOORS[floorIndex];
  world.floorIndex = floorIndex;
  world.floor = def;
  world.grid = def.rows.map((row) => row.split(''));
  world.treasures = [];
  world.lamps = [];
  world.exits = [];
  world.relic = null;
  for (let ty = 0; ty < world.grid.length; ty++) {
    for (let tx = 0; tx < world.grid[ty].length; tx++) {
      const c = world.grid[ty][tx];
      const centre = tileCenter(tx, ty);
      if (c === 'P') {
        world.player.x = centre.x;
        world.player.y = centre.y;
        world.grid[ty][tx] = '.';
      } else if (c === 'R') {
        world.relic = { x: centre.x, y: centre.y, taken: false };
        world.grid[ty][tx] = '.';
      } else if (c === 'T') {
        world.treasures.push({ x: centre.x, y: centre.y, taken: false });
        world.grid[ty][tx] = '.';
      } else if (c === 'L') {
        world.lamps.push({ x: centre.x, y: centre.y });
        world.grid[ty][tx] = '.';
      } else if (c === 'E') {
        world.exits.push({ tx, ty });
        world.grid[ty][tx] = '.';
      }
    }
  }
  world.guards = def.guards.map((g, i) => createGuard(g, i));
  world.player.coins = COINS_PER_FLOOR;
  world.player.gait = 'walk';
  world.alarm = 0;
  world.alarmEverFull = false;
  world.floorTime = 0;
  world.lootCount = 0;
  world.lootTotal = world.treasures.length + 1;
  world.exitOpen = false;
  world.coin = null;
  world.sounds = [];
  world.clearStats = null;
  world.caughtBy = -1;
  world.lastKnown = { x: world.player.x, y: world.player.y };
  world.stepTimer = 0;
}

export function resetFloor(world) {
  world.score = world.floorStartScore;
  loadFloor(world, world.floorIndex);
  world.screen = 'play';
  setStatus(world, `${world.floor.name} — ${alarmWord(world)}. Loot 0/${world.lootTotal}.`);
}

// Enter advances the menus: title to brief, brief to play, caught back
// to a fresh attempt at the floor, clear on to the next floor's brief,
// victory back to the title.
export function advanceMenu(world) {
  if (world.screen === 'title') {
    world.screen = 'brief';
    setStatus(world, `${world.floor.name}. ${world.floor.brief}`);
    world.sounds.push('click');
  } else if (world.screen === 'brief') {
    world.screen = 'play';
    world.floorStartScore = world.score;
    setStatus(world, `${world.floor.name} — unseen. Loot 0/${world.lootTotal}.`);
    world.sounds.push('click');
  } else if (world.screen === 'caught') {
    resetFloor(world);
    world.sounds.push('click');
  } else if (world.screen === 'clear') {
    if (world.floorIndex < FLOORS.length - 1) {
      loadFloor(world, world.floorIndex + 1);
      world.screen = 'brief';
      setStatus(world, `${world.floor.name}. ${world.floor.brief}`);
    } else {
      world.screen = 'victory';
      setStatus(world, `The Vesper is yours. Final score ${world.score}. Press Enter.`);
    }
    world.sounds.push('click');
  } else if (world.screen === 'victory') {
    world.score = 0;
    loadFloor(world, 0);
    world.screen = 'title';
    setStatus(world, 'Vesper Vault — press Enter to begin.');
    world.sounds.push('click');
  }
}

function throwCoin(world, target) {
  const p = world.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  const reach = Math.min(d, COIN_MAX_THROW);
  const nx = d > 0 ? p.x + (dx / d) * reach : p.x;
  const ny = d > 0 ? p.y + (dy / d) * reach : p.y;
  world.coin = { x0: p.x, y0: p.y, x1: nx, y1: ny, t: 0, state: 'flying', ringT: 0 };
  world.player.coins -= 1;
  world.sounds.push('coin-throw');
}

function landCoin(world) {
  const coin = world.coin;
  coin.state = 'ring';
  coin.ringT = 0.6;
  world.sounds.push('coin-ring');
  for (const g of world.guards) {
    if (g.mood === 'chase') continue;
    if (distance(g.x, g.y, coin.x1, coin.y1) <= COIN_RING_RADIUS) {
      g.mood = 'search';
      g.stimulus = { x: coin.x1, y: coin.y1 };
      g.sweepLeft = 0;
    }
  }
}

function clearFloor(world) {
  const par = PAR_TIMES[world.floorIndex];
  const speedBonus = Math.max(0, Math.round(par - world.floorTime)) * SCORE_SPEED_PER_SECOND;
  const ghostBonus = world.alarmEverFull ? 0 : SCORE_GHOST;
  world.score += speedBonus + ghostBonus;
  world.clearStats = {
    time: world.floorTime,
    speedBonus,
    ghostBonus,
    loot: world.lootCount,
    lootTotal: world.lootTotal,
    score: world.score,
  };
  world.screen = 'clear';
  world.sounds.push('clear');
  setStatus(
    world,
    `Floor clear in ${world.floorTime.toFixed(1)}s. Speed +${speedBonus}, ghost +${ghostBonus}. Score ${world.score}. Press Enter.`,
  );
}

function caught(world, guardId) {
  world.screen = 'caught';
  world.caughtBy = guardId;
  world.sounds.push('caught');
  setStatus(world, 'Caught! The guards close in. Press R to retry the floor.');
}

// One fixed step. `input` is a plain struct: {ax, ay, sneak, sprint,
// pendingCoin}. The world alone clears pendingCoin, after it has
// consumed it — the menu handler never touches it.
export function stepWorld(world, input, dt = STEP) {
  world.steps += 1;

  if (world.screen === 'title') {
    for (const g of world.guards) updateGuardAmbient(g, world, dt);
    return;
  }
  if (world.screen !== 'play') return;

  world.floorTime += dt;
  const p = world.player;

  // --- Movement and gait.
  let ax = input.ax || 0;
  let ay = input.ay || 0;
  const len = Math.hypot(ax, ay);
  if (len > 1) {
    ax /= len;
    ay /= len;
  }
  const moving = len > 0.01;
  p.gait = input.sneak ? 'sneak' : input.sprint ? 'sprint' : 'walk';
  const speed = p.gait === 'sneak' ? SPEED_SNEAK : p.gait === 'sprint' ? SPEED_SPRINT : SPEED_WALK;
  if (moving) {
    const moved = attemptMove(
      world.grid, p.x, p.y, PLAYER_RADIUS,
      ax * speed * dt, ay * speed * dt,
      p.x + ax * speed * dt, p.y + ay * speed * dt,
    );
    p.x = moved.x;
    p.y = moved.y;
    // Footsteps on a cadence set by the gait; sneaking stays soft.
    world.stepTimer -= dt;
    if (world.stepTimer <= 0) {
      world.sounds.push(p.gait === 'sneak' ? 'step-soft' : 'step');
      world.stepTimer = p.gait === 'sneak' ? 0.55 : p.gait === 'sprint' ? 0.28 : 0.4;
    }
  }

  // --- The coin. Only the world consumes the pending target, and it
  // clears it right after the throw is set up.
  if (input.pendingCoin && !world.coin && p.coins > 0) {
    throwCoin(world, input.pendingCoin);
  }
  if (input.pendingCoin) input.pendingCoin = null;
  if (world.coin) {
    const coin = world.coin;
    if (coin.state === 'flying') {
      coin.t += dt;
      if (coin.t >= COIN_FLIGHT_TIME) landCoin(world);
    } else {
      coin.ringT -= dt;
      if (coin.ringT <= 0) world.coin = null;
    }
  }

  // --- Noise: sprinting pulls guards in earshot to the thief's spot,
  // walking only makes a nearby patroller stop and stare.
  if (moving) {
    for (const g of world.guards) {
      const d = distance(g.x, g.y, p.x, p.y);
      if (p.gait === 'sprint' && d <= HEAR_SPRINT && g.mood !== 'chase') {
        g.mood = 'search';
        g.stimulus = { x: p.x, y: p.y };
        g.sweepLeft = 0;
      } else if (p.gait === 'walk' && d <= HEAR_WALK && g.mood === 'patrol') {
        g.mood = 'suspect';
        g.stimulus = { x: p.x, y: p.y };
        g.stareT = 1.2;
      }
    }
  }

  // --- Detection: the best-seeing guard fills the shared meter.
  let best = 0;
  for (const g of world.guards) {
    g.seeRate = visionRate(g, world);
    g.seesPlayer = g.seeRate > 0;
    if (g.seeRate > best) best = g.seeRate;
  }
  if (best > 0) {
    world.lastKnown = { x: p.x, y: p.y };
    world.alarm = Math.min(ALARM_FULL, world.alarm + best * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY * dt);
  }
  if (world.alarm >= ALARM_FULL && !world.alarmEverFull) {
    world.alarmEverFull = true;
    for (const g of world.guards) {
      g.mood = 'chase';
      g.loseT = 0;
    }
    world.sounds.push('alarm');
  }

  // --- Guard reactions to the meter.
  for (const g of world.guards) {
    if (g.mood === 'chase') continue;
    if (g.seesPlayer && world.alarm >= ALARM_SEARCH) {
      g.mood = 'search';
      g.stimulus = { ...world.lastKnown };
      g.sweepLeft = 0;
    } else if (g.seesPlayer && world.alarm >= ALARM_SUSPECT && (g.mood === 'patrol' || g.mood === 'return')) {
      g.mood = 'suspect';
      g.stimulus = { x: p.x, y: p.y };
      g.stareT = 1.2;
    }
  }

  for (const g of world.guards) updateGuard(g, world, dt);

  // --- Caught: a chasing guard within arm's reach ends the floor.
  for (const g of world.guards) {
    if (g.mood === 'chase' && distance(g.x, g.y, p.x, p.y) < CATCH_DISTANCE) {
      caught(world, g.id);
      return;
    }
  }

  // --- Loot.
  for (const t of world.treasures) {
    if (!t.taken && distance(p.x, p.y, t.x, t.y) <= PICKUP_RADIUS) {
      t.taken = true;
      world.lootCount += 1;
      world.score += SCORE_TREASURE;
      world.sounds.push('pickup');
      setStatus(world, `${world.floor.name} — ${alarmWord(world)}. Loot ${world.lootCount}/${world.lootTotal}. Treasure lifted.`);
    }
  }
  if (world.relic && !world.relic.taken && distance(p.x, p.y, world.relic.x, world.relic.y) <= PICKUP_RADIUS) {
    world.relic.taken = true;
    world.lootCount += 1;
    world.score += SCORE_RELIC;
    world.exitOpen = true;
    world.sounds.push('relic');
    setStatus(world, `${world.floor.name} — ${alarmWord(world)}. Loot ${world.lootCount}/${world.lootTotal}. The relic is yours — reach the exit.`);
  }

  // --- The exit, sealed until the relic is held.
  if (world.exitOpen) {
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor(p.y / TILE);
    for (const e of world.exits) {
      if (e.tx === ptx && e.ty === pty) {
        clearFloor(world);
        return;
      }
    }
  }

  // --- The narrating status line, kept fresh as the alarm word changes.
  const word = alarmWord(world);
  if (world.screen === 'play') {
    setStatus(world, `${world.floor.name} — ${word}. Loot ${world.lootCount}/${world.lootTotal}. Coins ${p.coins}. Score ${world.score}.`);
  }
}
