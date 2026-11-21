// Vesper Vault — guards: creation, the vision test and the five-mood
// machine (patrol, suspect, search, chase, return). A guard never decides
// alone: the world feeds it what it sees and hears, and it answers with
// where it walks and where it looks.

import {
  GUARD_RADIUS,
  GUARD_SPEED,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  SNEAK_VISION_FACTOR,
  DETECT_BASE_RATE,
  DETECT_MIN_FACTOR,
  DARK_EXPOSURE,
} from './config.js';
import { angleDiff, clamp, dist, lineOfSight, moveCircle, turnToward } from './geometry.js';
import { tileCenter } from './levels.js';

export function createGuard(def, index) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  const next = def.waypoints[1] ?? def.waypoints[0];
  const n2 = tileCenter(next[0], next[1]);
  return {
    id: index,
    x: start.x,
    y: start.y,
    radius: GUARD_RADIUS,
    // Facing starts along the first patrol leg.
    facing: Math.atan2(n2.y - start.y, n2.x - start.x),
    mood: 'patrol',
    waypointIndex: 1 % def.waypoints.length,
    pauseLeft: 0,
    pauseTotal: def.pause,
    sweepBase: 0,
    sweepTime: 0,
    // A suspect/search/chase target, in world pixels.
    targetX: start.x,
    targetY: start.y,
    searchTime: 0,
    lastSeenX: start.x,
    lastSeenY: start.y,
    lostTime: 0,
    seesPlayer: false,
    // How strongly this guard is filling the alarm right now.
    fillRate: 0,
    // Footstep cadence for the positional audio bed.
    stepTimer: 0,
    moving: false,
  };
}

// Can this guard see the player from where it stands? The cone is range,
// half-angle and line of sight; sneaking shrinks the range to 70%.
// Returns the fill rate (0 when the player is unseen).
export function visionTest(guard, player, exposure, solids) {
  const d = dist(guard.x, guard.y, player.x, player.y);
  const range = VISION_RANGE * (player.sneaking ? SNEAK_VISION_FACTOR : 1);
  if (d > range) return 0;
  if (!lineOfSight(guard.x, guard.y, player.x, player.y, solids)) return 0;
  // Arm's length: a guard feels the player there whatever way it faces.
  if (d < 30) return DETECT_BASE_RATE * exposure;
  const toPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDiff(guard.facing, toPlayer)) > VISION_HALF_ANGLE) return 0;
  const closeness = 1 - d / range;
  const strength = DETECT_MIN_FACTOR + (1 - DETECT_MIN_FACTOR) * closeness;
  return DETECT_BASE_RATE * strength * exposure;
}

// Walk toward (tx, ty) at `speed`, sliding along walls. Returns true when
// the guard arrived within 6px of the target.
export function walkToward(guard, tx, ty, speed, dt, solids) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d < 6) return true;
  const step = Math.min(speed * dt, d);
  const nx = guard.x + ((tx - guard.x) / d) * step;
  const ny = guard.y + ((ty - guard.y) / d) * step;
  const moved = moveCircle(guard.x, guard.y, nx - guard.x, ny - guard.y, guard.radius, solids);
  const before = dist(guard.x, guard.y, tx, ty);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.moving = dist(guard.x, guard.y, tx, ty) < before - 0.01;
  // Face the direction of travel while walking.
  const want = Math.atan2(ty - guard.y, tx - guard.x);
  guard.facing = turnToward(guard.facing, want, 7 * dt);
  return dist(guard.x, guard.y, tx, ty) < 6;
}

