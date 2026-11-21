// Vesper Vault — rendering: floors, lamp pools, solids, vision cones,
// actors and the HUD alarm eye, plus the title, brief, caught, clear,
// victory and pause screens. Everything is drawn on one canvas with
// plain shapes and gradients; there are no image or font files.

import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  VIEW_H,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  LAMP_RADIUS,
  PALETTE,
  GAIT,
  PLAYER_RADIUS,
  COIN_RING_RADIUS,
} from './config.js';
import { conePolygon, dist } from './geometry.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = world.level.grid[y][x];
      if (ch === '#') continue; // walls are drawn as one mass below
      ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.strokeStyle = PALETTE.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Lamp pools: warm light spilling across the floor.
  for (const lamp of world.lamps) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, LAMP_RADIUS);
    g.addColorStop(0, PALETTE.lampGlow);
    g.addColorStop(0.55, PALETTE.lampPool);
    g.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, LAMP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSolids(ctx, world) {
  for (const s of world.solids) {
    if (s.kind === '#') {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.strokeStyle = PALETTE.wallEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    } else if (s.kind === 'C') {
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.strokeStyle = PALETTE.crateEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.strokeStyle = PALETTE.crateLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + 3, s.y + 3);
      ctx.lineTo(s.x + s.w - 3, s.y + s.h - 3);
      ctx.moveTo(s.x + s.w - 3, s.y + 3);
      ctx.lineTo(s.x + 3, s.y + s.h - 3);
      ctx.stroke();
    } else {
      // Shelf: tall dark rows with a brass rail.
      ctx.fillStyle = PALETTE.shelf;
      ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.strokeStyle = PALETTE.shelfEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.strokeStyle = PALETTE.shelfLine;
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(s.x + 3, s.y + i * 10);
        ctx.lineTo(s.x + s.w - 3, s.y + i * 10);
        ctx.stroke();
      }
    }
  }
}

