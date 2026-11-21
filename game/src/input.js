// Vesper Vault — input: keyboard and mouse reduced to one plain struct
// the world steps from. Keys are held state; Enter is an edge (menu
// presses); a mouse click is a one-shot coin target. The world alone
// clears the coin target after it consumes it, so a menu key can never
// swallow a throw.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    sprint: false,
    menuPressed: false,
    restartPressed: false,
    pausePressed: false,
    mutePressed: false,
    pendingCoin: null,
    _keys: new Set(),
  };
}

export function inputAxes(input) {
  let ax = 0;
  let ay = 0;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  return { ax, ay };
}

// The struct the world steps from: the source input itself, with the
// axes attached. It is the SAME object the world clears the coin
// target on, so a throw is consumed exactly once: the world sets
// pendingCoin to null on this object after the throw is set up, and
// the menu handler never touches it.
export function inputForWorld(input) {
  const { ax, ay } = inputAxes(input);
  input.ax = ax;
  input.ay = ay;
  return input;
}

const KEY_MAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyC: 'sneak',
  ControlLeft: 'sneak',
  ControlRight: 'sneak',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

// Wire a canvas to the input struct. Safe to call where there is no
// document (a Node test imports this module without attaching it).
export function attachInput(input, canvas) {
  if (typeof document === 'undefined' || !canvas) return;
  document.addEventListener('keydown', (event) => {
    const field = KEY_MAP[event.code];
    if (field) {
      input[field] = true;
      input._keys.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'Enter' && !event.repeat) input.menuPressed = true;
    if (event.code === 'KeyR' && !event.repeat) input.restartPressed = true;
    if (event.code === 'KeyP' && !event.repeat) input.pausePressed = true;
    if (event.code === 'KeyM' && !event.repeat) input.mutePressed = true;
    if (event.code === 'Space') event.preventDefault();
  });
  document.addEventListener('keyup', (event) => {
    const field = KEY_MAP[event.code];
    if (field) {
      input._keys.delete(event.code);
      // A held key only releases when every code mapped to it is up.
      let stillHeld = false;
      for (const code of input._keys) {
        if (KEY_MAP[code] === field) stillHeld = true;
      }
      input[field] = stillHeld;
    }
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.pendingCoin = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.sneak = false;
    input.sprint = false;
    input._keys.clear();
  });
}

// Menu edges are consumed by the main loop and cleared here, one at a
// time, after handling — never the coin target, which the world owns.
export function clearMenuEdges(input) {
  input.menuPressed = false;
  input.restartPressed = false;
  input.pausePressed = false;
  input.mutePressed = false;
}
