/**
 * ==========================================================================
 * GLITCHVERSE - INPUT MANAGER (js/input.js)
 * Robust keyboard & mouse input handler with edge-triggering, Right-Click
 * parry/deflection support, and mouse tracking.
 * ==========================================================================
 */

export class InputManager {
  constructor() {
    this.keysDown = new Map();
    this.keysPressed = new Map();

    this.mouseX = 0;
    this.mouseY = 0;

    this.aliases = {
      // Platformer Controls
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
      up: ['KeyW', 'ArrowUp'],
      down: ['KeyS', 'ArrowDown'],
      jump: ['Space', 'KeyW', 'ArrowUp'],

      // Combat: Left Click, Right Click, Z, J
      attack: ['MouseLeft', 'MouseRight', 'KeyZ', 'KeyJ'],
      parry: ['MouseRight'],

      // Interactions & Abilities
      interact: ['KeyE', 'Enter', 'KeyF'],
      cancel: ['KeyC', 'Escape'],
      divine: ['KeyX'],
      morph: ['KeyQ'],
      reset: ['KeyR'],

      // Direct shortcuts
      w: ['KeyW'],
      a: ['KeyA'],
      s: ['KeyS'],
      d: ['KeyD'],
      x: ['KeyX'],
      z: ['KeyZ'],
      e: ['KeyE'],
      q: ['KeyQ'],
      f: ['KeyF'],
      r: ['KeyR'],
      one: ['Digit1', 'Numpad1'],
      two: ['Digit2', 'Numpad2'],
      three: ['Digit3', 'Numpad3'],
      four: ['Digit4', 'Numpad4'],
      // Weapons (once Rakti has the Trishul): [1] talwar, [2] Trishul
      weapon1: ['Digit1', 'Numpad1'],
      weapon2: ['Digit2', 'Numpad2'],
      space: ['Space'],
      enter: ['Enter']
    };

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleContextMenu = this._handleContextMenu.bind(this);
    this._handleBlur = this._handleBlur.bind(this);

    this.init();
  }

  init() {
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('mousedown', this._handleMouseDown);
    window.addEventListener('mouseup', this._handleMouseUp);
    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('contextmenu', this._handleContextMenu);
    window.addEventListener('blur', this._handleBlur);
  }

  destroy() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('mousedown', this._handleMouseDown);
    window.removeEventListener('mouseup', this._handleMouseUp);
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('contextmenu', this._handleContextMenu);
    window.removeEventListener('blur', this._handleBlur);
  }

  _handleContextMenu(e) {
    e.preventDefault(); // Suppress browser right-click menu for seamless in-game parrying
  }

  _handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
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
    const code = e.code;
    this.keysDown.set(code, false);
    // Keep keysPressed: a tap shorter than one frame must still register. update() clears it each frame.
  }

  _handleMouseDown(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (e.button === 0) {
      // Left Click
      if (!this.keysDown.get('MouseLeft')) {
        this.keysPressed.set('MouseLeft', true);
      }
      this.keysDown.set('MouseLeft', true);
    } else if (e.button === 2) {
      // Right Click (Parry / Directional Deflection Strike)
      e.preventDefault();
      if (!this.keysDown.get('MouseRight')) {
        this.keysPressed.set('MouseRight', true);
      }
      this.keysDown.set('MouseRight', true);
    }
  }

  _handleMouseUp(e) {
    if (e.button === 0) {
      this.keysDown.set('MouseLeft', false);
    } else if (e.button === 2) {
      this.keysDown.set('MouseRight', false);
    }
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

  update() {
    this.keysPressed.clear();
  }
}

export const Input = new InputManager();
