// Vesper Vault — the three floors of the museum.
// Each floor is built as a tile map (32 x 18, one tile = 40px) plus its
// patrol definitions, its brief and its par time. Legend:
//   '#' wall   'C' crate   'S' shelf   '.' open floor   'L' lamp pool
//   'P' player start   'R' relic   'T' treasure   'E' exit
// Walls, crates and shelves are solid and block a guard's sight; the exit
// stays sealed until the player holds the floor's relic.

import { COLS, ROWS, FLOOR_PARS } from './config.js';

function blankGrid() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
}

function frameWalls(g) {
  for (let x = 0; x < COLS; x++) {
    g[0][x] = '#';
    g[ROWS - 1][x] = '#';
  }
  for (let y = 0; y < ROWS; y++) {
    g[y][0] = '#';
    g[y][COLS - 1] = '#';
  }
}

// A vertical wall down column `col`, rows r0..r1, with open gaps.
function vWall(g, col, r0, r1, gaps = []) {
  for (let y = r0; y <= r1; y++) if (!gaps.includes(y)) g[y][col] = '#';
}

// A horizontal wall across row `row`, columns c0..c1, with open gaps.
function hWall(g, row, c0, c1, gaps = []) {
  for (let x = c0; x <= c1; x++) if (!gaps.includes(x)) g[row][x] = '#';
}

// A solid block of crates ('C') or shelves ('S'), w by h tiles.
function block(g, c0, r0, w, h, ch) {
  for (let y = r0; y < r0 + h; y++) {
    for (let x = c0; x < c0 + w; x++) g[y][x] = ch;
  }
}

function put(g, x, y, ch) {
  g[y][x] = ch;
}

function freeze(g) {
  return g.map((row) => row.join(''));
}

function floorI() {
  const g = blankGrid();
  frameWalls(g);
  // Three vertical chambers split by partitions at columns 11 and 22.
  vWall(g, 11, 1, 16, [8, 13]); // west partition: gaps at rows 8 and 13
  vWall(g, 22, 1, 16, [8, 4]); // east partition: gaps at rows 8 and 4
  // Crate pairs mid-room in each chamber, north and south halves.
  block(g, 3, 4, 2, 2, 'C');
  block(g, 13, 4, 2, 2, 'C');
  block(g, 24, 4, 2, 2, 'C');
  block(g, 5, 12, 2, 2, 'C');
  block(g, 14, 12, 2, 2, 'C');
  block(g, 27, 12, 2, 2, 'C');
  put(g, 2, 2, 'P');
  put(g, 26, 2, 'R');
  put(g, 16, 2, 'T');
  put(g, 27, 14, 'T');
  put(g, 7, 15, 'T');
  put(g, 6, 7, 'L');
  put(g, 17, 7, 'L');
  put(g, 27, 7, 'L');
  put(g, 17, 15, 'L');
  put(g, 30, 8, 'E');
  put(g, 30, 9, 'E');
  return {
    name: 'Floor I — The Long Gallery',
    relicName: 'the Star of Vesper',
    brief: 'Lift the Star of Vesper from the east room. The exit seals until you hold it.',
    par: FLOOR_PARS[0],
    grid: freeze(g),
    patrols: [
      { waypoints: [[5, 3], [5, 9]], pause: 1.6 }, // west chamber column
      { waypoints: [[16, 2], [16, 8], [16, 15], [16, 8]], pause: 1.1 }, // middle long column
      { waypoints: [[29, 3], [29, 14]], pause: 0.9 }, // east column
    ],
  };
}

