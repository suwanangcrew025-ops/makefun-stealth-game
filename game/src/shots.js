// Vesper Vault — screenshot staging: each shot is driven through the
// real simulation with fixed 1/60s steps and a steering pilot, then one
// frame is drawn and a ready flag is set. Nothing is posed by hand, so
// a re-capture from the same code lands on the same pixels.

import { STEP } from './config.js';
import { createPilot, updatePilot } from './pilot.js';
import { visionRate } from './guards.js';
import { advanceMenu, createWorld, stepWorld } from './world.js';

const IDLE = { ax: 0, ay: 0, sneak: false, sprint: false, pendingCoin: null };

// The title over floor I after 6s of ambient patrolling.
function stageCover() {
  const world = createWorld(0);
  for (let i = 0; i < 360; i++) stepWorld(world, IDLE, STEP);
  return { world, state: shotState(world) };
}

// The pilot lifts the south-west treasure, then slips to the middle
// guard's column and stands at its edge until the guard has stopped
// and is staring at the thief with the meter at 0.35 — a near miss:
// the '?' is up, the cone is orange, the thief is inside it, and the
// loot is already 1/4.
function stagePlay() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const guardNorth = (w) => {
    const g = w.guards[1];
    return w.floorTime > 10 && Math.floor(g.y / 40) <= 4 && g.mood === 'patrol';
  };
  const pilot = createPilot(
    [[2, 2], [2, 13], [6, 14], [7, 15], [4, 14], [10, 14], [10, 13], [12, 13], [12, 14, guardNorth], [17, 14], [17, 12]],
    { gait: 'walk', lanes: true },
  );
  let steps = 0;
  while (!pilot.done && steps < 12000) {
    stepWorld(world, updatePilot(pilot, world, STEP), STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught en route' };
  }
  // Wait for the near miss itself: a suspect guard staring at the
  // thief, the thief inside its cone, the meter at 0.35.
  const staged = (w) => {
    if (w.alarm < 0.35 || w.screen !== 'play') return false;
    for (const g of w.guards) {
      if (g.mood === 'suspect' && visionRate(g, w) > 0) return true;
    }
    return false;
  };
  while (!staged(world) && steps < 12000) {
    stepWorld(world, IDLE, STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught while waiting' };
    if (world.alarm >= 1.0) return { world, state: shotState(world), steps, failed: 'alarm hit 1.0 while waiting' };
  }
  if (!staged(world)) return { world, state: shotState(world), steps, failed: 'staged moment never arrived' };
  world.alarm = 0.35;
  return { world, state: shotState(world), steps };
}

// The pilot walks the east room to one tile west of the east guard's
// column and stands there, in the lamp light by the relic. It crosses
// the west chamber on row 2, drops down column 10, and waits at (12,8)
// until the middle guard is at its south end, so the crossing of its
// column happens while the guard is far away. Then it stands at (28,5)
// until a guard has stopped and is staring at the thief with the
// meter at 0.45 — and only then is the meter pinned at exactly 0.45
// for the frame.
function stageAlert() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const guardSouth = (w) => {
    const g = w.guards[1];
    return Math.floor(g.y / 40) >= 13 && g.mood === 'patrol';
  };
  const pilot = createPilot(
    [[2, 2], [10, 2], [10, 8], [12, 8, guardSouth], [22, 8], [23, 8], [23, 3], [26, 3], [28, 3], [28, 5]],
    { gait: 'walk', lanes: true },
  );
  let steps = 0;
  while (!pilot.done && steps < 12000) {
    stepWorld(world, updatePilot(pilot, world, STEP), STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught en route' };
  }
  // Wait for the staged moment itself: a suspect guard staring at the
  // thief, the thief inside its cone, the meter at 0.45.
  const staged = (w) => {
    if (w.alarm < 0.45 || w.screen !== 'play') return false;
    for (const g of w.guards) {
      if (g.mood === 'suspect' && visionRate(g, w) > 0) return true;
    }
    return false;
  };
  while (!staged(world) && steps < 12000) {
    stepWorld(world, IDLE, STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught while waiting' };
    if (world.alarm >= 1.0) return { world, state: shotState(world), steps, failed: 'alarm hit 1.0 while waiting' };
  }
  if (!staged(world)) return { world, state: shotState(world), steps, failed: 'staged moment never arrived' };
  world.alarm = 0.45;
  return { world, state: shotState(world), steps };
}

// The pilot walks the whole first floor: down the west chamber,
// across the middle at row 8 while the middle guard is at its south
// end, up the east room to lift the Star of Vesper, then back down
// and out the east exit while the east guard is at its south end —
// and the frame is the FLOOR CLEAR panel with its statistics.
function stageEnd() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const guardSouth = (index) => (w) => {
    const g = w.guards[index];
    return Math.floor(g.y / 40) >= 13 && g.mood === 'patrol';
  };
  const pilot = createPilot(
    [[2, 2], [10, 2], [10, 8], [12, 8, guardSouth(1)], [22, 8], [23, 8], [23, 3], [26, 3], [26, 2], [26, 3], [23, 3], [23, 8, guardSouth(2)], [30, 8]],
    { gait: 'walk', lanes: true },
  );
  let steps = 0;
  while (!pilot.done && steps < 12000) {
    stepWorld(world, updatePilot(pilot, world, STEP), STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught en route' };
    if (world.screen === 'clear') return { world, state: shotState(world), steps };
  }
  while (world.screen !== 'clear' && steps < 12000) {
    stepWorld(world, IDLE, STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps, failed: 'caught after the route' };
  }
  if (world.screen !== 'clear') return { world, state: shotState(world), steps, failed: 'floor never cleared' };
  return { world, state: shotState(world), steps };
}

export function shotState(world) {
  const p = world.player;
  return {
    screen: world.screen,
    floor: world.floorIndex,
    alarm: Number(world.alarm.toFixed(3)),
    loot: world.lootCount,
    lootTotal: world.lootTotal,
    coins: p.coins,
    score: world.score,
    playerTile: [Math.floor(p.x / 40), Math.floor(p.y / 40)],
    playerGait: p.gait,
    guards: world.guards.map((g) => ({
      mood: g.mood,
      tile: [Math.floor(g.x / 40), Math.floor(g.y / 40)],
      sees: g.seesPlayer,
    })),
    time: Number(world.floorTime.toFixed(2)),
  };
}

// Run one named staging and return the staged world plus its state.
// Throws on an unknown shot name or a staging that missed its mark.
export function runShot(name) {
  let result;
  if (name === 'cover') result = stageCover();
  else if (name === 'play') result = stagePlay();
  else if (name === 'alert') result = stageAlert();
  else if (name === 'end') result = stageEnd();
  else throw new Error(`unknown shot: ${name}`);
  if (result.failed) throw new Error(`shot ${name} failed: ${result.failed}`);
  return result;
}
