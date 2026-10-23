/**
 * ==========================================================================
 * GLITCHVERSE - INPUT MANAGER (js/input.js)
 * Robust keyboard input handler with edge-triggering and Undertale bindings.
 * ==========================================================================
 */

export class InputManager {
  constructor() {
    this.keysDown = new Map();
    this.keysPressed = new Map();

    this.aliases = {
      // 4-Way Movement
      up: ['KeyW', 'ArrowUp'],
      down: ['KeyS', 'ArrowDown'],
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],

      // Undertale Core Actions
      jump: ['Space'],
      leap: ['Space'],
      interact: ['KeyZ', 'Enter', 'KeyF'], // Z / Enter / F
      cancel: ['KeyX', 'ShiftLeft', 'ShiftRight'],

      // Future hooks
      shift: ['KeyE'],
      manipulate: ['KeyQ'],
      reset: ['KeyR'],

      // Raw key shorthands
      w: ['KeyW'],
      a: ['KeyA'],
      s: ['KeyS'],
      d: ['KeyD'],
      z: ['KeyZ'],
      x: ['KeyX'],
      e: ['KeyE'],
      q: ['KeyQ'],
      f: ['KeyF'],
      r: ['KeyR'],
      space: ['Space'],
      enter: ['Enter']
    };

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleBlur = this._handleBlur.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('blur', this._handleBlur);
  }

  destroy() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('blur', this._handleBlur);
  }

  _handleKeyDown(e) {
    const code = e.code;

    // Prevent default browser scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }

    if (!this.keysDown.get(code)) {
      this.keysPressed.set(code, true);
    }
    this.keysDown.set(code, true);
  }

  _handleKeyUp(e) {
    const code = e.code;
    this.keysDown.set(code, false);
    this.keysPressed.set(code, false);
  }

  _handleBlur() {
    this.keysDown.clear();
    this.keysPressed.clear();
  }

  isDown(codeOrAlias) {
    const aliasList = this.aliases[codeOrAlias.toLowerCase()];
    if (aliasList) {
      return aliasList.some(code => Boolean(this.keysDown.get(code)));
    }
    return Boolean(this.keysDown.get(codeOrAlias));
  }

  isPressed(codeOrAlias) {
    const aliasList = this.aliases[codeOrAlias.toLowerCase()];
    if (aliasList) {
      return aliasList.some(code => Boolean(this.keysPressed.get(code)));
    }
    return Boolean(this.keysPressed.get(codeOrAlias));
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (this.isDown('left')) dx -= 1;
    if (this.isDown('right')) dx += 1;
    if (this.isDown('up')) dy -= 1;
    if (this.isDown('down')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const invSqrt = Math.SQRT1_2;
      dx *= invSqrt;
      dy *= invSqrt;
    }

    return { x: dx, y: dy };
  }

  update() {
    this.keysPressed.clear();
  }
}

export const Input = new InputManager();