function floorII() {
  const g = blankGrid();
  frameWalls(g);
  // A wall band with gaps across rows 7 and 13.
  hWall(g, 7, 1, 30, [4, 15, 26]);
  hWall(g, 13, 1, 30, [7, 17, 27]);
  // The walled relic room along the south edge, doors at (11,15) and (22,15).
  hWall(g, 14, 1, 30, [11, 22]);
  // Shelf-dense south-west stacks.
  block(g, 3, 9, 2, 2, 'S');
  block(g, 6, 11, 2, 2, 'S');
  block(g, 9, 9, 2, 2, 'S');
  block(g, 3, 15, 2, 2, 'S');
  block(g, 24, 9, 2, 2, 'S');
  block(g, 24, 11, 2, 2, 'S');
  put(g, 2, 2, 'P');
  put(g, 17, 15, 'R');
  put(g, 10, 2, 'T');
  put(g, 5, 15, 'T');
  put(g, 27, 15, 'T');
  put(g, 3, 4, 'L');
  put(g, 3, 12, 'L');
  put(g, 20, 5, 'L');
  put(g, 30, 15, 'E');
  put(g, 30, 16, 'E');
  return {
    name: 'Floor II — The Archive Stacks',
    relicName: 'the Amber Codex',
    brief: 'The Amber Codex sleeps between the stacks. Shelves hide you; the lamps do not.',
    par: FLOOR_PARS[1],
    grid: freeze(g),
    patrols: [
      { waypoints: [[8, 2], [8, 6], [12, 6], [12, 2]], pause: 0.8 }, // north-middle rectangle
      { waypoints: [[2, 8], [10, 8]], pause: 1.2 }, // row-8 corridor
      { waypoints: [[28, 2], [28, 5], [29, 5], [29, 2]], pause: 0.7 }, // north-east box
      { waypoints: [[13, 15], [20, 15]], pause: 0.6 }, // inside the relic room
    ],
  };
}

function floorIII() {
  const g = blankGrid();
  frameWalls(g);
  // Partitions at columns 11 and 22, door gaps at rows 4, 8 and 11.
  vWall(g, 11, 1, 16, [4, 8, 11]);
  vWall(g, 22, 1, 16, [4, 8, 11]);
  // The walled vault cell at the centre: walls cols 15-18, rows 5-8,
  // a single door in the south wall at (16,8).
  hWall(g, 5, 15, 18, []);
  hWall(g, 8, 15, 18, [16]);
  vWall(g, 15, 5, 8, []);
  vWall(g, 18, 5, 8, []);
  // Large shelf blocks flanking the centre.
  block(g, 3, 4, 4, 2, 'S');
  block(g, 3, 10, 4, 2, 'S');
  block(g, 25, 4, 4, 2, 'S');
  block(g, 25, 10, 4, 2, 'S');
  put(g, 2, 2, 'P');
  put(g, 16, 7, 'R');
  put(g, 8, 2, 'T');
  put(g, 26, 2, 'T');
  put(g, 16, 14, 'T');
  put(g, 5, 15, 'T');
  put(g, 16, 2, 'L');
  put(g, 16, 10, 'L');
  put(g, 5, 8, 'L');
  put(g, 26, 8, 'L');
  put(g, 10, 15, 'L');
  put(g, 22, 15, 'L');
  put(g, 30, 15, 'E');
  put(g, 30, 16, 'E');
  return {
    name: 'Floor III — The Vesper Vault',
    relicName: 'the Heart of the Vesper',
    brief: 'The Heart of the Vesper, and every guard the museum has left. Earn the dark.',
    par: FLOOR_PARS[2],
    grid: freeze(g),
    patrols: [
      { waypoints: [[16, 2], [16, 4]], pause: 2.2 }, // north sentry
      { waypoints: [[8, 8], [8, 13], [9, 13], [9, 8]], pause: 0.7 }, // west-centre box
      { waypoints: [[24, 8], [29, 8], [29, 13], [24, 13]], pause: 0.7 }, // east box
      { waypoints: [[13, 10], [19, 10], [19, 14], [13, 14]], pause: 0.5 }, // south-middle rectangle
      { waypoints: [[14, 9], [18, 9], [18, 10], [14, 10]], pause: 1.4 }, // vault approach
    ],
  };
}

export const LEVELS = [floorI(), floorII(), floorIII()];

// Tile centre in world pixels.
export function tileCenter(tx, ty) {
  return { x: tx * 40 + 20, y: ty * 40 + 20 };
}
