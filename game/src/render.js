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

function drawProps(ctx, world) {
  for (const p of world.props) {
    if (p.kind === 'rug') {
      const x = p.x * TILE;
      const y = p.y * TILE;
      const w = p.w * TILE;
      const h = p.h * TILE;
      ctx.fillStyle = '#3d2436';
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
      ctx.strokeStyle = 'rgba(138, 106, 58, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
    } else if (p.kind === 'painting') {
      const x = p.tx * TILE;
      const y = p.ty * TILE;
      ctx.fillStyle = '#0e1424';
      ctx.fillRect(x + 8, y + 9, 24, 22);
      ctx.strokeStyle = '#c9a24d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 8, y + 9, 24, 22);
      ctx.fillStyle = '#7a5a34';
      ctx.beginPath();
      ctx.arc(x + 20, y + 20, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'plant') {
      const c = tileCenter(p.tx, p.ty);
      ctx.fillStyle = '#5d4325';
      ctx.fillRect(c.x - 8, c.y + 2, 16, 12);
      ctx.fillStyle = '#2f6b3a';
      ctx.beginPath();
      ctx.arc(c.x - 5, c.y - 4, 6, 0, Math.PI * 2);
      ctx.arc(c.x + 5, c.y - 6, 6, 0, Math.PI * 2);
      ctx.arc(c.x, c.y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'pedestal') {
      const c = tileCenter(p.tx, p.ty);
      ctx.fillStyle = '#4d5878';
      ctx.fillRect(c.x - 13, c.y - 4, 26, 18);
      ctx.fillStyle = '#39415e';
      ctx.fillRect(c.x - 16, c.y + 12, 32, 5);
      ctx.strokeStyle = '#6b7a9e';
      ctx.lineWidth = 1;
      ctx.strokeRect(c.x - 13, c.y - 4, 26, 18);
    } else if (p.kind === 'vase') {
      const c = tileCenter(p.tx, p.ty);
      ctx.fillStyle = '#c9a24d';
      ctx.beginPath();
      ctx.moveTo(c.x - 6, c.y - 8);
      ctx.lineTo(c.x + 6, c.y - 8);
      ctx.lineTo(c.x + 4, c.y + 8);
      ctx.lineTo(c.x - 4, c.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(c.x - 2, c.y - 12, 4, 5);
    }
  }
}

function drawLampPools(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of world.lamps) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 128);
    g.addColorStop(0, 'rgba(255, 205, 110, 0.30)');
    g.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 128, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (const lamp of world.lamps) {
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 122, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 215, 122, 0.35)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 16, 0, Math.PI * 2);
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
    // A soft shadow grounds the thief on the floor.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + r - 2, r + 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.fillStyle = 'rgba(6, 10, 24, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.textBaseline = 'middle';

  // Floor, and the job for this floor.
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${world.floor.name} · ${world.floorIndex + 1}/3`, 16, 24);
  const objective = world.exitOpen
    ? '◆ Relic secured — reach the EXIT'
    : `◆ Lift ${world.floor.relicName}`;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = world.exitOpen ? '#7fd08a' : '#ffd77a';
  ctx.fillText(objective, 340, 24);

  // Loot, relic, coins, score and the clock, right-aligned to the eye.
  const relicHeld = world.relic && world.relic.taken ? 1 : 0;
  const mins = Math.floor(world.floorTime / 60);
  const secs = Math.floor(world.floorTime % 60);
  const stats = `Loot ${world.lootCount}/${world.lootTotal}  ·  ◆ ${relicHeld}/1  ·  Coins ${world.player.coins}  ·  Score ${world.score}  ·  ${mins}:${String(secs).padStart(2, '0')}`;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.textAlign = 'right';
  const ex = VIEW_W - 190;
  ctx.fillText(stats, ex - 44, 24);

  // The alarm eye: it opens and reddens as the meter fills.
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
  const wordW = ctx.measureText(word.toUpperCase()).width;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`${Math.round(alarm * 100)}%`, ex + 44 + wordW, ey + 1);

  // A thin alarm bar under the header.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(0, 46, VIEW_W, 4);
  ctx.fillStyle = alarm >= 0.68 ? PALETTE.danger : alarm >= 0.32 ? '#ffb347' : '#7fd08a';
  ctx.fillRect(0, 46, VIEW_W * alarm, 4);

  // The objective banner, pinned to the bottom while playing: the job,
  // the exit state, and whether the ghost bonus is still alive.
  if (world.screen === 'play') {
    const ghost = world.alarmEverFull ? 'Ghost lost' : 'Ghost ✓';
    const banner = world.exitOpen
      ? `OBJECTIVE — Relic secured · Reach the EXIT · ${ghost}`
      : `OBJECTIVE — Lift ${world.floor.relicName} · Exit sealed · ${ghost}`;
    ctx.font = '14px sans-serif';
    const bw = ctx.measureText(banner).width + 24;
    ctx.fillStyle = 'rgba(6, 10, 24, 0.78)';
    ctx.fillRect(12, VIEW_H - 36, bw, 26);
    ctx.strokeStyle = world.exitOpen ? '#7fd08a' : '#c9a24d';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, VIEW_H - 36, bw, 26);
    ctx.fillStyle = world.exitOpen ? '#7fd08a' : '#ffd77a';
    ctx.textAlign = 'left';
    ctx.fillText(banner, 24, VIEW_H - 22);
  }
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
    ctx.fillStyle = 'rgba(4, 8, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // A framed panel behind the title so the words read over the patrol.
    ctx.fillStyle = 'rgba(6, 10, 24, 0.72)';
    ctx.fillRect(220, 140, 840, 400);
    ctx.strokeStyle = '#c9a24d';
    ctx.lineWidth = 2;
    ctx.strokeRect(220, 140, 840, 400);
    ctx.strokeStyle = 'rgba(201, 162, 77, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(228, 148, 824, 384);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a24d';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('— TONIGHT’S JOB · THE VESPER MUSEUM —', VIEW_W / 2, 188);
    ctx.fillStyle = '#f2ead2';
    ctx.font = 'bold 84px serif';
    ctx.fillText('VESPER VAULT', VIEW_W / 2, 258);
    ctx.fillStyle = '#c9a24d';
    ctx.fillRect(VIEW_W / 2 - 180, 306, 360, 2);
    ctx.fillStyle = '#ffd94d';
    ctx.save();
    ctx.translate(VIEW_W / 2, 340);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '22px serif';
    ctx.fillText('Slip past the cones. Lift the relic. Vanish.', VIEW_W / 2, 382);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('3 FLOORS · 3 RELICS · 1 THIEF — Wren, thief of the Vesper Museum', VIEW_W / 2, 420);
    ctx.fillStyle = '#ffd77a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Press Enter to begin', VIEW_W / 2, 472);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '15px sans-serif';
    ctx.fillText('WASD / arrows move · C sneak · Shift sprint · Click tosses a coin · P pause · R retry · M mute', VIEW_W / 2, 512);
  } else if (s === 'brief') {
    ctx.fillStyle = 'rgba(4, 8, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, world.floor.name, [world.floor.brief, '', 'Press Enter to begin the floor'], '#ffd77a');
  } else if (s === 'caught') {
    ctx.fillStyle = 'rgba(160, 10, 10, 0.30)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 'CAUGHT', [
      'The guards close in and the night is over — for this floor.',
      `Loot ${world.lootCount}/${world.lootTotal} · Score ${world.score} · ${world.floorTime.toFixed(1)}s on this floor.`,
      'Press R to retry the floor, unseen.',
      '',
    ], PALETTE.danger);
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
    const ghostLine = world.runEverFull
      ? 'One floor raised the alarm — the ghost bonus slipped away.'
      : 'Three floors, three relics, and not a single alarm that mattered.';
    panel(ctx, 'THE VESPER IS YOURS', [
      ghostLine,
      `Final score ${world.score} · ${world.runTime.toFixed(1)}s in the dark · Loot ${world.runLoot}/${world.runLootTotal}.`,
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
  drawProps(ctx, world);
  drawLampPools(ctx, world);
  drawExit(ctx, world);
  drawLoot(ctx, world);
  drawCones(ctx, world);
  drawCoin(ctx, world);
  drawActors(ctx, world);
  drawHud(ctx, world);
  drawOverlay(ctx, world);
}
