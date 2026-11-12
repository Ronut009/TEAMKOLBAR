/**
 * ==========================================================================
 * TOUCH CONTROLS (js/core/touch.js)
 * On-screen joystick + buttons for phones/tablets. Writes into the same
 * Input.keysDown / keysPressed entries as the keyboard, so gameplay code is
 * unchanged. Also provides auto-aim (Input.mouseX/Y) while touch is active.
 * Desktop (mouse / keyboard only) never sees the overlay.
 * ==========================================================================
 */

import { Input } from './input.js';
import { Mode } from './mode.js';

const JOY_RADIUS = 56;       // px the thumb travels before the stick saturates
const JOY_DEAD = 0.32;       // horizontal threshold (fraction of radius)
const JOY_VERT = 0.55;       // vertical threshold (fraction of radius)
const MELEE_RANGE = 220;     // talwar: world px in front of Rakti searched for enemies
const MELEE_VERT = 120;      // talwar: max vertical offset of a target
const THROW_SPEED = 640;     // matches TRISHUL.speed (used to lead moving targets)
const THROW_REACH = 380;     // matches TRISHUL.range; levels may set their own trishulRange
const LEAD_MAX = 110;        // never lead a moving target by more than this many world px
const MOTION_MAX = 900;      // a measured speed above this (world px / s) is a teleport, not a movement
const LOCK_BONUS = 70;       // sticky targeting: the current target wins unless another is this much closer

