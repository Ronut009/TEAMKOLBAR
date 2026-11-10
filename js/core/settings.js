/**
 * Settings (from the title screen and the pause menu). Controls: the player picks what they play with
 * (keyboard & mouse, an Xbox controller or a PlayStation controller) and sees what every key or button does.
 * The choice also sets the key names shown everywhere in the game (prompts, dialogue, the skip button); every
 * device keeps working whatever is picked. Until a choice is made the game follows the device in use.
 * The screen's markup is #settingsScreen in index.html; its buttons are the main menu's (.menu-button).
 */
import { Input } from './input.js';
import { Sfx } from './audio.js';

// What each action is on each device, by group. A name in SYM is a PlayStation symbol (drawn larger).
// Each row names what it needs (`need`); the screen only lists rows the player has (see `show(from, has)`), so the
// title screen never spoils the powers, the campaign adds them as the story gives them, and Chaos mode lists only
// what its arena uses. A row without `need` is always listed.
const GROUPS = ['MOVEMENT', 'COMBAT', 'ABILITIES', 'MENUS & STORY'];
const ROWS = [
  { g: 'MOVEMENT', what: 'Move', keyboard: ['A', 'D'], xbox: ['D-PAD', 'L-STICK'], ps: ['D-PAD', 'L-STICK'] },
  { g: 'MOVEMENT', what: 'Climb ladders', need: 'climb', keyboard: ['W', 'S'], xbox: ['▲', '▼'], ps: ['▲', '▼'] },
  { g: 'MOVEMENT', what: 'Jump', keyboard: ['SPACE'], xbox: ['A'], ps: ['✕'] },
  { g: 'MOVEMENT', what: 'Drop through a ledge', need: 'ledge', keyboard: ['S', '+', 'SPACE'], xbox: ['▼', '+', 'A'], ps: ['▼', '+', '✕'] },
  { g: 'COMBAT', what: 'Attack', need: 'attack', keyboard: ['LEFT CLICK'], xbox: ['X'], ps: ['□'] },
  { g: 'COMBAT', what: 'Aim the Trishul', need: 'trishul', keyboard: ['MOUSE'], xbox: ['R-STICK'], ps: ['R-STICK'] },
  { g: 'COMBAT', what: 'Talwar', need: 'trishul', keyboard: ['1'], xbox: ['LT'], ps: ['L2'] },
  { g: 'COMBAT', what: 'Trishul', need: 'trishul', keyboard: ['2'], xbox: ['RT'], ps: ['R2'] },
  { g: 'ABILITIES', what: 'Kali form', need: 'kali', keyboard: ['X'], xbox: ['B'], ps: ['○'] },
  { g: 'ABILITIES', what: 'Shape the earth', need: 'earth', keyboard: ['Q'], xbox: ['LB'], ps: ['L1'] },
  { g: 'ABILITIES', what: 'Sands of Time', need: 'sands', keyboard: ['F'], xbox: ['RB'], ps: ['R1'] },
  { g: 'MENUS & STORY', what: 'Interact / next line', need: 'story', keyboard: ['E'], xbox: ['Y'], ps: ['△'] },
  { g: 'MENUS & STORY', what: 'Skip a conversation', need: 'story', keyboard: ['C'], xbox: ['VIEW'], ps: ['CREATE'] },
  { g: 'MENUS & STORY', what: 'Restart at checkpoint', need: 'checkpoint', keyboard: ['R'], xbox: ['VIEW'], ps: ['CREATE'] },
  { g: 'MENUS & STORY', what: 'Restart the arena', need: 'arena', keyboard: ['R'], xbox: ['VIEW'], ps: ['CREATE'] },
  { g: 'MENUS & STORY', what: 'Pause', keyboard: ['ESC'], xbox: ['MENU'], ps: ['OPTIONS'] },
  { g: 'MENUS & STORY', what: 'Skip the opening film', need: 'film', keyboard: ['HOLD ESC'], xbox: ['HOLD MENU'], ps: ['HOLD OPTIONS'] }
];
/** The title screen: the basics only (no powers, no Trishul: they would spoil the story). */
export const MENU_CONTROLS = { climb: true, ledge: true, attack: true, story: true, checkpoint: true, film: true };
const SYM = new Set(['✕', '○', '□', '△', '▲', '▼']);

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class SettingsMenu {
  constructor() {
    this.el = document.getElementById('settingsScreen');
    this.panel = document.getElementById('settingsPanel');
    this.list = document.getElementById('settingsBinds');
    this.note = document.getElementById('settingsNote');
    this.devButtons = [...document.querySelectorAll('#settingsScreen [data-device]')];
    this.from = null;          // the button that opened it (focus goes back there)
    this.has = MENU_CONTROLS;  // what the player has (which rows to list)
    this.shownKey = null;      // the device + rows on screen
    for (const b of this.devButtons) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Input.setLabelPref(b.dataset.device);
        Sfx.play('text_pop');
        this.render();
      });
    }
    document.getElementById('settingsBack')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.hide(); });
    // what is shown follows a controller being picked up or put down (while nothing has been chosen)
    Input.onDeviceChange(() => { if (this.isOpen) this.render(); });
  }

  get isOpen() { return Boolean(this.el?.classList.contains('active')); }

  /** The device the screen highlights: the player's choice, else the one in use. */
  current() {
    if (Input.labelPref) return Input.labelPref;
    return Input.device === 'pad' ? Input.padStyle : 'keyboard';
  }

  /** from: the button that opened it. has: { need: true } for the rows to list (MENU_CONTROLS on the title screen). */
  show(from, has = MENU_CONTROLS) {
    if (!this.el) return;
    this.from = from || null;
    this.has = has || MENU_CONTROLS;
    this.el.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
    this.render();
    this.devButtons.find((b) => b.dataset.device === this.current())?.focus({ focusVisible: false });
  }

  hide() {
    if (!this.el || !this.isOpen) return;
    this.el.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
    Input.keysPressed?.clear();
    this.from?.focus({ focusVisible: false });
  }

  render() {
    const dev = this.current();
    for (const b of this.devButtons) {
      const on = b.dataset.device === dev;
      b.classList.toggle('chosen', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (this.note) {
      this.note.textContent = Input.labelPref
        ? 'Button names in the game follow your choice. Every device still works.'
        : 'Picked for you from what you last touched. Choose one to keep it.';
    }
    const rows = ROWS.filter((r) => !r.need || this.has[r.need]);
    const key = dev + ':' + rows.map((r) => r.what).join('|');
    if (this.shownKey === key) return;
    this.shownKey = key;
    const cap = (k) => (k === '+' ? '<i>+</i>' : `<b class="${SYM.has(k) ? 'sym' : ''}">${esc(k)}</b>`);
    this.list.innerHTML = GROUPS.map((g) => {
      const list = rows.filter((r) => r.g === g);
      if (!list.length) return '';
      return `<div class="set-group"><h3>${esc(g)}</h3>${list.map((r) =>
        `<div class="set-row"><span>${esc(r.what)}</span><span class="set-keys">${r[dev].map(cap).join('')}</span></div>`).join('')}</div>`;
    }).join('');
  }
}
