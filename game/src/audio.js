// Vesper Vault — synthesized sound: every effect is a small WebAudio
// patch, no audio files. A positional bed plays the nearest guard's
// footsteps as low thuds, fading with distance and panned by where the
// guard stands relative to the thief, faster when the guard chases.

export function createAudio() {
  return { ctx: null, muted: false, bedTimer: 0, bedGuard: -1 };
}

function ensureCtx(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio.ctx = new AC();
  } catch {
    return null;
  }
  return audio.ctx;
}

function tone(ctx, freq, dur, type, gain, when = 0, slideTo = null) {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function thud(ctx, gain, pan) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(95, t0);
  osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.09);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(g);
    g.connect(panner);
    panner.connect(ctx.destination);
  } else {
    osc.connect(g);
    g.connect(ctx.destination);
  }
  osc.start(t0);
  osc.stop(t0 + 0.15);
}

export function unlockAudio(audio) {
  const ctx = ensureCtx(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function playSounds(audio, sounds) {
  if (audio.muted || !sounds.length) return;
  const ctx = ensureCtx(audio);
  if (!ctx || ctx.state !== 'running') return;
  for (const s of sounds) {
    switch (s) {
      case 'step':
        thud(ctx, 0.10, 0);
        break;
      case 'step-soft':
        thud(ctx, 0.04, 0);
        break;
      case 'coin-throw':
        tone(ctx, 1320, 0.09, 'sine', 0.12);
        break;
      case 'coin-ring':
        tone(ctx, 1760, 0.16, 'sine', 0.14);
        tone(ctx, 2349, 0.22, 'sine', 0.10, 0.05);
        break;
      case 'pickup':
        tone(ctx, 880, 0.1, 'triangle', 0.14);
        tone(ctx, 1174, 0.14, 'triangle', 0.12, 0.07);
        break;
      case 'relic':
        [523, 659, 784, 1046].forEach((f, i) => tone(ctx, f, 0.22, 'triangle', 0.14, i * 0.09));
        break;
      case 'alarm':
        tone(ctx, 620, 0.35, 'sawtooth', 0.10, 0, 880);
        tone(ctx, 880, 0.35, 'sawtooth', 0.08, 0.12, 620);
        break;
      case 'caught':
        tone(ctx, 420, 0.7, 'sawtooth', 0.14, 0, 110);
        break;
      case 'clear':
        [659, 784, 988, 1318].forEach((f, i) => tone(ctx, f, 0.25, 'triangle', 0.13, i * 0.08));
        break;
      case 'click':
        tone(ctx, 700, 0.06, 'square', 0.06);
        break;
      default:
        break;
    }
  }
}

// The positional bed: the nearest guard's footsteps, thudding closer
// and faster as the guard closes in or gives chase.
export function updateAudioBed(audio, world, dt) {
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx || ctx.state !== 'running') return;
  if (world.screen !== 'play') return;
  let nearest = null;
  let nearestD = Infinity;
  for (const g of world.guards) {
    const d = Math.hypot(g.x - world.player.x, g.y - world.player.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = g;
    }
  }
  if (!nearest || nearestD > 430) return;
  audio.bedTimer -= dt;
  if (audio.bedTimer > 0) return;
  const chasing = nearest.mood === 'chase';
  audio.bedTimer = chasing ? 0.32 : 0.55;
  const gain = Math.max(0.02, 0.16 * (1 - nearestD / 430));
  const pan = Math.max(-1, Math.min(1, (nearest.x - world.player.x) / 300));
  thud(ctx, gain, pan);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
