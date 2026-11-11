/**
 * Knows which pictures are still downloading, so the loading screen can wait for a level's art instead of showing
 * the level with pieces missing. It must be the first import of js/main.js: it wraps `new Image()` before any other
 * script creates one. A picture that fails to load counts as done (the game draws without it, as before).
 */
const made = [];
const Native = window.Image;
function WatchedImage(w, h) {
  const im = w === undefined ? new Native() : new Native(w, h);
  made.push(im);
  return im;
}
WatchedImage.prototype = Native.prototype;
window.Image = WatchedImage;

// The folders (under assets/) every level draws from, and each level's own (5 = Chaos mode)
const SHARED = ['anims/', 'platforms/', 'portraits/', 'ui/', 'weapons/'];
const OWN = { 1: ['level1/'], 2: ['level2/'], 3: ['level3/'], 4: ['level4/', 'level2/archer/'], 5: ['endless/', 'level2/archer/'] };

export const AssetWatch = {
  /** How many of a level's pictures are still on their way. */
  pending(levelIndex) {
    const folders = [...SHARED, ...(OWN[levelIndex] || [])].map((f) => 'assets/' + f);
    let n = 0;
    for (const im of made) {
      const src = im.getAttribute('src');
      if (src && !im.complete && folders.some((f) => src.includes(f))) n++;
    }
    return n;
  }
};
