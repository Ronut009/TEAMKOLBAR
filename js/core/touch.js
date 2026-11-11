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

// id, label, key code, css class suffix. Attack is MouseLeft (what the 'attack' alias reads).
const BIG_BUTTONS = [
  { id: 'jump', label: 'JUMP', code: 'Space' },
  { id: 'attack', label: 'ATK', code: 'MouseLeft', vibrate: true },
  { id: 'interact', label: 'E', code: 'KeyE' },
  { id: 'divine', label: 'X', code: 'KeyX' }
];
const SMALL_BUTTONS = [
  { id: 'w1', label: '1', code: 'Digit1' },
  { id: 'w2', label: '2', code: 'Digit2' },
  { id: 'law', label: 'LAW', code: 'KeyZ' },
  { id: 'morph', label: 'Q', code: 'KeyQ' },
  { id: 'sands', label: 'F', code: 'KeyF' },   // Sands of Time: shown only once Rakti has found them (html.has-sands)
  { id: 'skip', label: 'C', code: 'KeyC' },
  { id: 'pause', label: '❚❚', code: 'Escape' }
];

const CSS = `
.touch-root{position:fixed;inset:0;z-index:50;pointer-events:none;user-select:none;-webkit-user-select:none;
  -webkit-touch-callout:none;touch-action:none;font-family:system-ui,sans-serif}
.touch-root *{touch-action:none;-webkit-tap-highlight-color:transparent}
.touch-zone{position:absolute;left:0;top:0;width:50%;height:100%;pointer-events:auto}
.touch-stick-base{position:absolute;width:${JOY_RADIUS * 2}px;height:${JOY_RADIUS * 2}px;margin:-${JOY_RADIUS}px 0 0 -${JOY_RADIUS}px;
  border-radius:50%;border:2px solid rgba(255,230,160,.55);background:rgba(20,10,30,.28);display:none;pointer-events:none}
.touch-stick-knob{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
  background:rgba(255,215,120,.65);border:2px solid rgba(255,245,210,.85)}
.touch-btn{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;
  color:#fff3d0;font-weight:700;background:rgba(30,15,40,.5);border:2px solid rgba(255,230,160,.6);
  text-shadow:0 1px 2px #000;transition:transform .05s,background .05s}
.touch-btn.touch-active{background:rgba(255,190,60,.75);transform:scale(.9);border-color:#fff}
.touch-btn-big{width:68px;height:68px;font-size:15px}
.touch-btn-small{width:36px;height:36px;font-size:12px}
.touch-btn-mid{width:56px;height:56px;font-size:15px}
.touch-small-row{position:absolute;top:calc(env(safe-area-inset-top,0px) + 6px);left:50%;transform:translateX(-50%);
  display:flex;gap:6px;pointer-events:none}
.touch-small-row .touch-btn{position:static}
.touch-btn-attack{width:84px;height:84px;font-size:17px}
.touch-btn-sands{display:none;border-color:rgba(255,215,110,.85)}
html.has-sands .touch-btn-sands{display:flex}
`;

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
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = this.root = document.createElement('div');
    root.className = 'touch-root';

    // Floating joystick zone (left half)
    const zone = document.createElement('div');
    zone.className = 'touch-zone';
    const base = this.stickBase = document.createElement('div');
    base.className = 'touch-stick-base';
    const knob = this.stickKnob = document.createElement('div');
    knob.className = 'touch-stick-knob';
    base.appendChild(knob);
    zone.appendChild(base);
    root.appendChild(zone);
    this._bindStick(zone);

    // Big buttons: diamond-ish cluster bottom-right
    const pos = {
      attack: 'right:24px;bottom:30px',
      jump: 'right:118px;bottom:22px',
      interact: 'right:30px;bottom:128px',
      divine: 'right:112px;bottom:112px'
    };
    for (const b of BIG_BUTTONS) {
      const el = this._button(b, b.id === 'attack' ? 'touch-btn-attack' : 'touch-btn-big');
      el.style.cssText += pos[b.id] + ';';
      root.appendChild(el);
    }
    // Small buttons: one row at the top centre, beside the HUD (pause rightmost)
    const row = document.createElement('div');
    row.className = 'touch-small-row';
    for (const b of SMALL_BUTTONS) {
      if (b.id === 'morph' || b.id === 'sands') continue;   // Q sits above E, F beside the jump button
      row.appendChild(this._button(b, 'touch-btn-small'));
    }
    root.appendChild(row);
    const sandsDef = SMALL_BUTTONS.find((b) => b.id === 'sands');
    if (sandsDef) {
      const f = this._button(sandsDef, 'touch-btn-mid');
      f.style.cssText += 'right:204px;bottom:50px;';
      root.appendChild(f);
    }
    const morphDef = SMALL_BUTTONS.find((b) => b.id === 'morph');
    if (morphDef) {
      const q = this._button(morphDef, 'touch-btn-mid');
      q.style.cssText += 'right:36px;bottom:206px;';
      root.appendChild(q);
    }

    document.body.appendChild(root);
    document.documentElement.classList.add('touch-on');
    // Stop page scroll / pinch zoom / long-press menu everywhere while playing.
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _button(def, cls) {
    const el = document.createElement('div');
    el.className = `touch-btn ${cls} touch-btn-${def.id}`;
    el.textContent = def.label;
    el.dataset.code = def.code;
    const up = (e) => {
      e.preventDefault();
      if (this.held.has(e.pointerId)) {
        this._release(def.code);
        this.held.delete(e.pointerId);
        el.classList.remove('touch-active');
      }
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      this.held.set(e.pointerId, def.code);
      this._press(def.code);
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
      this.stickBase.style.display = 'block';
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
      this.stickBase.style.display = 'none';
      this._setStick({ left: false, right: false, up: false, down: false });
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
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
    if (this.stickBase) this.stickBase.style.display = 'none';
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
