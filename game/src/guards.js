// Vesper Vault — guards: creation, the vision test and the five-mood
// machine (patrol, suspect, search, chase, return).
// A guard never decides anything on its own about the alarm: the world
// computes the shared meter and hands each guard its seeing rate, and
// the guard only walks its own mood.

import {
  ALARM_SEARCH,
  ALARM_SUSPECT,
  CHASE_LOSE_TIME,
  DETECT_BASE,
  DETECT_MIN_FACTOR,
  EXPOSURE_DARK,
  EXPOSURE_LIT,
  GUARD_CHASE,
  GUARD_PATROL,
  GUARD_RETURN,
  GUARD_SEARCH,
  LAMP_RADIUS,
  SEARCH_SWEEP_TIME,
  SNEAK_VISION_FACTOR,
  SUSPECT_STARE_TIME,
  SWEEP_HALF_ANGLE,
  VISION_HALF_ANGLE,
  VISION_POINT_BLANK,
  VISION_RANGE,
} from './config.js';
import { angleDiff, losClear, stepToward, tileCenter } from './geometry.js';

export function createGuard(def, index) {
  const start = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  const next = tileCenter(def.waypoints[1][0], def.waypoints[1][1]);
  return {
    id: index,
    x: start.x,
    y: start.y,
    facing: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints: def.waypoints,
    pause: def.pause,
    wp: 0,
    mood: 'patrol',
    pauseLeft: 0,
    sweepBase: Math.atan2(next.y - start.y, next.x - start.x),
    sweepT: 0,
    stimulus: null,
    stareT: 0,
    sweepLeft: 0,
    loseT: 0,
    seeRate: 0,
    seesPlayer: false,
  };
}

function guardTarget(g) {
  const wp = g.waypoints[(g.wp + 1) % g.waypoints.length];
  return tileCenter(wp[0], wp[1]);
}

// How lit is the thief standing at (x, y)? Full light inside a lamp
// pool, mostly hidden anywhere else.
export function exposureAt(world, x, y) {
  for (const lamp of world.lamps) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    if (dx * dx + dy * dy < LAMP_RADIUS * LAMP_RADIUS) return EXPOSURE_LIT;
  }
  return EXPOSURE_DARK;
}

// The vision test, in the guard's favour only where the rules say so:
// inside the cone and with a clear line of sight, or within 30px
// (point blank) whatever way the guard faces — still needing line of
// sight. The fill scales with proximity and with the light the thief
// stands in, and crouching shrinks the range.
export function visionRate(guard, world) {
  const p = world.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const d = Math.hypot(dx, dy);
  let range = VISION_RANGE;
  if (p.gait === 'sneak') range *= SNEAK_VISION_FACTOR;
  if (d > range) return 0;
  if (d > VISION_POINT_BLANK) {
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, guard.facing)) > VISION_HALF_ANGLE) return 0;
  }
  if (!losClear(world.grid, guard.x, guard.y, p.x, p.y)) return 0;
  const proximity = d <= VISION_POINT_BLANK ? 1 : Math.max(DETECT_MIN_FACTOR, 1 - 0.75 * (d / range));
  return DETECT_BASE * proximity * exposureAt(world, p.x, p.y);
}

function arriveAtWaypoint(g, world) {
  g.wp = (g.wp + 1) % g.waypoints.length;
  g.pauseLeft = g.pause;
  g.sweepT = 0;
  // The sweep fans around the direction the guard was travelling.
  g.sweepBase = g.facing;
}

