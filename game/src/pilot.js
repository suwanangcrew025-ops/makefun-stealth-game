// Vesper Vault — the steering pilot: a waypoint follower that drives the
// player through the real simulation. Screenshot staging and the headless
// playability check both use it, so the shots prove what a player can do.

import { TILE } from './config.js';
import { dist } from './geometry.js';
import { tileCenter } from './levels.js';

// A pilot follows tile waypoints in order, picking its gait by how close
// the nearest guard is. `legs` are [tileX, tileY] pairs.
export function createPilot(legs) {
  return {
    legs: legs.map(([tx, ty]) => tileCenter(tx, ty)),
    index: 0,
    done: false,
  };
}

// Fill `input` for one fixed step. Returns true while the pilot is still
// travelling; false once it has arrived at its last waypoint.
export function pilotStep(pilot, world, input, sneakRadius = 210) {
  if (pilot.done || pilot.index >= pilot.legs.length) {
    pilot.done = true;
    input.mx = 0;
    input.my = 0;
    input.sneak = false;
    input.sprint = false;
    return false;
  }
  const target = pilot.legs[pilot.index];
  const p = world.player;
  const d = dist(p.x, p.y, target.x, target.y);
  if (d < 10) {
    pilot.index += 1;
    if (pilot.index >= pilot.legs.length) {
      pilot.done = true;
      input.mx = 0;
      input.my = 0;
      input.sneak = false;
      input.sprint = false;
      return false;
    }
  }
  const t = pilot.legs[pilot.index];
  const dx = t.x - p.x;
  const dy = t.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  input.mx = dx / len;
  input.my = dy / len;
  // Sneak whenever a guard is close; otherwise walk.
  let nearest = Infinity;
  for (const g of world.guards) {
    nearest = Math.min(nearest, dist(p.x, p.y, g.x, g.y));
  }
  input.sneak = nearest < sneakRadius;
  input.sprint = false;
  return true;
}

// A sprinting pilot: same follower, always at full speed.
export function pilotSprint(pilot, world, input) {
  const travelling = pilotStep(pilot, world, input, 0);
  input.sneak = false;
  input.sprint = travelling;
  return travelling;
}

// Run the world for up to `maxSteps` fixed steps under a pilot callback
// that fills the input each step; stop early when `stopWhen(world)` is
// true. Returns the number of steps run.
export function runPilot(world, maxSteps, drive, stopWhen) {
  const input = { mx: 0, my: 0, sneak: false, sprint: false, coinTarget: null };
  let steps = 0;
  for (; steps < maxSteps; steps++) {
    if (stopWhen && stopWhen(world)) break;
    drive(world, input);
    world.update(1 / 60, input);
    input.coinTarget = null;
  }
  return steps;
}

export { TILE };
