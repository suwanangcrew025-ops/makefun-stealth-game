// Vesper Vault — input: keyboard and mouse reduced to plain structs.
// The world reads one struct per fixed step, so a recording, a bot or a
// screenshot staging can drive the same update the player does.

export function createInput() {
  return {
    // Held keys.
    keys: new Set(),
    // Movement vector for this step, -1..1 on each axis.
    mx: 0,
    my: 0,
    sneak: false,
    sprint: false,
    // A coin-toss target in canvas pixels, consumed once by the world.
    coinTarget: null,
    // Edge-triggered actions, consumed once by the boot layer.
    pressedEnter: false,
    pressedPause: false,
    pressedRestart: false,
    pressedMute: false,
  };
}

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function keyDown(input, code) {
  if (MOVE_KEYS[code]) input.keys.add(code);
  if (code === 'KeyC' || code === 'ControlLeft' || code === 'ControlRight') input.keys.add(code);
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.keys.add(code);
  if (code === 'Enter') input.pressedEnter = true;
  if (code === 'KeyP') input.pressedPause = true;
  if (code === 'KeyR') input.pressedRestart = true;
  if (code === 'KeyM') input.pressedMute = true;
  refresh(input);
}

export function keyUp(input, code) {
  input.keys.delete(code);
  refresh(input);
}

function refresh(input) {
  let mx = 0;
  let my = 0;
  for (const code of input.keys) {
    const v = MOVE_KEYS[code];
    if (v) {
      mx += v[0];
      my += v[1];
    }
  }
  input.mx = Math.sign(mx);
  input.my = Math.sign(my);
  input.sneak = input.keys.has('KeyC') || input.keys.has('ControlLeft') || input.keys.has('ControlRight');
  input.sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}

export function mouseClick(input, x, y) {
  input.coinTarget = { x, y };
}

// Clear the one-shot fields after the world has consumed them. The coin
// target is cleared here only: the menu keys are cleared by handleMenuKeys
// before the update, so a click between frames is never wiped unseen.
export function consumeActions(input) {
  input.coinTarget = null;
}

// Clear only the edge-triggered menu keys.
export function consumeMenuKeys(input) {
  input.pressedEnter = false;
  input.pressedPause = false;
  input.pressedRestart = false;
  input.pressedMute = false;
}