// One fixed step of the mood machine. `world` carries the alarm, the
// last known position and the grid; the guard only moves itself.
export function updateGuard(g, world, dt) {
  const sees = g.seesPlayer;

  if (g.mood === 'chase') {
    if (sees) {
      g.loseT = 0;
      world.lastKnown = { x: world.player.x, y: world.player.y };
    } else {
      g.loseT += dt;
    }
    if (g.loseT > CHASE_LOSE_TIME) {
      g.mood = 'search';
      g.stimulus = { ...world.lastKnown };
      g.sweepLeft = 0;
      g.loseT = 0;
      return;
    }
    const moved = stepToward(world.grid, g.x, g.y, 13, world.player.x, world.player.y, GUARD_CHASE, dt);
    if (moved.moved > 0) {
      g.facing = Math.atan2(world.player.y - g.y, world.player.x - g.x);
    }
    g.x = moved.x;
    g.y = moved.y;
    return;
  }

  if (g.mood === 'suspect') {
    // Rooted, staring at the stimulus. A fresh sighting refreshes the
    // stare; a long quiet spell sends the guard to look, or home.
    if (sees) {
      g.stareT = SUSPECT_STARE_TIME;
      g.facing = Math.atan2(world.player.y - g.y, world.player.x - g.x);
      world.lastKnown = { x: world.player.x, y: world.player.y };
    } else if (g.stimulus) {
      g.facing = Math.atan2(g.stimulus.y - g.y, g.stimulus.x - g.x);
    }
    g.stareT -= dt;
    if (world.alarm >= ALARM_SEARCH) {
      g.mood = 'search';
      g.stimulus = { ...world.lastKnown };
      g.sweepLeft = 0;
      return;
    }
    if (g.stareT <= 0 && !sees) {
      if (world.alarm >= ALARM_SUSPECT) {
        g.mood = 'search';
        g.stimulus = { ...world.lastKnown };
        g.sweepLeft = 0;
      } else {
        g.mood = 'return';
      }
    }
    return;
  }

  if (g.mood === 'search') {
    if (sees && world.alarm >= ALARM_SEARCH) {
      // Fresh eyes on the thief while searching: keep hunting the
      // last known spot, which the world just refreshed.
      g.stimulus = { ...world.lastKnown };
    }
    if (g.stimulus) {
      const d = Math.hypot(g.stimulus.x - g.x, g.stimulus.y - g.y);
      if (d > 8) {
        const moved = stepToward(world.grid, g.x, g.y, 13, g.stimulus.x, g.stimulus.y, GUARD_SEARCH, dt);
        if (moved.moved > 0) {
          g.facing = Math.atan2(g.stimulus.y - g.y, g.stimulus.x - g.x);
        }
        g.x = moved.x;
        g.y = moved.y;
        return;
      }
    }
    // Arrived: sweep the spot for a while, then walk home.
    if (g.sweepLeft <= 0) g.sweepLeft = SEARCH_SWEEP_TIME;
    g.sweepLeft -= dt;
    g.sweepT += dt;
    g.facing = g.sweepBase + Math.sin(g.sweepT * 1.4) * SWEEP_HALF_ANGLE;
    if (g.sweepLeft <= 0) g.mood = 'return';
    return;
  }

  if (g.mood === 'return') {
    const home = tileCenter(g.waypoints[g.wp][0], g.waypoints[g.wp][1]);
    const d = Math.hypot(home.x - g.x, home.y - g.y);
    if (d <= 6) {
      g.x = home.x;
      g.y = home.y;
      g.mood = 'patrol';
      g.pauseLeft = g.pause * 0.5;
      return;
    }
    const moved = stepToward(world.grid, g.x, g.y, 13, home.x, home.y, GUARD_RETURN, dt);
    if (moved.moved > 0) {
      g.facing = Math.atan2(home.y - g.y, home.x - g.x);
    }
    g.x = moved.x;
    g.y = moved.y;
    return;
  }

  // patrol
  if (g.pauseLeft > 0) {
    g.pauseLeft -= dt;
    g.sweepT += dt;
    g.facing = g.sweepBase + Math.sin(g.sweepT * 1.1) * SWEEP_HALF_ANGLE;
    return;
  }
  const target = guardTarget(g);
  const moved = stepToward(world.grid, g.x, g.y, 13, target.x, target.y, GUARD_PATROL, dt);
  if (moved.moved > 0) {
    g.facing = Math.atan2(target.y - g.y, target.x - g.x);
  }
  g.x = moved.x;
  g.y = moved.y;
  if (Math.hypot(target.x - g.x, target.y - g.y) <= 6) {
    g.x = target.x;
    g.y = target.y;
    arriveAtWaypoint(g, world);
  }
}

// A patrol-only step for the title screen: the guards walk their beats
// with no thief to see, so the cover shows a living floor.
export function updateGuardAmbient(g, world, dt) {
  const savedMood = g.mood;
  const savedSees = g.seesPlayer;
  g.mood = 'patrol';
  g.seesPlayer = false;
  updateGuard(g, world, dt);
  g.mood = savedMood;
  g.seesPlayer = savedSees;
}
