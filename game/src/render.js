// Vesper Vault — the renderer: every pixel is drawn on one canvas,
// floors, lamp pools, vision cones, actors, the HUD alarm eye and the
// screen overlays. Only generic font families are used.

import { COLS, PALETTE, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon, tileCenter } from './geometry.js';
import { alarmWord } from './world.js';

function coneStyle(mood) {
  if (mood === 'chase') return { fill: PALETTE.coneHot, edge: PALETTE.coneHotEdge };
  if (mood === 'suspect' || mood === 'search') return { fill: PALETTE.coneWary, edge: PALETTE.coneWaryEdge };
  return { fill: PALETTE.coneCalm, edge: PALETTE.coneCalmEdge };
}

function drawFloor(ctx, world) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = world.grid[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (c === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 4);
        continue;
      }
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (c === 'C') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawLampPools(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of world.lamps) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 118);
    g.addColorStop(0, 'rgba(255, 205, 110, 0.20)');
    g.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 118, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const lamp of world.lamps) {
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 122, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawExit(ctx, world) {
  for (const e of world.exits) {
    const c = tileCenter(e.tx, e.ty);
    ctx.save();
    if (world.exitOpen) {
      ctx.shadowColor = PALETTE.exit;
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = world.exitOpen ? PALETTE.exit : '#2c6b4d';
    ctx.fillRect(c.x - 14, c.y - 14, 28, 28);
    ctx.restore();
    ctx.strokeStyle = world.exitOpen ? '#b8ffdd' : '#1d4a35';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x - 14, c.y - 14, 28, 28);
    ctx.fillStyle = '#062015';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', c.x, c.y + 1);
  }
}

function drawLoot(ctx, world) {
  for (const t of world.treasures) {
    if (t.taken) continue;
    ctx.fillStyle = PALETTE.treasure;
    ctx.fillRect(t.x - 8, t.y - 6, 16, 12);
    ctx.fillStyle = '#8a6410';
    ctx.fillRect(t.x - 8, t.y - 2, 16, 3);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 1;
    ctx.strokeRect(t.x - 8, t.y - 6, 16, 12);
  }
  if (world.relic && !world.relic.taken) {
    const r = world.relic;
    ctx.save();
    ctx.shadowColor = PALETTE.relic;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y - 11);
    ctx.lineTo(r.x + 4, r.y - 4);
    ctx.lineTo(r.x + 11, r.y);
    ctx.lineTo(r.x + 4, r.y + 4);
    ctx.lineTo(r.x, r.y + 11);
    ctx.lineTo(r.x - 4, r.y + 4);
    ctx.lineTo(r.x - 11, r.y);
    ctx.lineTo(r.x - 4, r.y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCoin(ctx, world) {
  const coin = world.coin;
  if (!coin) return;
  if (coin.state === 'flying') {
    const t = Math.min(1, coin.t / 0.45);
    const x = coin.x0 + (coin.x1 - coin.x0) * t;
    const y = coin.y0 + (coin.y1 - coin.y0) * t - Math.sin(t * Math.PI) * 34;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a8821a';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    const grow = 1 - coin.ringT / 0.6;
    ctx.strokeStyle = `rgba(255, 224, 102, ${0.9 - grow * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x1, coin.y1, 10 + grow * 44, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCones(ctx, world) {
  for (const g of world.guards) {
    const style = coneStyle(g.mood);
    const pts = conePolygon(world.grid, g.x, g.y, g.facing, 238, (33 * Math.PI) / 180, 30);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = style.edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawActors(ctx, world) {
  const showPlayer = world.screen !== 'title';
  for (const g of world.guards) {
    // Guard: a navy uniform, a cap brim toward the facing, and a mark
    // overhead when the thief has been noticed.
    ctx.fillStyle = g.mood === 'chase' ? '#5a2320' : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8fa3d9';
    ctx.lineWidth = 2;
    ctx.stroke();
    const bx = g.x + Math.cos(g.facing) * 13;
    const by = g.y + Math.sin(g.facing) * 13;
    ctx.strokeStyle = '#d7def5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.facing) * 6, g.y + Math.sin(g.facing) * 6);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath();
    ctx.arc(g.x - Math.cos(g.facing) * 4, g.y - Math.sin(g.facing) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
    if (g.mood === 'suspect' || g.mood === 'search') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb347';
      ctx.fillText('?', g.x, g.y - 26);
    } else if (g.mood === 'chase') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff5a4d';
      ctx.fillText('!', g.x, g.y - 26);
    }
  }
  if (showPlayer) {
    const p = world.player;
    const r = p.gait === 'sneak' ? 10 : 12;
    if (p.gait === 'sprint') {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255, 90, 77, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 128, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bfe8dc';
    ctx.lineWidth = 2;
    ctx.stroke();
    // The hood's shadowed face.
    ctx.fillStyle = PALETTE.playerDark;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 1, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  const word = alarmWord(world);
  const alarm = world.alarm;
  ctx.fillStyle = 'rgba(6, 10, 24, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.floor.name, 16, 24);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  const loot = `Loot ${world.lootCount}/${world.lootTotal}`;
  const coins = `Coins ${world.player.coins}`;
  const score = `Score ${world.score}`;
  ctx.fillText(`${loot}    ${coins}    ${score}`, 330, 24);

  // The alarm eye: it opens and reddens as the meter fills.
  const ex = VIEW_W - 190;
  const ey = 23;
  const openness = 0.25 + 0.75 * alarm;
  ctx.strokeStyle = alarm >= 0.68 ? PALETTE.danger : PALETTE.hud;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex - 26, ey);
  ctx.quadraticCurveTo(ex, ey - 16 * openness, ex + 26, ey);
  ctx.quadraticCurveTo(ex, ey + 16 * openness, ex - 26, ey);
  ctx.stroke();
  ctx.fillStyle = alarm >= 0.68 ? PALETTE.danger : alarm >= 0.32 ? '#ffb347' : '#7fd08a';
  ctx.beginPath();
  ctx.arc(ex, ey, 3 + 6 * alarm, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = alarm >= 0.68 ? PALETTE.danger : alarm >= 0.32 ? '#ffb347' : PALETTE.hud;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(word.toUpperCase(), ex + 36, ey + 1);

  // A thin alarm bar under the header.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, 46, VIEW_W, 4);
  ctx.fillStyle = alarm >= 0.68 ? PALETTE.danger : alarm >= 0.32 ? '#ffb347' : '#7fd08a';
  ctx.fillRect(0, 46, VIEW_W * alarm, 4);
}

function panel(ctx, title, lines, accent) {
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || PALETTE.hudDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || PALETTE.hud;
  ctx.font = 'bold 40px serif';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.hud;
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 108 + i * 30);
  });
}

function drawOverlay(ctx, world) {
  const s = world.screen;
  if (s === 'title') {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2ead2';
    ctx.font = 'bold 84px serif';
    ctx.fillText('VESPER VAULT', VIEW_W / 2, 250);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '22px serif';
    ctx.fillText('Slip past the cones. Lift the relic. Vanish.', VIEW_W / 2, 316);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('A stealth game in three floors — Wren, thief of the Vesper Museum', VIEW_W / 2, 356);
    ctx.fillStyle = '#ffd77a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press Enter to begin', VIEW_W / 2, 430);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD / arrows move · C sneak · Shift sprint · Click tosses a coin · P pause · R retry · M mute', VIEW_W / 2, 480);
  } else if (s === 'brief') {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, world.floor.name, [world.floor.brief, '', 'Press Enter to begin the floor'], '#ffd77a');
  } else if (s === 'caught') {
    ctx.fillStyle = 'rgba(160, 10, 10, 0.30)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 'CAUGHT', ['The guards close in and the night is over — for this floor.', 'Press R to retry the floor, unseen.', ''], PALETTE.danger);
  } else if (s === 'clear') {
    const st = world.clearStats;
    const lines = [
      `Cleared in ${st.time.toFixed(1)}s — speed bonus +${st.speedBonus}, ghost bonus +${st.ghostBonus}.`,
      `Loot ${st.loot}/${st.lootTotal} · Score ${st.score}.`,
      '',
      'Press Enter for the next floor.',
    ];
    panel(ctx, 'FLOOR CLEAR', lines, '#7fd08a');
  } else if (s === 'victory') {
    panel(ctx, 'THE VESPER IS YOURS', [
      'Three floors, three relics, and not a single alarm that mattered.',
      `Final score ${world.score}.`,
      '',
      'Press Enter to play again.',
    ], '#ffd77a');
  } else if (s === 'pause') {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 'PAUSED', ['Press P to keep sneaking.'], PALETTE.hudDim);
  }
}

export function drawWorld(ctx, world) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, world);
  drawLampPools(ctx, world);
  drawExit(ctx, world);
  drawLoot(ctx, world);
  drawCones(ctx, world);
  drawCoin(ctx, world);
  drawActors(ctx, world);
  drawHud(ctx, world);
  drawOverlay(ctx, world);
}
