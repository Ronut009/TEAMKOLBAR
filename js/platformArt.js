/**
 * ==========================================================================
 * PLATFORM ART (js/platformArt.js)
 * Draws walkable stone platforms of any length from a 3-part strip:
 * a carved left end cap, a seamless middle that repeats, and a right end cap.
 *
 * To build level geometry with art, give a platform an `art` style, e.g.
 *   { id: 'ledge', x1: 300, x2: 520, y: 260, oneWay: true, art: 'temple' }
 * then call platformArt.draw(ctx, plat.x1, plat.x2, plat.y) in the level's
 * render. `y` is where Rakti's feet stand, exactly as for collision.
 * ==========================================================================
 */

export const PLATFORM_STYLES = {
  // Sunken-temple slab with bevelled ends: sandstone top, turquoise-inlaid sun frieze.
  temple: {
    src: 'assets/platforms/temple_platform_v2.png', // 2172 x 233
    surfaceY: 23,      // image row where feet stand (on the top face)
    scale: 0.386,      // image px -> world px (bottom edge lands ~79 px below the feet)
    capLeft: 489,      // image columns [0, 489) = left end cap
    capRight: 1756     // image columns [1756, end) = right end cap; [489, 1756) tiles seamlessly
  },
  // Level 3 jungle slab: moss-topped carved brick with hanging roots (960 x 187, middle is made to tile)
  jungle: {
    src: 'assets/level3/jungle_platform.png',
    surfaceY: 40,
    scale: 0.483,      // ~90 world px thick
    capLeft: 156,
    capRight: 756
  },
  // Previous floor strip (no end caps), kept as a fallback
  temple_v1: {
    src: 'assets/platforms/temple_platform.png',      // 1564 x 219, tiles seamlessly
    surfaceY: 20,
    scale: 0.4
  }
};

export class PlatformArt {
  constructor(style = 'temple') {
    this.style = PLATFORM_STYLES[style];
    this.img = new Image();
    this.img.src = this.style.src;
  }

  get ready() {
    return this.img.complete && this.img.naturalWidth > 0;
  }

  /** The strip pre-shrunk to its on-screen size (rebuilt if the camera zoom changes), so drawing it
   *  every frame is a cheap near 1:1 copy instead of a high-quality downscale of a 2172 px image. */
  scaled(ctx) {
    const a = ctx.getTransform().a || 1;
    const k = Math.max(1, Math.min(4, Math.ceil(a * 4) / 4));
    if (this.cache && this.cacheK === k) return this.cache;
    const im = this.img, f = this.style.scale * k;
    const c = document.createElement('canvas');
    c.width = Math.ceil(im.naturalWidth * f);
    c.height = Math.ceil(im.naturalHeight * f);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, 0, c.width, c.height);
    this.cache = c; this.cacheK = k; this.cacheF = c.width / im.naturalWidth;
    return c;
  }

  /** Fill [x1, x2] so the walking surface sits at world y = surfaceY, with end caps at both ends. */
  draw(ctx, x1, x2, surfaceY) {
    if (!this.ready || x2 <= x1) return;
    const st = this.style, s = st.scale;
    const iw = this.img.naturalWidth, ih = this.img.naturalHeight;
    const im = this.scaled(ctx), f = this.cacheF;   // source rects below are in original px, times f
    const sih = im.height;
    const h = ih * s;
    const top = surfaceY - st.surfaceY * s;
    const w = x2 - x1;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';

    if (st.capLeft === undefined) {
      // plain repeating strip, anchored to world x = 0
      const tileW = iw * s;
      ctx.beginPath();
      ctx.rect(x1, top - 1, w, h + 2);
      ctx.clip();
      for (let x = Math.floor(x1 / tileW) * tileW; x < x2; x += tileW) ctx.drawImage(im, x, top, tileW + 0.5, h);
      ctx.restore();
      return;
    }

    // End caps in world px. The middle repeats a whole number of times (stretched a little to fit),
    // so the last repeat always meets the right cap exactly where the art was cut - no half-drawn motifs.
    let capL = st.capLeft * s, capR = (iw - st.capRight) * s;
    const midW = (st.capRight - st.capLeft) * s;
    let mid = w - capL - capR;
    if (mid < midW * 0.5) {
      // too short for a middle section: the two caps share the width (they join seamlessly in the art too)
      const k = w / (capL + capR);
      capL *= k; capR *= k; mid = 0;
    }
    const L = st.capLeft * f, R = st.capRight * f, W = im.width;
    ctx.drawImage(im, 0, 0, L, sih, x1, top, capL + 0.5, h);
    ctx.drawImage(im, R, 0, W - R, sih, x2 - capR, top, capR, h);
    if (mid > 0) {
      const n = Math.max(1, Math.round(mid / midW));
      const tw = mid / n;
      for (let i = 0; i < n; i++) ctx.drawImage(im, L, 0, R - L, sih, x1 + capL + i * tw, top, tw + 0.5, h);
    }
    ctx.restore();
  }
}
