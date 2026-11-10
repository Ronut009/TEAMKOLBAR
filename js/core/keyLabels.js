/**
 * On-screen key names that follow the device in use. The game's text is written for the keyboard ("[E] TAKE THE
 * TRISHUL", "Press [F]"). While a controller is in use, every [KEY] in the page shows that controller's button
 * instead: Xbox names (A, B, X, Y, LB, RB...) or PlayStation symbols (✕, ○, □, △, L1, R1...). Switching back to
 * the keyboard puts the original text back.
 *
 * - keyLabel(text) converts one string (the dialogue box uses it as each line opens, so typing never splits a name).
 * - startKeyLabels() keeps the rest of the page (prompts, HUD hints, menus, cards) converted as it changes.
 *   Elements with data-key="ESC" (a bare key name, no brackets) are converted too.
 */
import { Input } from './input.js';

// keyboard name -> [Xbox, PlayStation]
const PAD_NAMES = {
  E: ['Y', '△'],
  F: ['RB', 'R1'],
  Q: ['LB', 'L1'],
  X: ['B', '○'],
  1: ['LT', 'L2'],
  2: ['RT', 'R2'],
  R: ['VIEW', 'CREATE'],
  C: ['VIEW', 'CREATE'],
  ESC: ['MENU', 'OPTIONS'],
  SPACE: ['A', '✕'],
  ENTER: ['A', '✕'],
  CLICK: ['X', '□']
};
const TOKEN = /\[(E|F|Q|X|1|2|R|C|ESC|SPACE|ENTER|CLICK)\]/gi;

function padName(key) {
  const n = PAD_NAMES[key.toUpperCase()];
  return n ? n[Input.labelStyle === 'ps' ? 1 : 0] : key;
}

/** The text with its [KEY] names for the device in use. */
export function keyLabel(text) {
  if (!text || !Input.labelPad) return text;
  return String(text).replace(TOKEN, (m, k) => `[${padName(k)}]`);
}

// text nodes we have converted -> their original keyboard text
const originals = new Map();
let applying = false;

function convertNode(node) {
  const cur = node.nodeValue;
  if (!cur) return;
  const known = originals.get(node);
  // the game wrote new text into it since we last converted: that is the new original
  const original = known && (cur === known.out) ? known.src : cur;
  const out = keyLabel(original);
  if (out === original) { originals.delete(node); if (cur !== original) node.nodeValue = original; return; }
  originals.set(node, { src: original, out });
  if (cur !== out) node.nodeValue = out;
}

function skip(node) {
  // the dialogue box converts its own lines when they open (typing writes them a letter at a time)
  const el = node.parentElement;
  return !el || el.closest('#dialogueText, script, style, .no-keylabel');   // (the settings list writes its own names)
}

function convertTree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!skip(n)) convertNode(n);
  for (const el of root.querySelectorAll ? root.querySelectorAll('[data-key]') : []) {
    el.textContent = Input.labelPad ? padName(el.dataset.key) : el.dataset.key;
  }
}

function refreshAll() {
  applying = true;
  for (const [node, rec] of originals) {
    if (!node.isConnected) { originals.delete(node); continue; }
    if (node.nodeValue === rec.out) node.nodeValue = rec.src;   // back to the original before converting again
  }
  originals.clear();
  convertTree(document.body);
  applying = false;
}

export function startKeyLabels() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const obs = new MutationObserver((records) => {
    if (applying || !Input.labelPad) return;
    applying = true;
    for (const r of records) {
      if (r.type === 'characterData') { if (!skip(r.target)) convertNode(r.target); continue; }
      for (const n of r.addedNodes) {
        if (n.nodeType === 3) { if (!skip(n)) convertNode(n); } else if (n.nodeType === 1) convertTree(n);
      }
    }
    applying = false;
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  Input.onDeviceChange(() => refreshAll());
  if (Input.labelPad) refreshAll();   // a controller chosen in Settings last time
}
