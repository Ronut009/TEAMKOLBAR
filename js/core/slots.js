/**
 * The campaign's save-slot screen (title screen > CAMPAIGN MODE). Three slots: an empty one starts a new game after
 * the difficulty is chosen; a used one continues; a finished one can be played again. Each used slot can be deleted
 * (it asks first). The markup is #slotScreen in index.html; saving itself is in js/core/run.js.
 */
import { Saves, SLOT_COUNT } from './run.js';
import { Sfx } from './audio.js';

const LEVELS = { 1: 'DROWNED DWARAKA', 2: 'SURYA MANDIR', 3: 'VRINDAVAN', 4: 'INDRAPRASTHA' };
const DIFF_NAME = { normal: 'NORMAL', hard: 'HARD', hardcore: 'HARDCORE' };
const clock = (sec) => {
  const t = Math.floor(sec || 0), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class SlotsMenu {
  /** onNew(slot, difficulty) and onContinue(slot) start the game. */
  constructor({ onNew, onContinue }) {
    this.onNew = onNew;
    this.onContinue = onContinue;
    this.el = document.getElementById('slotScreen');
    this.views = { slots: document.getElementById('slotList'), difficulty: document.getElementById('slotDifficulty'), confirm: document.getElementById('slotConfirm') };
    this.rows = document.getElementById('slotRows');
    this.view = 'slots';
    this.slot = 0;          // the slot being started or deleted
    this.from = null;
    const click = (el, fn) => el?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(e); });
    click(this.rows, (e) => {
      const b = e.target.closest('button[data-slot]');
      if (!b) return;
      const i = Number(b.dataset.slot), save = Saves.get(i);
      Sfx.play('text_pop');
      if (b.dataset.act === 'delete') { this.slot = i; this.open('confirm'); return; }
      if (save && !save.completed) { this.hide(false); this.onContinue(i); return; }
      this.slot = i;
      this.open('difficulty');      // an empty slot, or a finished one played again
    });
    for (const b of document.querySelectorAll('#slotDifficulty [data-diff]')) {
      click(b, () => { Sfx.play('text_pop'); this.hide(false); this.onNew(this.slot, b.dataset.diff); });
    }
    click(document.getElementById('slotDiffBack'), () => this.back());
    click(document.getElementById('slotBack'), () => this.back());
    click(document.getElementById('slotYes'), () => { Saves.clear(this.slot); Sfx.play('text_pop'); this.open('slots'); });
    click(document.getElementById('slotNo'), () => this.back());
  }

  get isOpen() { return Boolean(this.el?.classList.contains('active')); }
  /** The panel a controller moves in. */
  get panel() { return this.views[this.view]; }

  show(from) {
    if (!this.el) return;
    this.from = from || null;
    this.el.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
    this.open('slots');
  }

  hide(refocus = true) {
    if (!this.el || !this.isOpen) return;
    this.el.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
    if (refocus) this.from?.focus({ focusVisible: false });
  }

  /** [Esc] / B / a Back button: one step back, or out to the title screen. */
  back() {
    Sfx.play('text_pop');
    if (this.view === 'slots') this.hide(); else this.open('slots');
  }

  open(view) {
    this.view = view;
    for (const [name, el] of Object.entries(this.views)) if (el) el.hidden = name !== view;
    if (view === 'slots') this.renderSlots();
    if (view === 'difficulty') {
      const again = Boolean(Saves.get(this.slot)?.completed);
      document.getElementById('slotDiffTitle').textContent = `SLOT ${this.slot + 1}  ·  CHOOSE DIFFICULTY`;
      document.getElementById('slotDiffNote').textContent = again
        ? 'Starting again replaces this slot\'s finished journey. The difficulty cannot be changed once the journey begins.'
        : 'The difficulty cannot be changed once the journey begins.';
    }
    if (view === 'confirm') {
      document.getElementById('slotConfirmText').textContent = `Slot ${this.slot + 1} will be erased for good. This cannot be undone.`;
    }
    const first = view === 'confirm' ? document.getElementById('slotNo') : this.panel?.querySelector('button.menu-button');
    first?.focus({ focusVisible: false });
  }

  renderSlots() {
    const saves = Saves.all();
    this.rows.innerHTML = Array.from({ length: SLOT_COUNT }, (_, i) => {
      const s = saves[i];
      let top = `SLOT ${i + 1}`, sub = 'EMPTY  ·  NEW GAME';
      if (s) {
        top += `  ·  ${DIFF_NAME[s.difficulty]}`;
        const deaths = `${s.deaths || 0} ${s.deaths === 1 ? 'DEATH' : 'DEATHS'}`;
        if (s.completed) sub = `COMPLETED  ·  ${clock(s.time)}  ·  ${deaths}`;
        else {
          sub = `LEVEL ${s.level}  ·  ${LEVELS[s.level]}  ·  ${clock(s.time)}`;
          sub += s.difficulty === 'hardcore' ? `  ·  ATTEMPT ${s.attempts || 1}` : `  ·  ${deaths}`;
        }
      }
      return `<div class="slot-row">
        <div class="slot-main${s ? '' : ' empty'}">
          <button class="menu-button slot-card" type="button" data-slot="${i}"><span class="slot-top">${esc(top)}</span></button>
          <p class="slot-sub">${esc(sub)}</p>
        </div>
        <button class="menu-button slot-del" type="button" data-slot="${i}" data-act="delete" aria-label="Delete slot ${i + 1}"${s ? '' : ' disabled'}><span>DELETE</span></button>
      </div>`;
    }).join('');
  }
}
