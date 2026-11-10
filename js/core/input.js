/**
 * ==========================================================================
 * GLITCHVERSE - INPUT MANAGER (js/core/input.js)
 * Robust keyboard & mouse input handler with edge-triggering, Right-Click
 * parry/deflection support, and mouse tracking.
 * Controllers (Xbox and PlayStation, the browser's "standard" layout) press the same keys the game already
 * reads: see PAD_FOR below. poll() reads the pad once at the start of every frame.
 * ==========================================================================
 */

// Controller buttons, by their index in the browser's standard layout (the same for Xbox and PlayStation pads).
const PAD_BUTTON_NAMES = ['PadA', 'PadB', 'PadX', 'PadY', 'PadLB', 'PadRB', 'PadLT', 'PadRT', 'PadBack', 'PadStart',
  'PadLS', 'PadRS', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadHome'];
// What each keyboard key / mouse button is on a controller.
//   A / Cross: jump (and confirm)      X / Square: attack            Y / Triangle: interact, next line
//   B / Circle: Kali form              LB / L1: [Q] earth-shaping    RB / R1: [F] Sands of Time
//   LT / L2: talwar                    RT / R2: Trishul              Right stick: aim the Trishul
//   Start / Options: pause (hold it to skip the opening film)       D-pad or left stick: move, climb
//   View / Create: skip a conversation ([C]); outside one, restart from the checkpoint ([R]). (Not R3: it is
//   easy to click by accident while aiming with the right stick.)
const STICK = { move: 0.35, climb: 0.55, aim: 0.35 };
const PAD_FOR = {
  Space: ['PadA'], Enter: ['PadA'],
  MouseLeft: ['PadX'],
  KeyE: ['PadY'],
  KeyX: ['PadB'],
  KeyQ: ['PadLB'],
  KeyF: ['PadRB'],
  Digit1: ['PadLT'], Numpad1: ['PadLT'],
  Digit2: ['PadRT'], Numpad2: ['PadRT'],
  Escape: ['PadStart'],
  KeyC: ['PadBack'],
  KeyR: ['PadBack'],
  KeyA: ['PadLeft', 'StickLeft'], ArrowLeft: ['PadLeft', 'StickLeft'],
  KeyD: ['PadRight', 'StickRight'], ArrowRight: ['PadRight', 'StickRight'],
  KeyW: ['PadUp', 'StickUp'], ArrowUp: ['PadUp', 'StickUp'],
  KeyS: ['PadDown', 'StickDown'], ArrowDown: ['PadDown', 'StickDown']
};

/** 'xbox' or 'ps' from the pad's name (PlayStation pads report Sony's vendor id 054c). */
function padStyle(id = '') {
  // Xbox first: an Xbox pad over Bluetooth calls itself "Xbox Wireless Controller" (Microsoft's vendor id 045e)
  if (/xbox|xinput|045e/i.test(id)) return 'xbox';
  return /054c|playstation|dualsense|dualshock|wireless controller|ps[345]/i.test(id) ? 'ps' : 'xbox';
}

export class InputManager {
  constructor() {
    this.keysDown = new Map();
    this.keysPressed = new Map();

    this.mouseX = 0;
    this.mouseY = 0;

    // controller state: buttons held this frame, buttons that went down this frame, the right stick
    this.padDown = new Set();
    this.padPressed = new Set();
    this.padIndex = null;
    this.padStyle = 'xbox';
    this.aim = { x: 0, y: 0, active: false };
    this.device = 'keyboard';     // the last thing used: 'keyboard' (keys and mouse) or 'pad'
    this.deviceListeners = [];
    // Settings > Controls: which device's names the game shows ('keyboard', 'xbox', 'ps'), or null = follow the
    // device in use. Every device keeps working whatever is chosen; only the on-screen names change. Remembered.
    this.labelPref = null;
    try {
      const v = localStorage.getItem('rakti.controls');
      if (v === 'keyboard' || v === 'xbox' || v === 'ps') this.labelPref = v;
    } catch (e) { /* storage blocked: follow the device */ }

    this.aliases = {
      // Controls (remapped): A / D move, Space jumps, W / S climb ladders, S + Space drops through a thin platform,
      // left click attacks (and aims), E interacts, C skips a conversation, Esc opens the pause menu, R restarts.
      left: ['KeyA'],
      right: ['KeyD'],
      up: ['KeyW'],
      down: ['KeyS'],
      jump: ['Space'],

      // Combat: left click only
      attack: ['MouseLeft'],
      parry: [],

      // Interactions & Abilities
      interact: ['KeyE'],
      cancel: ['KeyC'],
      divine: ['KeyX'],
      law: ['KeyZ'],
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
    this._useDevice('keyboard');
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
    this._useDevice('keyboard');

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

  /** Remembers which device was used last, so on-screen key names can match it. */
  _useDevice(kind) {
    if (this.device === kind) return;
    this.device = kind;
    for (const fn of this.deviceListeners) fn(kind, this.padStyle);
  }

  onDeviceChange(fn) { this.deviceListeners.push(fn); }

  /** True when on-screen names should be a controller's (the player's choice, else the device in use). */
  get labelPad() { return this.labelPref ? this.labelPref !== 'keyboard' : this.device === 'pad'; }
  /** 'xbox' or 'ps': which controller's names. */
  get labelStyle() { return this.labelPref === 'xbox' || this.labelPref === 'ps' ? this.labelPref : this.padStyle; }
  /** The device the player picked in Settings > Controls ('keyboard', 'xbox' or 'ps'). */
  setLabelPref(v) {
    this.labelPref = v;
    try { localStorage.setItem('rakti.controls', v); } catch (e) { /* not remembered */ }
    for (const fn of this.deviceListeners) fn(this.device, this.padStyle);
  }

  /** Reads the controller (call once at the start of every frame). */
  poll() {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = this.padIndex != null ? pads[this.padIndex] : null;
    if (!pad || !pad.connected) {
      pad = null;
      this.padIndex = null;
      for (const g of pads) if (g && g.connected && (!pad || g.mapping === 'standard')) pad = g;
      if (pad) this.padIndex = pad.index;
    }
    const now = new Set();
    let active = false;
    if (pad) {
      const style = padStyle(pad.id);
      if (style !== this.padStyle) {
        this.padStyle = style;
        if (this.device === 'pad') for (const fn of this.deviceListeners) fn('pad', style);
      }
      pad.buttons.forEach((b, i) => {
        const name = PAD_BUTTON_NAMES[i];
        if (!name) return;
        const on = typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
        if (on) { now.add(name); active = true; }
      });
      const ax = pad.axes || [];
      const lx = ax[0] || 0, ly = ax[1] || 0, rx = ax[2] || 0, ry = ax[3] || 0;
      if (lx < -STICK.move) now.add('StickLeft');
      if (lx > STICK.move) now.add('StickRight');
      // up / down only when the stick is clearly pushed that way (a run with a slight tilt does not climb)
      if (ly < -STICK.climb && Math.abs(ly) > Math.abs(lx) * 0.8) now.add('StickUp');
      if (ly > STICK.climb && Math.abs(ly) > Math.abs(lx) * 0.8) now.add('StickDown');
      if (Math.abs(lx) > STICK.move || Math.abs(ly) > STICK.climb) active = true;
      const mag = Math.hypot(rx, ry);
      this.aim = { x: rx, y: ry, active: mag > STICK.aim };
      if (mag > 0.5) active = true;
    } else {
      this.aim = { x: 0, y: 0, active: false };
    }
    // a press lasts until the frame that reads it ends (update() clears it)
    for (const b of now) if (!this.padDown.has(b)) this.padPressed.add(b);
    this.padDown = now;
    if (active) this._useDevice('pad');
  }

  /** Swallows a controller press (a menu used it, so it is not also a jump or a start). */
  consume(...buttons) {
    for (const b of buttons) this.padPressed.delete(b);
  }

  /** A short rumble on pads that support it (hits, big impacts). */
  rumble(strength = 0.4, ms = 120) {
    if (this.device !== 'pad' || this.padIndex == null) return;
    const pad = navigator.getGamepads?.()[this.padIndex];
    const act = pad?.vibrationActuator;
    if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength * 1.2) }).catch(() => {});
  }

  /** Which way Rakti should turn for an attack: towards the mouse (a mouse click), or the right stick on a pad.
   *  null = keep her facing. */
  attackFacing(raktiScreenX) {
    if (this.device === 'pad') {
      if (this.aim.active && Math.abs(this.aim.x) > 0.25) return this.aim.x > 0 ? 'right' : 'left';
      return null;
    }
    if (!this.keysPressed.get('MouseLeft')) return null;
    if (this.mouseX > raktiScreenX + 6) return 'right';
    if (this.mouseX < raktiScreenX - 6) return 'left';
    return null;
  }

  _codeDown(code) {
    if (this.keysDown.get(code)) return true;
    const pad = PAD_FOR[code];
    return pad ? pad.some(b => this.padDown.has(b)) : this.padDown.has(code);
  }

  _codePressed(code) {
    if (this.keysPressed.get(code)) return true;
    const pad = PAD_FOR[code];
    return pad ? pad.some(b => this.padPressed.has(b)) : this.padPressed.has(code);
  }

  isDown(codeOrAlias) {
    const aliasList = this.aliases[codeOrAlias.toLowerCase()];
    if (aliasList) {
      return aliasList.some(code => this._codeDown(code));
    }
    return this._codeDown(codeOrAlias);
  }

  isPressed(codeOrAlias) {
    const aliasList = this.aliases[codeOrAlias.toLowerCase()];
    if (aliasList) {
      return aliasList.some(code => this._codePressed(code));
    }
    return this._codePressed(codeOrAlias);
  }

  update() {
    this.keysPressed.clear();
    this.padPressed.clear();
  }
}

export const Input = new InputManager();
