// Vesper Vault — flat geometry: angles, line of sight, cone fans and
// circle-vs-tile sliding. Everything here is pure and deterministic; the
// world and the guards both steer through it, and the drawn cone uses
// the same raycast the vision test uses, so what the player sees is
// exactly what a guard sees.

import { COLS, ROWS, TILE } from './config.js';

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(a, b) {
  return wrapAngle(a - b);
}

export function distance(x0, y0, x1, y1) {
  return Math.hypot(x1 - x0, y1 - y0);
}

export function tileCenter(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export function tileAt(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isSolidTile(grid, tx, ty) {
  const c = tileAt(grid, tx, ty);
  return c === '#' || c === 'C';
}

// Sample the straight line between two points in small steps and report
// whether any solid tile interrupts it. Guard vision and the cone fan
// both call this, so they can never disagree.
export function losClear(grid, x0, y0, x1, y1) {
  const d = distance(x0, y0, x1, y1);
  const steps = Math.max(1, Math.ceil(d / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (isSolidTile(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

// Cast one ray from (ox, oy) along `angle` and return how far it travels
// before a solid tile stops it (at most maxDist).
export function rayHit(grid, ox, oy, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const steps = Math.max(1, Math.ceil(maxDist / 4));
  for (let i = 1; i <= steps; i++) {
    const d = (i / steps) * maxDist;
    const x = ox + dx * d;
    const y = oy + dy * d;
    if (isSolidTile(grid, Math.floor(x / TILE), Math.floor(y / TILE))) {
      return Math.max(0, d - 4);
    }
  }
  return maxDist;
}

// The vision cone as a polygon: the guard's position plus a fan of ray
// endpoints, so the drawn shape matches the raycast vision test.
export function conePolygon(grid, ox, oy, facing, range, halfAngle, rays = 30) {
  const points = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + ((2 * halfAngle) * i) / rays;
    const d = rayHit(grid, ox, oy, a, range);
    points.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d });
  }
  return points;
}

// Does a circle of radius r centred at (x, y) overlap any solid tile?
export function circleHitsSolid(grid, x, y, r) {
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolidTile(grid, tx, ty)) continue;
      const cx = clamp(x, tx * TILE, tx * TILE + TILE);
      const cy = clamp(y, ty * TILE, ty * TILE + TILE);
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
}

// Try to move a circle by (dx, dy) toward a target point. Candidates are
// tried in order — whole step, x-only, y-only, then two sideways nudges —
// and the collision-free one landing nearest the target wins, preferring
// real movement over standing still. This is what keeps guards from
// pressing into a shelf forever and lets the thief slide along walls.
export function attemptMove(grid, x, y, r, dx, dy, tx, ty) {
  const targetX = tx === undefined ? x + dx : tx;
  const targetY = ty === undefined ? y + dy : ty;
  const candidates = [
    [dx, dy],
    [dx, 0],
    [0, dy],
    [dx, -dy * 0.5],
    [-dx * 0.5, dy],
  ];
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const [cx, cy] = candidates[i];
    if (cx === 0 && cy === 0) continue;
    const nx = x + cx;
    const ny = y + cy;
    if (circleHitsSolid(grid, nx, ny, r)) continue;
    const score = distance(nx, ny, targetX, targetY);
    // A tiny preference for the earlier candidate breaks near-ties toward
    // the fuller step instead of a sideways scrape.
    const adjusted = score + i * 0.001;
    if (adjusted < bestScore) {
      bestScore = adjusted;
      best = { x: nx, y: ny, moved: Math.hypot(cx, cy) };
    }
  }
  if (!best) return { x, y, moved: 0 };
  return best;
}

// Walk from (x, y) toward (tx, ty) at `speed` for one step of dt,
// sliding around solid tiles. Returns the new position and how far it moved.
export function stepToward(grid, x, y, r, tx, ty, speed, dt) {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return { x, y, moved: 0 };
  const step = Math.min(speed * dt, d);
  const mx = (dx / d) * step;
  const my = (dy / d) * step;
  return attemptMove(grid, x, y, r, mx, my, tx, ty);
}
