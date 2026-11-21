// Vesper Vault — geometry: angles, raycasts, line of sight, vision cones
// and circle-versus-rectangle sliding collision. Nothing here touches the
// DOM, so the simulation can run in a browser or in a plain Node check.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Smallest signed turn from angle a to angle b, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// Turn `from` toward `target` by at most `maxStep` radians.
export function turnToward(from, target, maxStep) {
  const d = angleDiff(from, target);
  if (Math.abs(d) <= maxStep) return target;
  return from + Math.sign(d) * maxStep;
}

// Ray versus an axis-aligned rectangle (slab test). Returns the distance
// along the ray (ray origin + t * dir, dir unit length) of the nearest hit
// within maxDist, or Infinity when the ray misses the rect.
export function rayHitRect(ox, oy, dx, dy, rect, maxDist) {
  let tMin = 0;
  let tMax = maxDist;
  // X slab.
  if (Math.abs(dx) < 1e-9) {
    if (ox < rect.x || ox > rect.x + rect.w) return Infinity;
  } else {
    let t1 = (rect.x - ox) / dx;
    let t2 = (rect.x + rect.w - ox) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  // Y slab.
  if (Math.abs(dy) < 1e-9) {
    if (oy < rect.y || oy > rect.y + rect.h) return Infinity;
  } else {
    let t1 = (rect.y - oy) / dy;
    let t2 = (rect.y + rect.h - oy) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  return tMin;
}

// Cast a ray from (ox, oy) along `angle` out to maxDist and return the
// distance of the nearest solid rectangle hit, or maxDist when clear.
export function castRay(ox, oy, angle, maxDist, solids) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (let i = 0; i < solids.length; i++) {
    const t = rayHitRect(ox, oy, dx, dy, solids[i], maxDist);
    if (t < best) best = t;
  }
  return best;
}

// True when the segment (ax, ay)-(bx, by) is not cut by any solid rect.
export function lineOfSight(ax, ay, bx, by, solids) {
  const d = dist(ax, ay, bx, by);
  if (d < 1e-6) return true;
  const t = castRay(ax, ay, Math.atan2(by - ay, bx - ax), d, solids);
  return t >= d - 0.5;
}

// The vision cone as a polygon: the guard's position plus a fan of raycast
// endpoints, so the drawn cone is exactly what the guard can see.
export function conePolygon(ox, oy, facing, halfAngle, range, solids, rays = 30) {
  const pts = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const t = castRay(ox, oy, a, range, solids);
    pts.push({ x: ox + Math.cos(a) * t, y: oy + Math.sin(a) * t });
  }
  return pts;
}

// Move a circle of radius r from (x, y) by (dx, dy) against solid rects,
// sliding along walls: try the whole step, then x-only, then y-only, and
// keep the landing nearest the target.
export function moveCircle(x, y, dx, dy, r, solids) {
  const hits = (cx, cy) => {
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      const nx = clamp(cx, s.x, s.x + s.w);
      const ny = clamp(cy, s.y, s.y + s.h);
      const ddx = cx - nx;
      const ddy = cy - ny;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
    return false;
  };
  const tx = x + dx;
  const ty = y + dy;
  if (!hits(tx, ty)) return { x: tx, y: ty };
  const candidates = [];
  if (!hits(tx, y)) candidates.push({ x: tx, y });
  if (!hits(x, ty)) candidates.push({ x, y: ty });
  // Sideways nudges: slide along the wall face when blocked head-on.
  if (!hits(tx + Math.sign(dx) * r * 0.5, y)) {
    candidates.push({ x: tx + Math.sign(dx) * r * 0.5, y });
  }
  if (!hits(x, ty + Math.sign(dy) * r * 0.5)) {
    candidates.push({ x, y: ty + Math.sign(dy) * r * 0.5 });
  }
  let best = { x, y };
  let bestD = Infinity;
  for (const c of candidates) {
    const d = (c.x - tx) * (c.x - tx) + (c.y - ty) * (c.y - ty);
    const moved = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    // Prefer a landing that actually moves, then the one nearest the target.
    const score = d - Math.min(moved, 400) * 0.001;
    if (score < bestD) {
      bestD = score;
      best = c;
    }
  }
  return best;
}
