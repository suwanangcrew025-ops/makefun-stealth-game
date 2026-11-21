// Vesper Vault — boot: the fixed-step loop, menu keys and wiring.
// With ?shot= in the URL the game stages one screenshot deterministically
// instead of playing; otherwise it runs the live game. A read handle is
// exposed for play-testing: window.__vesper carries the world, the input
// and the shot-ready flag.

import { STEP, VIEW_H, VIEW_W } from './config.js';
import { attachInput, clearMenuEdges, createInput, inputForWorld } from './input.js';
import { advanceMenu, createWorld, resetFloor, stepWorld } from './world.js';
import { drawWorld } from './render.js';
import { createAudio, playSounds, toggleMute, unlockAudio, updateAudioBed } from './audio.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput();
const audio = createAudio();
attachInput(input, canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

window.__vesper = { world: null, input, audio, shotName, shotReady: false, shotState: null };

function syncStatus(world) {
  if (world.statusDirty && statusEl) {
    statusEl.textContent = world.status;
    world.statusDirty = false;
  }
}

function handleMenuKeys(world) {
  if (input.menuPressed) {
    advanceMenu(world);
    input.menuPressed = false;
  }
  if (input.restartPressed) {
    if (world.screen === 'play' || world.screen === 'caught') resetFloor(world);
    input.restartPressed = false;
  }
  if (input.pausePressed) {
    if (world.screen === 'play') world.screen = 'pause';
    else if (world.screen === 'pause') world.screen = 'play';
    input.pausePressed = false;
  }
  if (input.mutePressed) {
    toggleMute(audio);
    input.mutePressed = false;
  }
}

if (shotName) {
  // Screenshot staging: run the sim to its mark, draw one frame, flag ready.
  const { world, state } = runShot(shotName);
  window.__vesper.world = world;
  window.__vesper.shotState = state;
  drawWorld(ctx, world);
  syncStatus(world);
  window.__vesper.shotReady = true;
} else {
  const world = createWorld(0);
  window.__vesper.world = world;
  document.addEventListener('keydown', () => unlockAudio(audio), { once: true });
  canvas.addEventListener('mousedown', () => unlockAudio(audio), { once: true });

  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      handleMenuKeys(world);
      stepWorld(world, inputForWorld(input), STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    // Menu edges are cleared here, after the world step — and the coin
    // target is never cleared here at all: the world clears it itself
    // once it has consumed the throw.
    clearMenuEdges(input);
    playSounds(audio, world.sounds.splice(0));
    updateAudioBed(audio, world, elapsed);
    drawWorld(ctx, world);
    syncStatus(world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
