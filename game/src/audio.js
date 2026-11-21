// Vesper Vault — sound: every effect is synthesized with WebAudio, so
// the game ships zero audio files. One-shots come from the world's sound
// queue; the positional bed is the nearest guard's footsteps, low thuds
// that fade over 430px and pan with the guard's position.

export function createAudio() {
  return {
    ctx: null,
    muted: false,
    master: null,
    // Nearest-guard footstep bed.
    bedTimer: 0,
  };
}

function ensure(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
  } catch {
    return null;
  }
  return audio.ctx;
}

export function resumeAudio(audio) {
  const ctx = ensure(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.master && audio.ctx) {
    audio.master.gain.value = muted ? 0 : 0.5;
  }
}

function tone(audio, { freq = 440, freqEnd = null, dur = 0.15, type = 'sine', vol = 0.2, delay = 0, pan = 0 }) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(audio.master);
  } else {
    osc.connect(gain);
    gain.connect(audio.master);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A soft thud: a low sine that falls away fast.
function thud(audio, vol, pan, freq = 90) {
  tone(audio, { freq, freqEnd: 45, dur: 0.12, type: 'sine', vol, pan });
}

export function playSound(audio, event) {
  switch (event.name) {
    case 'step': {
      // Footsteps: soft when sneaking, sharper when sprinting.
      const vol = event.gait === 'sneak' ? 0.05 : event.gait === 'sprint' ? 0.16 : 0.1;
      thud(audio, vol, 0, event.gait === 'sprint' ? 110 : 80);
      break;
    }
    case 'coinThrow':
      tone(audio, { freq: 1200, freqEnd: 900, dur: 0.12, type: 'sine', vol: 0.15 });
      break;
    case 'coinRing':
      tone(audio, { freq: 2093, dur: 0.5, type: 'sine', vol: 0.16 });
      tone(audio, { freq: 2637, dur: 0.4, type: 'sine', vol: 0.1, delay: 0.05 });
      break;
    case 'treasure':
      tone(audio, { freq: 880, dur: 0.12, type: 'triangle', vol: 0.18 });
      tone(audio, { freq: 1318, dur: 0.2, type: 'triangle', vol: 0.18, delay: 0.08 });
      break;
    case 'relic':
      [523, 659, 784, 1046].forEach((f, i) => {
        tone(audio, { freq: f, dur: 0.35, type: 'triangle', vol: 0.16, delay: i * 0.09 });
      });
      break;
    case 'alarm':
      tone(audio, { freq: 220, freqEnd: 440, dur: 0.5, type: 'sawtooth', vol: 0.12 });
      tone(audio, { freq: 233, freqEnd: 466, dur: 0.5, type: 'sawtooth', vol: 0.1, delay: 0.05 });
      break;
    case 'caught':
      tone(audio, { freq: 400, freqEnd: 60, dur: 0.8, type: 'sawtooth', vol: 0.2 });
      break;
    case 'floorClear':
      [523, 659, 784].forEach((f, i) => {
        tone(audio, { freq: f, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.1 });
      });
      break;
    case 'victory':
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        tone(audio, { freq: f, dur: 0.4, type: 'triangle', vol: 0.15, delay: i * 0.12 });
      });
      break;
    case 'uiClick':
      tone(audio, { freq: 700, dur: 0.06, type: 'sine', vol: 0.12 });
      break;
    default:
      break;
  }
}

// Drain the world's sound queue into the synth.
export function drainSounds(audio, world) {
  while (world.sounds.length > 0) {
    playSound(audio, world.sounds.shift());
  }
}

// The positional bed: the nearest guard's footsteps, low thuds fading
// over 430px, panned by the guard's position relative to the player.
export function updateAudioBed(audio, world, dt) {
  const ctx = ensure(audio);
  if (!ctx || audio.muted || world.state !== 'play' || world.paused) return;
  let nearest = null;
  let nearestD = Infinity;
  for (const g of world.guards) {
    if (!g.moving) continue;
    const d = Math.hypot(g.x - world.player.x, g.y - world.player.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = g;
    }
  }
  if (!nearest || nearestD > 430) return;
  audio.bedTimer -= dt;
  if (audio.bedTimer > 0) return;
  const cadence = nearest.mood === 'chase' ? 0.32 : 0.55;
  audio.bedTimer = cadence;
  const vol = 0.14 * (1 - nearestD / 430);
  const pan = Math.max(-1, Math.min(1, (nearest.x - world.player.x) / 300));
  thud(audio, vol, pan, 70);
}
