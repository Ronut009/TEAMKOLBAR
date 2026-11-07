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
const GROUPS = ['MOVEMENT', 'COMBAT', 'ABILITIES', 'MENUS & STORY'];
const BINDS = {
  keyboard: {
    MOVEMENT: [['Move', ['A', 'D']], ['Climb ladders', ['W', 'S']], ['Jump', ['SPACE']], ['Drop through a ledge', ['S', '+', 'SPACE']]],
    COMBAT: [['Attack', ['LEFT CLICK']], ['Aim the Trishul', ['MOUSE']], ['Talwar', ['1']], ['Trishul', ['2']]],
    ABILITIES: [['Kali form', ['X']], ['Shape the earth', ['Q']], ['Sands of Time', ['F']]],
    'MENUS & STORY': [['Interact / next line', ['E']], ['Skip a conversation', ['C']], ['Restart at checkpoint', ['R']], ['Pause / back', ['ESC']], ['Skip the opening film', ['HOLD ESC']]]
  },
  xbox: {
    MOVEMENT: [['Move', ['D-PAD', 'L-STICK']], ['Climb ladders', ['▲', '▼']], ['Jump', ['A']], ['Drop through a ledge', ['▼', '+', 'A']]],
    COMBAT: [['Attack', ['X']], ['Aim the Trishul', ['R-STICK']], ['Talwar', ['LT']], ['Trishul', ['RT']]],
    ABILITIES: [['Kali form', ['B']], ['Shape the earth', ['LB']], ['Sands of Time', ['RB']]],
    'MENUS & STORY': [['Interact / next line', ['Y']], ['Skip a conversation', ['VIEW']], ['Restart at checkpoint', ['VIEW']], ['Pause', ['MENU']], ['Skip the opening film', ['HOLD MENU']]]
  },
  ps: {
    MOVEMENT: [['Move', ['D-PAD', 'L-STICK']], ['Climb ladders', ['▲', '▼']], ['Jump', ['✕']], ['Drop through a ledge', ['▼', '+', '✕']]],
    COMBAT: [['Attack', ['□']], ['Aim the Trishul', ['R-STICK']], ['Talwar', ['L2']], ['Trishul', ['R2']]],
    ABILITIES: [['Kali form', ['○']], ['Shape the earth', ['L1']], ['Sands of Time', ['R1']]],
    'MENUS & STORY': [['Interact / next line', ['△']], ['Skip a conversation', ['CREATE']], ['Restart at checkpoint', ['CREATE']], ['Pause', ['OPTIONS']], ['Skip the opening film', ['HOLD OPTIONS']]]
  }
};
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
    this.shownDevice = null;   // the device whose list is on screen
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

  show(from) {
    if (!this.el) return;
    this.from = from || null;
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
    if (this.shownDevice === dev) return;
    this.shownDevice = dev;
    const binds = BINDS[dev];
    const cap = (k) => (k === '+' ? '<i>+</i>' : `<b class="${SYM.has(k) ? 'sym' : ''}">${esc(k)}</b>`);
    this.list.innerHTML = GROUPS.map((g) => `<div class="set-group"><h3>${esc(g)}</h3>${binds[g].map(([what, keys]) =>
      `<div class="set-row"><span>${esc(what)}</span><span class="set-keys">${keys.map(cap).join('')}</span></div>`).join('')}</div>`).join('');
  }
}
