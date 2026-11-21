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

// The pilot sneaks down the west chamber's shadow side, lifts the
// south-west treasure and settles crouched beside the crates.
function stagePlay() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const pilot = createPilot(
    [[2, 2], [2, 13], [6, 14], [7, 15], [4, 14]],
    { gait: 'auto', sneakRadius: 210, dwellSteps: 90 },
  );
  let steps = 0;
  while (!pilot.done && steps < 12000) {
    stepWorld(world, updatePilot(pilot, world, STEP), STEP);
    steps += 1;
  }
  return { world, state: shotState(world), steps };
}

// The pilot walks the south side of the gallery to one tile east of
// the middle guard's column and stands there. It crosses the west
// chamber on row 14, in the dark, slips through the west partition's
// row-13 door gap, and waits at (12,14) until the middle guard is up
// at the north end of its beat, so the crossing of its column happens
// while the guard is far away. It steers on centrelines (lanes), so it
// never cuts a diagonal across a crate corner. Then it stands at
// (17,12) until a guard has stopped and is staring at the thief with
// the meter at 0.45 — and only then is the meter pinned at exactly
// 0.45 for the frame.
function stageAlert() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const guardNorth = (w) => {
    const g = w.guards[1];
    return w.floorTime > 10 && Math.floor(g.y / 40) <= 4 && g.mood === 'patrol';
  };
  const pilot = createPilot(
    [[2, 2], [2, 14], [10, 14], [10, 13], [12, 13], [12, 14, guardNorth], [17, 14], [17, 12]],
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

// The pilot sprints the corridor and stands in the middle column
// patrol's road until a guard catches them.
function stageEnd() {
  const world = createWorld(0);
  advanceMenu(world);
  advanceMenu(world);
  const pilot = createPilot(
    [[2, 2], [2, 8], [16, 8], [16, 10]],
    { gait: 'sprint' },
  );
  let steps = 0;
  while (!pilot.done && steps < 12000) {
    stepWorld(world, updatePilot(pilot, world, STEP), STEP);
    steps += 1;
    if (world.screen === 'caught') return { world, state: shotState(world), steps };
  }
  while (world.screen !== 'caught' && steps < 12000) {
    stepWorld(world, IDLE, STEP);
    steps += 1;
  }
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