// The buttons, in the order of the Settings controls list. Each shows a picture and its action's name (never a
// keyboard letter: the game's prompts name these buttons too, see keyLabels.js). `code` is what it presses; the
// weapon button presses 1 or 2, whichever switches away from the weapon in hand. Styles: css/style.css, "TOUCH CONTROLS".
const svg = (vb, body, cls = '') => `<svg class="touch-svg ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const UP_ARROW = svg('0 0 32 26', '<path d="M4 22 L16 6 L28 22"/><path d="M10 24 L16 16 L22 24" opacity=".55"/>');
const PAUSE = svg('0 0 20 20', '<rect x="3" y="2" width="5" height="16" rx="1"/><rect x="12" y="2" width="5" height="16" rx="1"/>', 'solid');
const HAND = svg('0 0 32 32', '<path d="M10 17 V8.5 a2 2 0 0 1 4 0 V15 M14 15 V6.5 a2 2 0 0 1 4 0 V15 M18 15 V8 a2 2 0 0 1 4 0 V16 M22 16 V11.5 a2 2 0 0 1 4 0 V19 c0 6 -4 10 -9 10 c-4 0 -6 -2 -8 -5 l-4 -6 a2 2 0 0 1 3.2 -2.4 L10 17"/>');
const STONE = svg('0 0 32 26', '<path d="M2 24 L11 8 L16 15 L21 6 L30 24 Z"/><path d="M8 24 L12 17 M19 24 L22 16" opacity=".6"/>');
const GLASS = svg('0 0 24 30', '<path d="M5 3 H19 M5 27 H19"/><path d="M7 3 C7 11 17 13 17 15 C17 17 7 19 7 27 M17 3 C17 11 7 13 7 15 C7 17 17 19 17 27"/><path d="M10 24 L12 21 L14 24 Z" class="fill"/>');
const SKIP = svg('0 0 28 20', '<path d="M3 3 L12 10 L3 17 Z M13 3 L22 10 L13 17 Z" class="fill"/><path d="M25 3 V17"/>');
const SWAP = svg('0 0 28 12', '<path d="M3 4 H23 L19 1 M25 8 H5 L9 11"/>', 'swap');
const MAIN_BUTTONS = [
  { id: 'attack', size: 'attack', code: 'MouseLeft', vibrate: true, html: '<img class="touch-icon" data-weapon-icon alt=""><span class="touch-cap">ATTACK</span>' },
  { id: 'jump', size: 'big', code: 'Space', html: `${UP_ARROW}<span class="touch-cap">JUMP</span>` },
  { id: 'divine', size: 'big', code: 'KeyX', html: '<img class="touch-medallion" src="assets/ui/hud/kali_medallion.webp" alt="">' },   // the medallion is the whole button
  { id: 'interact', size: 'mid', code: 'KeyE', html: `${HAND}<span class="touch-cap">USE</span>` },
  { id: 'morph', size: 'mid', code: 'KeyQ', html: `${STONE}<span class="touch-cap">EARTH</span>` },
  { id: 'sands', size: 'mid', code: 'KeyF', html: `${GLASS}<span class="touch-cap">SANDS</span>` },
  { id: 'weapon', size: 'mid', code: 'Digit2', html: `<img class="touch-icon" data-swap-icon alt="">${SWAP}<span class="touch-cap">SWITCH</span>` },
  { id: 'pause', size: 'small', code: 'Escape', html: PAUSE },
];
const ROW_BUTTONS = [
  { id: 'skip', code: 'KeyC', html: `${SKIP}<span class="touch-cap">SKIP</span>` },
];
const LABELS = { attack: 'Attack', jump: 'Jump', divine: 'Kali form', interact: 'Use, talk, next line', morph: 'Shape the earth',
  sands: 'Sands of Time', weapon: 'Switch weapon', skip: 'Skip the conversation', pause: 'Pause' };

class TouchControls {
  constructor() {
    this.active = false;
    this.root = null;
    this.held = new Map();      // pointerId -> { code } for buttons
    this.stick = null;          // { id, ox, oy }
    this.stickState = { left: false, right: false, up: false, down: false };
    this.mounted = false;
    this.aimFacing = 'right';

    // Hybrid build: the overlay belongs to Mobile Mode and only to it. In PC Mode
    // Touch.active stays false, so every Touch.active branch behaves like the PC game.
    if (Mode.isMobile) this._mountWhenReady();

    // Touch taps also synthesize mouse events; once touch is active they must not drive the attack.
    const swallowSynth = (e) => {
      if (this.active && (e.sourceCapabilities?.firesTouchEvents || e.pointerType === 'touch')) {
        e.stopImmediatePropagation();
      }
    };
    for (const t of ['mousedown', 'mouseup', 'mousemove']) window.addEventListener(t, swallowSynth, true);

    const releaseAll = () => this.releaseAll();
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  }

  _mountWhenReady() {
    if (this.mounted) return;
    this.mounted = true;
    const go = () => this._build();
    if (document.body) go(); else window.addEventListener('DOMContentLoaded', go);
  }

  _build() {
    this.active = true;
    const root = this.root = document.createElement('div');
    root.className = 'touch-root t-hidden';

    // Floating joystick zone (left part of the screen); the stick rests faintly where the thumb usually lands
    const zone = document.createElement('div');
    zone.className = 'touch-zone';
    const base = this.stickBase = document.createElement('div');
    base.className = 'touch-stick-base idle';
    const knob = this.stickKnob = document.createElement('div');
    knob.className = 'touch-stick-knob';
    base.appendChild(knob);
    zone.appendChild(base);
    root.appendChild(zone);
    this._bindStick(zone);

    for (const b of MAIN_BUTTONS) root.appendChild(this._button(b, `touch-btn-${b.size}`));
    const row = document.createElement('div');
    row.className = 'touch-small-row';
    for (const b of ROW_BUTTONS) row.appendChild(this._button(b, 'touch-btn-small'));
    root.appendChild(row);
    this.weaponIcon = root.querySelector('[data-weapon-icon]');
    this.swapIcon = root.querySelector('[data-swap-icon]');
    this.weaponBtn = root.querySelector('.touch-btn-weapon');

    document.body.appendChild(root);
    document.documentElement.classList.add('touch-on');
    // Stop the long-press menu everywhere on the controls.
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Called by the engine every frame: shows a button once Rakti has its ability (the same list the Settings
   * screen uses), fades the action buttons while someone is speaking, hides everything over menus and cards, and
   * puts the equipped weapon on the attack button.
   */
  sync(engine) {
    if (!this.root) return;
    const playing = engine.isGameStarted && !engine.isLoading && !engine.paused && !engine.intro &&
      !engine.levelCompleted && !engine.playerDying && !engine.settings?.isOpen;
    const has = playing ? engine.controlsHave() : {};
    const want = {
      't-hidden': !playing,
      't-attack': Boolean(has.attack),
      't-trishul': Boolean(has.trishul),
      't-kali': Boolean(has.kali),
      't-earth': Boolean(has.earth),
      't-sands': Boolean(has.sands),
      't-dialogue': Boolean(playing && engine.dialogueActive)
    };
    for (const [cls, on] of Object.entries(want)) {
      if (this.root.classList.contains(cls) !== on) this.root.classList.toggle(cls, on);
    }
    if ((!playing || want['t-dialogue']) && (this.held.size || this.stick)) this.releaseAll();   // (a conversation lets go of the stick)
    if (playing) this._placeRow();
    const weapon = engine.player?.weapon === 'trishul' && engine.player?.hasTrishul ? 'trishul' : 'sword';
    if (weapon !== this.shownWeapon) {
      this.shownWeapon = weapon;
      if (this.weaponIcon) this.weaponIcon.src = weapon === 'trishul' ? 'assets/ui/hud/trishul.webp' : 'assets/ui/hud/talwar.webp';
      // the switch button shows (and presses) the weapon she is NOT holding
      if (this.swapIcon) this.swapIcon.src = weapon === 'trishul' ? 'assets/ui/hud/talwar.webp' : 'assets/ui/hud/trishul.webp';
      if (this.weaponBtn) this.weaponBtn.dataset.code = weapon === 'trishul' ? 'Digit1' : 'Digit2';
      document.documentElement.classList.toggle('weapon-trishul', weapon === 'trishul');
      document.documentElement.classList.toggle('weapon-sword', weapon === 'sword');
    }
  }

  /**
   * The top row (weapons, C, pause) sits in the free strip between the HUD on the left and whatever is on the right
   * (the boss or Pitaji bar, the Forest Heart clock), shrinking a little on a small phone rather than covering them.
   * Measured a few times a second, not every frame.
   */
  _placeRow() {
    const now = performance.now();
    if (now - (this.rowCheckedAt || 0) < 300) return;
    this.rowCheckedAt = now;
    const row = this.root.querySelector('.touch-small-row');
    if (!row) return;
    const vw = window.innerWidth;
    const hud = document.getElementById('hud')?.getBoundingClientRect();
    // for the CSS: where the HUD ends (Chaos mode's stats start after it) and how big the pause button is
    const root = document.documentElement;
    if (hud && hud.width) root.style.setProperty('--hud-r', `${Math.round(hud.right)}px`);
    const pz = this.root.querySelector('.touch-btn-pause')?.getBoundingClientRect();
    if (pz && pz.width) root.style.setProperty('--t-small-px', `${Math.round(pz.width)}px`);
    let left = hud && hud.width ? hud.right + 10 : 0;
    let right = vw;
    for (const id of ['bossHud', 'fatherHud', 'heartClock']) {
      const el = document.getElementById(id);
      if (!el || !el.classList.contains('show')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.top < 90) right = Math.min(right, r.left - 10);
    }
    if (pz && pz.width) right = Math.min(right, pz.left - 10);   // (and the pause button in the corner)
    const width = row.scrollWidth || 1;
    // centred on the screen when that fits, else centred in the free strip
    let centre = vw / 2;
    if (centre - width / 2 < left || centre + width / 2 > right) centre = (left + right) / 2;
    const scale = Math.max(0.72, Math.min(1, (right - left) / width));
    const key = `${Math.round(centre)}|${scale.toFixed(2)}`;
    if (key === this.rowKey) return;
    this.rowKey = key;
    row.style.left = `${Math.round(centre)}px`;
    row.style.transform = `translateX(-50%) scale(${scale.toFixed(2)})`;
  }

  _button(def, cls) {
    const el = document.createElement('div');
    el.className = `touch-btn ${cls} touch-btn-${def.id}`;
    el.innerHTML = def.html;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', LABELS[def.id] || def.id);
    el.dataset.code = def.code;
    const up = (e) => {
      e.preventDefault();
      if (this.held.has(e.pointerId)) {
        this._release(this.held.get(e.pointerId));
        this.held.delete(e.pointerId);
        el.classList.remove('touch-active');
      }
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      const code = el.dataset.code;   // (the weapon button changes its code with the weapon in hand)
      this.held.set(e.pointerId, code);
      this._press(code);
      el.classList.add('touch-active');
      if (def.vibrate && navigator.vibrate) navigator.vibrate(15);
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    return el;
  }

  _bindStick(zone) {
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.stick) return;
      try { zone.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      this.stickBase.classList.remove('idle');
      this.stickBase.classList.add('live');
      this.stickBase.style.left = e.clientX + 'px';
      this.stickBase.style.top = e.clientY + 'px';
      this.stickKnob.style.transform = 'translate(0,0)';
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      e.preventDefault();
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
      this.stickKnob.style.transform = `translate(${dx}px,${dy}px)`;
      this._setStick({
        left: dx < -JOY_DEAD * JOY_RADIUS,
        right: dx > JOY_DEAD * JOY_RADIUS,
        up: dy < -JOY_VERT * JOY_RADIUS,
        down: dy > JOY_VERT * JOY_RADIUS
      });
    });
    const end = (e) => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      e.preventDefault();
      this.stick = null;
      this._restStick();
      this._setStick({ left: false, right: false, up: false, down: false });
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  /** The stick goes back to its resting place, faint. */
  _restStick() {
    if (!this.stickBase) return;
    this.stickBase.classList.remove('live');
    this.stickBase.classList.add('idle');
    this.stickBase.style.left = '';
    this.stickBase.style.top = '';
    this.stickKnob.style.transform = 'translate(0,0)';
  }

  _setStick(next) {
    const map = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' };
    for (const dir of Object.keys(map)) {
      if (next[dir] === this.stickState[dir]) continue;
      this.stickState[dir] = next[dir];
      if (next[dir]) this._press(map[dir]); else this._release(map[dir]);
    }
  }

  _press(code) {
    if (!Input.keysDown.get(code)) Input.keysPressed.set(code, true);
    Input.keysDown.set(code, true);
  }

  _release(code) {
    Input.keysDown.set(code, false);
  }

  releaseAll() {
    if (!this.root) return;
    for (const code of this.held.values()) this._release(code);
    this.held.clear();
    this.root.querySelectorAll('.touch-active').forEach((el) => el.classList.remove('touch-active'));
    this.stick = null;
    this._restStick();
    this._setStick({ left: false, right: false, up: false, down: false });
  }

  /** Everything Rakti can hit: what the level lists as damageable plus the usual enemy lists, alive and visible. */
  _targets(level) {
    const out = new Set();
    const add = (list) => {
      if (!list) return;
      const arr = Array.isArray(list) ? list : Object.values(list);
      for (const e of arr) {
        if (e && typeof e === 'object' && Number.isFinite(e.x) && Number.isFinite(e.y) &&
            !e.dead && e.alive !== false && !e.hidden && !e.removed && !e.dormant && !e.crushOnly &&
            (e.appear ?? 1) >= 1) out.add(e);   // appear < 1: still rising into place, cannot be hit yet
      }
    };
    if (level?.getDamageables) add(level.getDamageables());
    add(level?.betals);
    add(level?.archers);
    add(level?.enemies);
    add(level?.goblins);
    if (level?.boss) add([level.boss]);
    return [...out];
  }

  /**
   * How fast each target is really moving, measured from where it was last frame. An enemy's own vx / vy cannot be
   * trusted for this: the boss walks by setting x directly (no vx) and keeps the vy of his last leap long after he
   * has landed, which used to drag the aim point down into the floor.
   */
  _trackMotion(targets) {
    const now = performance.now();
    if (!this.motion) this.motion = new WeakMap();
    for (const e of targets) {
      const m = this.motion.get(e);
      if (!m) { this.motion.set(e, { x: e.x, y: e.y, t: now, vx: 0, vy: 0 }); continue; }
      const dt = (now - m.t) / 1000;
      if (dt < 0.004) continue;                                 // same frame (refineThrow): keep the last reading
      let vx = 0, vy = 0;
      if (dt <= 0.12) {                                         // (longer: paused or out of sight, so no reading)
        vx = (e.x - m.x) / dt;
        vy = (e.y - m.y) / dt;
        if (Math.hypot(vx, vy) > MOTION_MAX) { vx = 0; vy = 0; }   // a teleport, not a movement
      }
      m.vx += (vx - m.vx) * 0.5;
      m.vy += (vy - m.vy) * 0.5;
      m.x = e.x; m.y = e.y; m.t = now;
    }
  }

  /** Where the Trishul must go to hit `e`: the middle of its hit box, led by its measured movement. */
  _aimPoint(e, sx, sy) {
    const hh = e.hitHeight ?? 64;
    let tx = e.x, ty = e.y - hh * 0.55;
    const t = Math.hypot(tx - sx, ty - sy) / THROW_SPEED;
    const m = this.motion?.get(e);
    const lead = (v) => Math.max(-LEAD_MAX, Math.min(LEAD_MAX, (Number.isFinite(v) ? v : 0) * t));
    tx += lead(m?.vx);
    ty += lead(m?.vy);
    return { x: tx, y: ty };
  }

  /**
   * Best Trishul target in ANY direction (up onto the wall archers, down, behind) that is on screen and within the
   * throw's reach. Nearest wins, targets behind Rakti count as slightly farther, and the previous target is sticky.
   */
  _pickThrow(engine) {
    const p = engine.player, z = engine.zoom, level = engine.level;
    const dir = p.facing === 'left' ? -1 : 1;
    const sx = p.x + dir * 18, sy = p.y - 40;                   // where the Trishul leaves her hand
    const camX = Math.floor(engine.camX), camY = Math.floor(engine.camY);
    const reach = (level?.trishulRange ?? THROW_REACH) + 30;
    const vw = window.innerWidth, vh = window.innerHeight;
    let best = null, bestScore = Infinity;
    const targets = this._targets(level);
    this._trackMotion(targets);
    for (const e of targets) {
      const pt = this._aimPoint(e, sx, sy);
      const scrX = (pt.x - camX) * z, scrY = (pt.y - camY) * z;
      if (scrX < -20 || scrX > vw + 20 || scrY < -20 || scrY > vh + 20) continue;   // off screen
      const d = Math.hypot(pt.x - sx, pt.y - sy);
      if (d > reach) continue;
      let score = d;
      if ((pt.x - p.x) * dir < -8) score += 90;                // behind her: she would have to turn
      if (e === this.lock) score -= LOCK_BONUS;
      if (score < bestScore) { bestScore = score; best = { e, pt }; }
    }
    return { best, sx, sy, dir };
  }

  /** Talwar: the nearest enemy in front of her. */
  _pickMelee(engine) {
    const p = engine.player;
    const dir = p.facing === 'left' ? -1 : 1;
    let best = null, bestD = Infinity;
    for (const e of this._targets(engine.level)) {
      const dx = (e.x - p.x) * dir, dy = e.y - p.y;
      if (dx < -8 || dx > MELEE_RANGE || Math.abs(dy) > MELEE_VERT) continue;
      const d = Math.abs(dx) + Math.abs(dy) * 0.5;
      if (d < bestD) { bestD = d; best = e; }
    }
    return { best, dir };
  }

  /**
   * Called by the engine each frame before the player updates (every mode and level). Sets Input.mouseX/Y to the
   * screen position of the target: with the Trishul any enemy in reach in any direction, with the talwar the
   * nearest one in front. No target: straight ahead in her facing direction.
   */
  autoAim(engine) {
    if (!this.active) return;
    this._engine = engine;
    const p = engine.player, z = engine.zoom;
    const camX = Math.floor(engine.camX), camY = Math.floor(engine.camY);
    let wx, wy;
    if (p.weapon === 'trishul' && p.hasTrishul) {
      const { best, sx, sy, dir } = this._pickThrow(engine);
      this.lock = best ? best.e : null;
      wx = best ? best.pt.x : sx + dir * 240;
      wy = best ? best.pt.y : sy;                              // level with the throw origin: perfectly horizontal
    } else {
      const { best, dir } = this._pickMelee(engine);
      this.lock = null;
      wx = best ? best.x : p.x + dir * 240;
      wy = best ? best.y - (best.hitHeight ?? 64) * 0.55 : p.y - 36;
    }
    Input.mouseX = (wx - camX) * z;
    Input.mouseY = (wy - camY) * z;
  }

  /**
   * Called when the Trishul actually leaves her hand (a fraction of a second after the tap): re-aims at where the
   * locked target is now. Returns a world point, or null to keep the aim taken at the tap.
   */
  refineThrow = () => {
    const eng = this._engine;
    if (!this.active || !eng) return null;
    const { best } = this._pickThrow(eng);
    return best ? best.pt : null;
  };
}

export const Touch = new TouchControls();