function drawLootAndExit(ctx, world, time) {
  // Exit: a green doorway while sealed it shows a red bar.
  for (const e of world.exitTiles) {
    ctx.fillStyle = world.relic?.taken ? PALETTE.exit : PALETTE.exitDark;
    ctx.fillRect(e.x + 4, e.y + 2, e.w - 8, e.h - 4);
    if (world.relic?.taken) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2);
    } else {
      ctx.strokeStyle = PALETTE.danger;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + 10, e.y + 8);
      ctx.lineTo(e.x + e.w - 10, e.y + e.h - 8);
      ctx.moveTo(e.x + e.w - 10, e.y + 8);
      ctx.lineTo(e.x + 10, e.y + e.h - 8);
      ctx.stroke();
    }
  }
  // Treasures: small cyan gems that bob.
  for (const t of world.treasures) {
    if (t.taken) continue;
    const bob = Math.sin(time * 3 + t.x) * 2;
    ctx.fillStyle = PALETTE.treasure;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 9 + bob);
    ctx.lineTo(t.x + 7, t.y + bob);
    ctx.lineTo(t.x, t.y + 9 + bob);
    ctx.lineTo(t.x - 7, t.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 5 + bob);
    ctx.lineTo(t.x + 3, t.y + bob);
    ctx.lineTo(t.x, t.y + 5 + bob);
    ctx.lineTo(t.x - 3, t.y + bob);
    ctx.closePath();
    ctx.fill();
  }
  // The relic: a gold star that pulses.
  if (world.relic && !world.relic.taken) {
    const r = world.relic;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? 13 : 6;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Lamps: a brass dot at the pool's heart.
  for (const lamp of world.lamps) {
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 207, 125, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCone(ctx, guard, world) {
  const range = VISION_RANGE * (world.player.sneaking ? 0.7 : 1);
  const pts = conePolygon(guard.x, guard.y, guard.facing, VISION_HALF_ANGLE, range, world.solids);
  let fill = PALETTE.cone;
  let edge = PALETTE.coneEdge;
  if (guard.mood === 'chase') {
    fill = PALETTE.coneChase;
    edge = 'rgba(255, 70, 60, 0.6)';
  } else if (guard.mood === 'suspect' || guard.mood === 'search') {
    fill = PALETTE.coneSuspect;
    edge = 'rgba(255, 150, 60, 0.55)';
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard) {
  // Body: a dark-red coat with a brass trim and a pale face.
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.guardTrim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius - 3, 0, Math.PI * 2);
  ctx.stroke();
  // Facing tick: the nose of the patrol.
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * (guard.radius + 4), guard.y + Math.sin(guard.facing) * (guard.radius + 4));
  ctx.stroke();
  // "?" while suspect or searching, "!" while chasing.
  if (guard.mood === 'suspect' || guard.mood === 'search') {
    drawMark(ctx, guard.x, guard.y - 26, '?', PALETTE.warn);
  } else if (guard.mood === 'chase') {
    drawMark(ctx, guard.x, guard.y - 26, '!', PALETTE.danger);
  }
}

function drawMark(ctx, x, y, ch, color) {
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(ch, x, y);
  ctx.fillStyle = color;
  ctx.fillText(ch, x, y);
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (world.state === 'title') return;
  // Sprint noise ring: dashed red, radius = hearing.
  if (p.gait === 'sprint' && p.moving) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 90, 78, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, GAIT.sprint.hearing, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // A hooded thief: a mint cloak, darker when crouched low.
  ctx.fillStyle = p.sneaking ? PALETTE.playerDark : PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0e1a';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 4, p.y + Math.sin(p.facing) * 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  // Coins in flight, with a little arc height.
  for (const c of world.coins) {
    const k = Math.min(c.t / c.dur, 1);
    const lift = Math.sin(k * Math.PI) * 14;
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(c.x, c.y - lift, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d2f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Landed rings, fading.
  for (const r of world.rings) {
    ctx.strokeStyle = `rgba(255, 233, 168, ${Math.max(r.ttl, 0)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, COIN_RING_RADIUS * (1 - r.ttl / 0.9) + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The HUD alarm eye: closed and calm when unseen, open and red in alarm.
function drawAlarmEye(ctx, world) {
  const a = world.alarm;
  const x = VIEW_W - 150;
  const y = 34;
  const open = 0.25 + 0.75 * a; // lid height factor
  ctx.save();
  ctx.translate(x, y);
  // Eye outline.
  ctx.fillStyle = a >= 0.68 ? PALETTE.danger : a >= 0.32 ? PALETTE.warn : '#c8d0e8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12 * open + 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupil: grows and reddens with the alarm.
  ctx.fillStyle = a >= 0.32 ? '#3d0a08' : '#10142a';
  ctx.beginPath();
  ctx.arc(0, 0, 4 + 5 * a, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = a >= 0.68 ? PALETTE.danger : a >= 0.32 ? PALETTE.warn : PALETTE.calm;
  ctx.fillText(world.alarmWord.toUpperCase(), x + 34, y);
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(world.level.name, 14, 20);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(
    `Score ${world.score}   Loot ${world.lootGot}/${world.lootTotal}   Coins ${world.player.coins}   ${world.floorTime.toFixed(1)}s / par ${world.level.par}s`,
    14,
    40,
  );
  drawAlarmEye(ctx, world);
}

function drawPanel(ctx, title, lines, accent) {
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent || PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 34px serif';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 104 + i * 30);
  });
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(6, 8, 18, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.relic;
  ctx.font = 'bold 76px serif';
  ctx.fillText('VESPER VAULT', VIEW_W / 2, 240);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('Slip past the cones. Lift the relic. Vanish.', VIEW_W / 2, 300);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '17px sans-serif';
  ctx.fillText('WASD / arrows to move  ·  C sneak  ·  Shift sprint  ·  click tosses a coin', VIEW_W / 2, 350);
  ctx.fillText('P pause  ·  R restart floor  ·  M mute', VIEW_W / 2, 378);
  ctx.fillStyle = PALETTE.calm;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press Enter to begin the heist', VIEW_W / 2, 440);
}

function drawBrief(ctx, world) {
  ctx.fillStyle = 'rgba(6, 8, 18, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawPanel(ctx, world.level.name, [world.level.brief, `Par ${world.level.par}s  ·  Ghost bonus 300 if the alarm never fills`, 'Press Enter to slip in'], PALETTE.relic);
}

function drawCaught(ctx) {
  ctx.fillStyle = 'rgba(120, 10, 8, 0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawPanel(ctx, 'CAUGHT', ['The guards march you out into the night.', 'The floor resets. Your score rolls back to the floor start.', 'Press R to try the floor again'], PALETTE.danger);
}

function drawClear(ctx, world) {
  const s = world.clearStats || { time: 0, speedBonus: 0, ghostBonus: 0, loot: 0, lootTotal: 0, score: 0 };
  drawPanel(
    ctx,
    'FLOOR CLEAR',
    [
      `Cleared in ${s.time.toFixed(1)}s  ·  Loot ${s.loot}/${s.lootTotal}`,
      `Speed bonus +${s.speedBonus}  ·  Ghost bonus +${s.ghostBonus}`,
      `Score ${s.score}`,
      'Press Enter for the next floor',
    ],
    PALETTE.exit,
  );
}

function drawVictory(ctx, world) {
  drawPanel(
    ctx,
    'THE VAULT IS EMPTY',
    [
      'Three floors. Three relics. Not a single guard the wiser.',
      `Final score ${world.score}`,
      'Press Enter to play again',
    ],
    PALETTE.relic,
  );
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(6, 8, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawPanel(ctx, 'PAUSED', ['The museum holds its breath.', 'Press P to keep sneaking'], PALETTE.panelEdge);
}

export function render(ctx, world, time) {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, world);
  drawLootAndExit(ctx, world, time);
  drawSolids(ctx, world);
  for (const g of world.guards) drawCone(ctx, g, world);
  for (const g of world.guards) drawGuard(ctx, g);
  drawPlayer(ctx, world);
  if (world.state !== 'title') drawHud(ctx, world);
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'brief') drawBrief(ctx, world);
  if (world.state === 'caught') drawCaught(ctx);
  if (world.state === 'clear') drawClear(ctx, world);
  if (world.state === 'victory') drawVictory(ctx, world);
  if (world.paused && world.state === 'play') drawPause(ctx);
}
