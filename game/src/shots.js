// Vesper Vault — screenshot staging: each shot is staged through the real
// simulation with fixed 1/60s steps and the steering pilot, then one frame
// is drawn. The four shots are:
//   cover — the title over floor I after 6s of ambient patrolling
//   play  — the pilot sneaks down the west chamber, lifts the south-west
//           treasure and settles crouched beside the crates
//   alert — the pilot walks the row-8 corridor to (17,12) and stands until
//           the alarm meter reads exactly 0.45
//   end   — the pilot sprints into the middle guard's road at (16,10) and
//           stands there until caught

import { STEP } from './config.js';
import { createPilot, pilotStep, pilotSprint, runPilot } from './pilot.js';

function startPlaying(world) {
  world.startGame();
  world.beginFloor();
}

function stageCover(world) {
  // Six seconds of ambient patrolling behind the title.
  const input = { mx: 0, my: 0, sneak: false, sprint: false, coinTarget: null };
  for (let i = 0; i < 360; i++) world.update(STEP, input);
  return 360;
}

function stagePlay(world) {
  startPlaying(world);
  // Down the west chamber's shadow side, then east along the south wall
  // to the treasure at (7,15), then settle crouched beside the crates.
  const pilot = createPilot([[2, 2], [2, 13], [6, 14], [7, 15], [4, 14]]);
  const steps = runPilot(
    world,
    60 * 45,
    (w, input) => pilotStep(pilot, w, input, 210),
    (w) => pilot.done && w.lootGot >= 1,
  );
  // Settle: a few crouched seconds so the cones sweep past.
  const input = { mx: 0, my: 0, sneak: true, sprint: false, coinTarget: null };
  for (let i = 0; i < 120; i++) world.update(STEP, input);
  return steps + 120;
}

function stageAlert(world) {
  startPlaying(world);
  // Walk the row-8 corridor, then one tile east of the middle guard's
  // column, and stand at (17,12) until the meter reads 0.45.
  const pilot = createPilot([[2, 2], [2, 8], [16, 8], [17, 8], [17, 12]]);
  let steps = runPilot(
    world,
    60 * 45,
    (w, input) => pilotStep(pilot, w, input, 0),
    (w) => pilot.done,
  );
  const input = { mx: 0, my: 0, sneak: false, sprint: false, coinTarget: null };
  for (let i = 0; i < 60 * 90; i++) {
    if (world.alarm >= 0.45 || world.state !== 'play') break;
    world.update(STEP, input);
    steps += 1;
  }
  // Pin the meter at exactly 0.45 for the frame.
  if (world.state === 'play') world.alarm = 0.45;
  return steps;
}

function stageEnd(world) {
  startPlaying(world);
  // Sprint the corridor and stand in the column patrol's road at (16,10)
  // until a chasing guard catches the player.
  const pilot = createPilot([[2, 2], [2, 8], [16, 8], [16, 10]]);
  let steps = runPilot(
    world,
    60 * 45,
    (w, input) => pilotSprint(pilot, w, input),
    (w) => pilot.done || w.state === 'caught',
  );
  const input = { mx: 0, my: 0, sneak: false, sprint: false, coinTarget: null };
  for (let i = 0; i < 60 * 60; i++) {
    if (world.state === 'caught') break;
    world.update(STEP, input);
    steps += 1;
  }
  return steps;
}

export const SHOT_STAGES = {
  cover: stageCover,
  play: stagePlay,
  alert: stageAlert,
  end: stageEnd,
};

// Stage one shot by name. Returns the number of fixed steps run.
export function stageShot(world, name) {
  const stage = SHOT_STAGES[name];
  if (!stage) throw new Error(`unknown shot: ${name}`);
  return stage(world);
}