// One fixed step of the mood machine. `sense` carries what the world
// worked out this step: whether the guard sees the player, where the
// player was heard, and the shared alarm level.
export function updateGuard(guard, def, dt, solids, sense) {
  const wps = def.waypoints;
  const wp = (i) => tileCenter(wps[i][0], wps[i][1]);

  // Hearing: a noise the guard is in earshot of becomes a search target,
  // unless the guard is already chasing.
  if (sense.heard && guard.mood !== 'chase') {
    guard.targetX = sense.heard.x;
    guard.targetY = sense.heard.y;
    if (guard.mood === 'patrol' || guard.mood === 'return') {
      guard.mood = 'search';
      guard.searchTime = 0;
    }
  }
  // A walking player heard up close only makes a patrolling guard suspect.
  if (sense.suspected && guard.mood === 'patrol') {
    guard.mood = 'suspect';
    guard.targetX = sense.suspected.x;
    guard.targetY = sense.suspected.y;
    guard.sweepTime = 0;
  }

  switch (guard.mood) {
    case 'patrol': {
      if (guard.pauseLeft > 0) {
        // Paused at a waypoint: sweep the facing around the travel direction.
        guard.pauseLeft -= dt;
        guard.sweepTime += dt;
        const sweep = Math.sin((guard.sweepTime / Math.max(guard.pauseTotal, 0.1)) * Math.PI * 2) * 0.54;
        guard.facing = guard.sweepBase + sweep;
        guard.moving = false;
        if (guard.pauseLeft <= 0) {
          guard.waypointIndex = (guard.waypointIndex + 1) % wps.length;
        }
        break;
      }
      const t = wp(guard.waypointIndex);
      if (walkToward(guard, t.x, t.y, GUARD_SPEED.patrol, dt, solids)) {
        guard.pauseLeft = def.pause;
        guard.pauseTotal = def.pause;
        guard.sweepTime = 0;
        // Sweep around the direction the guard was travelling.
        const next = wp((guard.waypointIndex + 1) % wps.length);
        guard.sweepBase = Math.atan2(next.y - t.y, next.x - t.x);
      }
      break;
    }
    case 'suspect': {
      // Rooted, staring at the stimulus. A long stare that sees nothing
      // gives up and returns to the patrol.
      guard.moving = false;
      const want = Math.atan2(guard.targetY - guard.y, guard.targetX - guard.x);
      guard.facing = turnToward(guard.facing, want, 5 * dt);
      guard.sweepTime += dt;
      if (guard.sweepTime > 2.6) {
        guard.mood = 'return';
      }
      break;
    }
    case 'search': {
      guard.searchTime += dt;
      if (walkToward(guard, guard.targetX, guard.targetY, GUARD_SPEED.search, dt, solids)) {
        // Arrived: sweep the area for ~2.2s, then give up.
        guard.sweepTime += dt;
        const sweep = Math.sin((guard.sweepTime / 2.2) * Math.PI * 2) * 0.9;
        const base = Math.atan2(guard.targetY - guard.y, guard.targetX - guard.x);
        guard.facing = base + sweep;
        if (guard.sweepTime > 2.2) {
          guard.mood = 'return';
          guard.sweepTime = 0;
        }
      } else {
        guard.sweepTime = 0;
      }
      break;
    }
    case 'chase': {
      // Run at the player's last seen spot; the world refreshes it while
      // the player is visible. Losing contact cools the chase to a search.
      if (sense.seesPlayer) {
        guard.lastSeenX = sense.playerX;
        guard.lastSeenY = sense.playerY;
        guard.lostTime = 0;
      } else {
        guard.lostTime += dt;
      }
      walkToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD_SPEED.chase, dt, solids);
      if (guard.lostTime > 3.2) {
        guard.mood = 'search';
        guard.targetX = guard.lastSeenX;
        guard.targetY = guard.lastSeenY;
        guard.searchTime = 0;
        guard.sweepTime = 0;
      }
      break;
    }
    case 'return': {
      // Walk back to the current patrol waypoint, then resume the loop.
      const t = wp(guard.waypointIndex);
      if (walkToward(guard, t.x, t.y, GUARD_SPEED.return, dt, solids)) {
        guard.mood = 'patrol';
        guard.pauseLeft = 0.4;
        guard.pauseTotal = 0.4;
        guard.sweepTime = 0;
        guard.sweepBase = guard.facing;
      }
      break;
    }
  }

  // Footstep timer for the audio bed: faster in chase.
  if (guard.moving) {
    guard.stepTimer -= dt;
  }
  return guard;
}

// The light at a point: 1.0 under a lamp, DARK_EXPOSURE elsewhere.
export function sampleExposure(x, y, lamps, lampRadius) {
  for (let i = 0; i < lamps.length; i++) {
    const dx = x - lamps[i].x;
    const dy = y - lamps[i].y;
    if (dx * dx + dy * dy <= lampRadius * lampRadius) return 1.0;
  }
  return DARK_EXPOSURE;
}

export { clamp };
