// Vesper Vault — the pilot: a waypoint steering controller that plays
// through the world's own movement code. The screenshot staging and
// the sneak-only bot test both drive it, so a staged frame is always a
// frame the real simulation produced, never a posed fake.
// Routes run along open lines and door gaps with intermediate
// waypoints, because greedy steering deadlocks when the target shares
// the pilot's exact latitude across a wall.

import { distance, tileCenter } from './geometry.js';

// A waypoint may be [tileX, tileY] or [tileX, tileY, untilFn]: the
// pilot stands at the tile until untilFn(world) holds, then moves on.
export function createPilot(waypoints, opts = {}) {
  return {
    waypoints,
    index: 0,
    gait: opts.gait || 'walk',
    lanes: opts.lanes || false,
    sneakRadius: opts.sneakRadius || 210,
    arriveRadius: opts.arriveRadius || 10,
    dwellSteps: opts.dwellSteps || 0,
    dwellLeft: 0,
    done: false,
    stuckSteps: 0,
    lastDist: Infinity,
  };
}

export function updatePilot(pilot, world, dt) {
  if (pilot.done) {
    return { ax: 0, ay: 0, sneak: true, sprint: false, pendingCoin: null };
  }
  if (pilot.dwellLeft > 0) {
    pilot.dwellLeft -= 1;
    if (pilot.dwellLeft <= 0) pilot.done = true;
    return { ax: 0, ay: 0, sneak: true, sprint: false, pendingCoin: null };
  }
  const target = tileCenter(pilot.waypoints[pilot.index][0], pilot.waypoints[pilot.index][1]);
  const p = world.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= pilot.arriveRadius) {
    // A waypoint may carry a third element, a predicate on the world:
    // the pilot stands here until it holds (a timed wait, or a guard
    // being somewhere safe to pass), then moves on.
    const until = pilot.waypoints[pilot.index][2];
    if (typeof until === 'function' && !until(world)) {
      return { ax: 0, ay: 0, sneak: true, sprint: false, pendingCoin: null };
    }
    pilot.index += 1;
    pilot.lastDist = Infinity;
    pilot.stuckSteps = 0;
    if (pilot.index >= pilot.waypoints.length) {
      if (pilot.dwellSteps > 0) {
        pilot.dwellLeft = pilot.dwellSteps;
      } else {
        pilot.done = true;
      }
      return { ax: 0, ay: 0, sneak: true, sprint: false, pendingCoin: null };
    }
    return updatePilot(pilot, world, dt);
  }
  // If the pilot stops closing in, it is pressed against a wall face:
  // give up on this waypoint and take the next one rather than grind.
  if (d > pilot.lastDist - 0.05) {
    pilot.stuckSteps += 1;
  } else {
    pilot.stuckSteps = 0;
  }
  pilot.lastDist = d;
  if (pilot.stuckSteps > 240) {
    pilot.index += 1;
    pilot.stuckSteps = 0;
    pilot.lastDist = Infinity;
    if (pilot.index >= pilot.waypoints.length) {
      pilot.done = true;
      return { ax: 0, ay: 0, sneak: true, sprint: false, pendingCoin: null };
    }
    return updatePilot(pilot, world, dt);
  }

  let sneak = false;
  let sprint = false;
  if (pilot.gait === 'sneak') {
    sneak = true;
  } else if (pilot.gait === 'sprint') {
    sprint = true;
  } else if (pilot.gait === 'auto') {
    let near = false;
    for (const g of world.guards) {
      if (distance(g.x, g.y, p.x, p.y) <= pilot.sneakRadius) {
        near = true;
        break;
      }
    }
    sneak = near;
  }
  if (pilot.lanes) {
    // Travel on a centreline: correct the smaller error first (to
    // within 2px), then run along the row or column. A diagonal cut
    // across a crate corner is how a pilot gets wedged against a wall.
    let ax = 0;
    let ay = 0;
    if (Math.abs(dy) < Math.abs(dx)) {
      if (Math.abs(dy) > 2) ay = Math.sign(dy);
      else ax = Math.sign(dx);
    } else if (Math.abs(dx) > 2) {
      ax = Math.sign(dx);
    } else {
      ay = Math.sign(dy);
    }
    return { ax, ay, sneak, sprint, pendingCoin: null };
  }
  return { ax: dx / d, ay: dy / d, sneak, sprint, pendingCoin: null };
}
