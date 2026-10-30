/**
 * ==========================================================================
 * PLATFORM ART (js/platformArt.js)
 * Draws walkable stone platforms from a seamless, horizontally tiling strip.
 *
 * To build level geometry with art, give a platform an `art` style, e.g.
 *   { id: 'ledge', x1: 300, x2: 520, y: 260, oneWay: true, art: 'temple' }
 * then call platformArt.draw(ctx, plat.x1, plat.x2, plat.y) in the level's
 * render. `y` is where Rakti's feet stand, exactly as for collision.
 * ==========================================================================
 */

export const PLATFORM_STYLES = {
  // Sunken-temple floor: cracked top slab, glyph band, sun-medallion frieze.
  temple: {
    src: 'assets/platforms/temple_platform.png', // 1564 x 219, tiles seamlessly left-right
    surfaceY: 20,  // image row where feet stand (middle of the top slab)
    scale: 0.4     // image pixels -> world pixels (tile = 626 x 88 world px)
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

  /** Fill [x1, x2] with the strip so its walking surface sits at world y = surfaceY. */
  draw(ctx, x1, x2, surfaceY) {
    if (!this.ready || x2 <= x1) return;
    const s = this.style.scale;
    const tileW = this.img.naturalWidth * s;
    const tileH = this.img.naturalHeight * s;
    const top = surfaceY - this.style.surfaceY * s;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x1, top - 1, x2 - x1, tileH + 2);
    ctx.clip();
    // Tiles are anchored to world x = 0 so separate platforms share the same pattern phase.
    for (let x = Math.floor(x1 / tileW) * tileW; x < x2; x += tileW) {
      ctx.drawImage(this.img, x, top, tileW + 0.5, tileH);
    }
    ctx.restore();
  }
}
