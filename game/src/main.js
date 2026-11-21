// Vesper Vault — boot: the fixed-step loop, menu keys and wiring.
// The world advances in 1/60s steps driven by accumulated real time, so
// the simulation never depends on the frame rate. A `?shot=` query stages
// one screenshot deterministically instead of starting the live game.
// The window handle below is the play-testing hook: it exposes the world,
// the input and a way to step the simulation by hand.

import { STEP, VIEW_W, VIEW_H } from './config.js';
import { World } from './world.js';
import { render } from './render.js';
import { createInput, keyDown, keyUp, mouseClick, consumeActions, consumeMenuKeys } from './input.js';
import { createAudio, resumeAudio, setMuted, drainSounds, updateAudioBed, playSound } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const world = new World();
const input = createInput();
const audio = createAudio();

let lastStatus = '';
function syncStatus() {
  if (world.statusMessage !== lastStatus) {
    lastStatus = world.statusMessage;
    statusEl.textContent = lastStatus;
  }
}

function handleMenuKeys() {
  if (input.pressedEnter) {
    resumeAudio(audio);
    if (world.state === 'title') {
      world.startGame();
      playUiClick();
    } else if (world.state === 'brief') {
      world.beginFloor();
      playUiClick();
    } else if (world.state === 'clear') {
      world.nextFloor();
      playUiClick();
    } else if (world.state === 'victory') {
      world.startGame();
      playUiClick();
    } else if (world.state === 'caught') {
      world.retryFloor();
      playUiClick();
    }
  }
  if (input.pressedPause && world.state === 'play') {
    world.paused = !world.paused;
    world.setStatus(world.paused ? 'Paused. The museum holds its breath.' : 'Back to the dark.');
    playUiClick();
  }
  if (input.pressedRestart && (world.state === 'play' || world.state === 'caught')) {
    world.retryFloor();
    playUiClick();
  }
  if (input.pressedMute) {
    setMuted(audio, !audio.muted);
    world.setStatus(audio.muted ? 'Sound off.' : 'Sound on.');
  }
  consumeMenuKeys(input);
}

function playUiClick() {
  playSound(audio, { name: 'uiClick' });
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keyDown(input, event.code);
});

window.addEventListener('keyup', (event) => {
  keyUp(input, event.code);
});

canvas.addEventListener('mousedown', (event) => {
  resumeAudio(audio);
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  mouseClick(input, x, y);
});

// The play-testing handle: read the world, drive it by hand, and stage
// shots without the live loop.
window.__vesper = {
  world,
  input,
  step(dt = STEP) {
    handleMenuKeys();
    world.update(dt, input);
    consumeActions(input);
    syncStatus();
  },
  render(time = 0) {
    render(ctx, world, time);
  },
  stageShot(name) {
    return stageShot(world, name);
  },
};

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  // Screenshot mode: stage deterministically, draw one frame, flag ready.
  stageShot(world, shotName);
  render(ctx, world, 0);
  syncStatus();
  window.__shotReady = true;
} else {
  // Live mode: accumulate real time and step the world in fixed units.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    acc += elapsed;
    handleMenuKeys();
    let n = 0;
    while (acc >= STEP && n < 5) {
      world.update(STEP, input);
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
    consumeActions(input);
    drainSounds(audio, world);
    updateAudioBed(audio, world, elapsed);
    render(ctx, world, now / 1000);
    syncStatus();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
