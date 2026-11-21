// Vesper Vault — tuning constants and the night palette.
// Every number the simulation reads lives here, so a balance pass touches
// one file and the rest of the game follows.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 720
export const STEP = 1 / 60; // fixed simulation step, seconds

// Player: radius and gaits. Sneak is silent, walk is heard up close,
// sprint is fast, loud, and draws a dashed red noise ring.
export const PLAYER_RADIUS = 12;
export const GAIT = {
  sneak: { speed: 76, hearing: 0 },
  walk: { speed: 138, hearing: 44 },
  sprint: { speed: 222, hearing: 128 },
};

// Guards: radius and mood speeds.
export const GUARD_RADIUS = 13;
export const GUARD_SPEED = {
  patrol: 60,
  search: 94,
  chase: 172,
  return: 96,
};

// Vision: cone range and half-angle; sneaking shrinks the range to 70%.
// Detection fills ~1.05/s at point blank in full light, floored at 25%
// of that strength at the far edge of the cone.
export const VISION_RANGE = 238;
export const VISION_HALF_ANGLE = (33 * Math.PI) / 180;
export const SNEAK_VISION_FACTOR = 0.7;
export const DETECT_BASE_RATE = 1.05;
export const DETECT_MIN_FACTOR = 0.25;

// Light: a lamp tile pools light out to this radius. Exposure 1.0 under a
// lamp, 0.34 in the dark; detection fill scales with exposure.
export const LAMP_RADIUS = 118;
export const DARK_EXPOSURE = 0.34;

// Alarm: one shared meter, 0..1. It decays when nobody sees the player.
export const ALARM_DECAY = 0.3;
export const ALARM_SUSPECT = 0.32;
export const ALARM_SEARCH = 0.68;
export const ALARM_FULL = 1.0;
export const CHASE_COOL_TIME = 3.2; // seconds without contact before a chase cools
export const CATCH_DISTANCE = 24; // a chasing guard this close catches the player

// Noise and coins.
export const COIN_COUNT = 3; // coins per floor
export const COIN_MAX_THROW = 264; // px
export const COIN_RING_RADIUS = 118; // guards inside this walk to the ring

// Scoring.
export const SCORE_TREASURE = 100;
export const SCORE_RELIC = 250;
export const SCORE_GHOST = 300; // floor never fully alarmed
export const SCORE_SPEED_PER_SECOND = 5; // per second under par
export const FLOOR_PARS = [75, 110, 140]; // seconds, floors I..III

// The night palette: deep blue stone, warm lamp pools, pale cones.
export const PALETTE = {
  background: '#0b0e1a',
  floorA: '#1a2033',
  floorB: '#161b2c',
  floorLine: '#232a42',
  wall: '#2e3a55',
  wallTop: '#46587f',
  wallEdge: '#1c2438',
  crate: '#6b4a2f',
  crateEdge: '#8a6238',
  crateLine: '#4a3220',
  shelf: '#54406b',
  shelfEdge: '#6f568c',
  shelfLine: '#3a2c4b',
  lampPool: 'rgba(255, 190, 90, 0.16)',
  lampCore: '#ffcf7d',
  lampGlow: 'rgba(255, 190, 90, 0.35)',
  cone: 'rgba(255, 220, 120, 0.15)',
  coneEdge: 'rgba(255, 220, 120, 0.35)',
  coneSuspect: 'rgba(255, 150, 60, 0.28)',
  coneChase: 'rgba(255, 70, 60, 0.30)',
  player: '#7fe3c0',
  playerDark: '#3f8f74',
  guard: '#e05a5a',
  guardDark: '#8f2f35',
  guardTrim: '#ffd76a',
  relic: '#ffd76a',
  treasure: '#8fd3ff',
  exit: '#7ee081',
  exitDark: '#2f6b3a',
  coin: '#ffe9a8',
  text: '#e8ecf7',
  textDim: '#9aa3bd',
  panel: 'rgba(10, 13, 26, 0.88)',
  panelEdge: '#46587f',
  danger: '#ff5a4e',
  warn: '#ff9a3c',
  calm: '#7fe3c0',
};
