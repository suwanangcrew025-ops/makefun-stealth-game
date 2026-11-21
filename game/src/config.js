// Vesper Vault — tuning constants and the night palette.
// One place holds every number the simulation uses, so a balance change
// never has to hunt through the world, guard or render code.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;

// Actor sizes (pixels, radius from centre).
export const PLAYER_RADIUS = 12;
export const GUARD_RADIUS = 13;

// Player gaits: sneak is silent and hard to see, walk is the default,
// sprint is loud and fast.
export const SPEED_SNEAK = 76;
export const SPEED_WALK = 138;
export const SPEED_SPRINT = 222;
// Hearing radii: a walking thief only worries a guard standing close by,
// a sprinting one is heard across the room.
export const HEAR_WALK = 44;
export const HEAR_SPRINT = 128;

// Guard speeds per mood.
export const GUARD_PATROL = 60;
export const GUARD_SEARCH = 94;
export const GUARD_CHASE = 172;
export const GUARD_RETURN = 96;

// Vision: cone range and half-angle, plus the point-blank rule — a guard
// standing on top of the thief sees them whatever way it faces.
export const VISION_RANGE = 238;
export const VISION_HALF_ANGLE = (33 * Math.PI) / 180;
export const VISION_POINT_BLANK = 30;
// Detection fill: ~1.05/s at point blank in full light, floored at 25%
// of that strength at the edge of the cone.
export const DETECT_BASE = 1.05;
export const DETECT_MIN_FACTOR = 0.25;
// Crouching shrinks a guard's vision range to 70%.
export const SNEAK_VISION_FACTOR = 0.7;

// The shared alarm meter: 0.32 a guard stops and stares, 0.68 they come
// looking, 1.0 every guard gives chase. It drains when nobody sees you.
export const ALARM_DECAY = 0.3;
export const ALARM_SUSPECT = 0.32;
export const ALARM_SEARCH = 0.68;
export const ALARM_FULL = 1.0;
// A chasing guard that loses sight for this long gives up to a search.
export const CHASE_LOSE_TIME = 3.2;
// A chasing guard this close catches the thief.
export const CATCH_DISTANCE = 24;

// Light: a lamp pool of this radius counts as lit; everywhere else the
// thief is mostly hidden.
export const LAMP_RADIUS = 118;
export const EXPOSURE_DARK = 0.34;
export const EXPOSURE_LIT = 1.0;

// The coin: three a floor, a throw of at most this far, a ring that
// pulls every guard within this radius to the landing spot.
export const COINS_PER_FLOOR = 3;
export const COIN_MAX_THROW = 264;
export const COIN_RING_RADIUS = 118;
export const COIN_FLIGHT_TIME = 0.45;

// Guard behaviour timings.
export const SWEEP_HALF_ANGLE = (31 * Math.PI) / 180;
export const SEARCH_SWEEP_TIME = 2.2;
export const SUSPECT_STARE_TIME = 1.2;

// Scoring: treasure, relic, ghost bonus for a floor never fully alarmed,
// and 5 points per second under par.
export const SCORE_TREASURE = 100;
export const SCORE_RELIC = 250;
export const SCORE_GHOST = 300;
export const SCORE_SPEED_PER_SECOND = 5;
export const PAR_TIMES = [75, 110, 140];

// Pickup radii.
export const PICKUP_RADIUS = 22;

// The night palette: deep blue floors, warm lamp pools, amber cones.
export const PALETTE = {
  floorA: '#20263d',
  floorB: '#1b2136',
  wall: '#39415e',
  wallTop: '#4d5878',
  crate: '#7a5a34',
  crateEdge: '#5d4325',
  shelf: '#6b4e2e',
  lampGlow: 'rgba(255, 205, 110, 0.10)',
  lampCore: '#ffd77a',
  exit: '#3fd08a',
  exitGlow: 'rgba(63, 208, 138, 0.25)',
  relic: '#ffd94d',
  treasure: '#e8b23a',
  player: '#2f8f7a',
  playerDark: '#1d5c4e',
  guard: '#31406e',
  guardDark: '#232f52',
  coneCalm: 'rgba(255, 220, 90, 0.16)',
  coneCalmEdge: 'rgba(255, 220, 90, 0.35)',
  coneWary: 'rgba(255, 150, 40, 0.28)',
  coneWaryEdge: 'rgba(255, 150, 40, 0.55)',
  coneHot: 'rgba(255, 60, 50, 0.32)',
  coneHotEdge: 'rgba(255, 60, 50, 0.65)',
  hud: '#e8e4d8',
  hudDim: '#9aa3bd',
  danger: '#ff5a4d',
  panel: 'rgba(6, 10, 24, 0.86)',
};
