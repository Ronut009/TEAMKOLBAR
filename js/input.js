/**
 * ==========================================================================
 * UNDERWATER RUINS - INPUT MANAGER (js/input.js)
 * Handles WASD, Arrows, Space/W/Up for jump, X for divine, Z/Enter for interact.
 * ==========================================================================
 */

export class InputManager {
  constructor() {
    this.keysDown = new Map();
    this.keysPressed = new Map();

    this.aliases = {
      up:       ['KeyW', 'ArrowUp'],
      down:     ['KeyS', 'ArrowDown'],
      left:     ['KeyA', 'ArrowLeft'],
      right:    ['KeyD', 'ArrowRight'],
      jump:     ['Space', 'KeyW', 'ArrowUp'],
      interact: ['KeyZ', 'Enter', 'KeyF'],
      cancel:   ['ShiftLeft', 'ShiftRight'],
      shift:    ['KeyE'],
      manipulate: ['KeyQ'],
      reset:    ['KeyR'],
      // raw
      w: ['KeyW'], a: ['KeyA'], s: ['KeyS'], d: ['KeyD'],
      z: ['KeyZ'], x: ['KeyX'], e: ['KeyE'], q: ['KeyQ'],
      f: ['KeyF'], r: ['KeyR'],
      space: ['Space'], enter: ['Enter']
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
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
    if (!this.keysDown.get(code)) {
      this.keysPressed.set(code, true);
    }
    this.keysDown.set(code, true);
  }

  _handleKeyUp(e) {
    this.keysDown.set(e.code, false);
    this.keysPressed.set(e.code, false);
  }

  _handleBlur() {
    this.keysDown.clear();
    this.keysPressed.clear();
  }

  isDown(codeOrAlias) {
    const list = this.aliases[codeOrAlias.toLowerCase()];
    if (list) return list.some(c => Boolean(this.keysDown.get(c)));
    return Boolean(this.keysDown.get(codeOrAlias));
  }

  isPressed(codeOrAlias) {
    const list = this.aliases[codeOrAlias.toLowerCase()];
    if (list) return list.some(c => Boolean(this.keysPressed.get(c)));
    return Boolean(this.keysPressed.get(codeOrAlias));
  }

  getMovementVector() {
    let dx = 0, dy = 0;
    if (this.isDown('left'))  dx -= 1;
    if (this.isDown('right')) dx += 1;
    if (this.isDown('up'))    dy -= 1;
    if (this.isDown('down'))  dy += 1;
    if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    return { x: dx, y: dy };
  }

  update() {
    this.keysPressed.clear();
  }
}

export const Input = new InputManager();
