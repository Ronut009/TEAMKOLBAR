/**
 * ==========================================================================
 * PLATFORM ART (js/render/platformArt.js)
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
    src: 'assets/platforms/temple_platform_v2.webp', // 2172 x 233
    surfaceY: 23,      // image row where feet stand (on the top face)
    scale: 0.386,      // image px -> world px (bottom edge lands ~79 px below the feet)
    capLeft: 489,      // image columns [0, 489) = left end cap
    capRight: 1756     // image columns [1756, end) = right end cap; [489, 1756) tiles seamlessly
  },
  // Level 2 desert slab: sandstone top, mudbrick frieze with turquoise inlays (1085 x 184; built from the
  // source strip as left cap | one 543 px module that tiles | right cap)
  desert: {
    src: 'assets/level2/sprites/mudbrick_platform.webp',
    surfaceY: 20,
    scale: 0.48,       // ~79 world px thick, like the temple slab
    capLeft: 345,
    capRight: 752
  },
  // Level 3 jungle slab: moss-topped carved brick with hanging roots (960 x 187, middle is made to tile)
  // Level 3 jungle slab v2: mossy carved brick with roots and glowing flowers (809 x 125: left cap | 272 px
  // module that tiles | right cap). The previous strip is assets/level3/jungle_platform.webp.
  jungle: {
    src: 'assets/level3/backup/jungle_platform_v2.webp',
    surfaceY: 30,
    scale: 0.75,       // ~70 world px below the walking surface
    capLeft: 311,
    capRight: 583
  },
  // Level 3 floor v3: a flat-ended slab of carved brick, roots and ferns under a grassy path (745 x 340: left cap |
  // 401 px module that tiles | right cap). Like the other levels' floors, the repeating middle is ~200 world px, so
  // Level 3's 400-560 px floors hold one or two whole repeats instead of one long one squeezed to fit. Deep enough
  // to run past the bottom of the view. (The long 1768 px cut and v2's 'jungle' slab are in assets/level3/backup.)
  jungleSlab: {
    src: 'assets/level3/backup/jungle_floor_slab.webp',
    surfaceY: 79,      // the middle of the grassy path
    scale: 0.5,        // ~130 world px below the walking surface
    capLeft: 207,
    capRight: 608
  },
  // Level 3 floor v4: a deep mossy stone ledge with a carved-brick path on top, from three pieces (a left end, a
  // middle that repeats, a right end; 1511 x 383). Its rocky underside reaches ~110 world px below the walking
  // surface, past the bottom of the view, so no background shows under a floor. noStretch: the middle repeats at
  // its true size (never squeezed or stretched to fit) and the right end overlaps the last repeat with a feathered
  // edge of `feather` image px.
  jungleLedgeFloor: {
    src: 'assets/level3/jungle_floor_v4.webp',
    surfaceY: 83,      // the middle of the path's top face
    scale: 0.5,
    capLeft: 529,
    capRight: 1026,
    noStretch: true,
    feather: 54
  },
  grass: {
    src: 'assets/endless/floor_grass.webp',
    surfaceY: 80,
    scale: 0.5945,
    capLeft: 773,
    capRight: 1387
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

  /** The right end cap cut from the scaled strip `im` at column R, its first `fpx` columns fading in (cached). */
  featheredRight(im, R, fpx) {
    if (this.rightCap && this.rightCapSrc === im) return this.rightCap;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(im.width - R)); c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, R, 0, c.width, c.height, 0, 0, c.width, c.height);
    if (fpx > 0) {
      // one fill over the whole cap (destination-in clears whatever a fill does not cover)
      const grad = g.createLinearGradient(0, 0, c.width, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(Math.min(1, fpx / c.width), 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
    }
    this.rightCap = c; this.rightCapSrc = im;
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
    if (st.noStretch) {
      // the middle at its true size, cut off under the right end, which is drawn over it with a soft left edge
      const midW = (st.capRight - st.capLeft) * s, fw = (st.feather || 0) * s;
      ctx.drawImage(im, 0, 0, L, sih, x1, top, capL + 0.5, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x1 + capL - 0.5, top - 1, Math.max(0, w - capL - capR + fw + 1), h + 2);
      ctx.clip();
      for (let x = x1 + capL; x < x2 - capR + fw; x += midW) ctx.drawImage(im, L, 0, R - L, sih, x, top, midW + 0.5, h);
      ctx.restore();
      ctx.drawImage(this.featheredRight(im, R, (st.feather || 0) * f), x2 - capR, top, capR, h);
      ctx.restore();
      return;
    }
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
