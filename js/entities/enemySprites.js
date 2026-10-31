/**
 * ==========================================================================
 * ENEMY SPRITES (js/entities/enemySprites.js)
 * Draws Betal, the grey-skinned blade demon (assets/anims/betal/*.png).
 * Any enemy object with { x, y, facing, isMoving, isAttacking/attacking,
 * attackAnimTimer, attackAnimDuration, hurtTimer, dead, deathTimer, animTime,
 * hitFlash } can be rendered with EnemySpriteSheet.render(ctx, enemy).
 * (Betal replaced the earlier grey ghoul sheet, sentinel_enemy_sheet.jpeg.)
 * ==========================================================================
 */

// Frame canvases: (anchorX, anchorY) is the point between his feet. Frames are ~120 px tall.
const BETAL_FRAMES = {
  walk:   { count: 6, frameW: 135, frameH: 125, anchorX: 56, anchorY: 123 },
  attack: { count: 6, frameW: 170, frameH: 137, anchorX: 74, anchorY: 135 },
  hurt:   { count: 2, frameW: 116, frameH: 111, anchorX: 52, anchorY: 109 },
  death:  { count: 4, frameW: 131, frameH: 81,  anchorX: 47, anchorY: 79 }
};
const BETAL_SCALE = 0.58;   // ~70 world px tall, a little taller than Rakti

export class EnemySpriteSheet {
  constructor() {
    this.frames = {};
    for (const [name, m] of Object.entries(BETAL_FRAMES)) {
      this.frames[name] = Array.from({ length: m.count }, (_, i) => {
        const img = new Image();
        img.src = `assets/anims/betal/${name}_${i}.png`;
        return img;
      });
    }
  }

  get loaded() {
    return this.frames.walk[0].complete && this.frames.walk[0].naturalWidth > 0;
  }

  /** `height` (optional) scales him relative to the default 82 used by older levels. */
  render(ctx, enemy, { height = 82 } = {}) {
    if (!this.loaded) return false;
    let set, index;
    if (enemy.dead) {
      set = 'death';
      index = enemy.deathTimer === undefined ? 3 : Math.min(3, Math.floor(enemy.deathTimer / 0.13));
    } else if ((enemy.hurtTimer || 0) > 0) {
      set = 'hurt';
      index = enemy.hurtTimer > 0.15 ? 0 : 1;
    } else if (enemy.attacking || enemy.isAttacking) {
      const progress = Math.min(0.999, (enemy.attackAnimTimer || 0) / (enemy.attackAnimDuration || 0.72));
      set = 'attack';
      index = Math.floor(progress * 6);
    } else {
      set = 'walk';
      index = enemy.isMoving ? Math.floor((enemy.animTime || 0) * 9) % 6 : 0;
    }
    const img = this.frames[set][index];
    if (!img || !img.complete || img.naturalWidth === 0) return false;
    const m = BETAL_FRAMES[set];
    const s = BETAL_SCALE * (height / 82);

    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
    if (enemy.facing === 'left') ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if ((enemy.hitFlash || 0) > 0) ctx.filter = 'brightness(1.9) saturate(0.6)';
    if (enemy.fadeAlpha !== undefined) ctx.globalAlpha = enemy.fadeAlpha;
    ctx.drawImage(img, -m.anchorX * s, -m.anchorY * s, m.frameW * s, m.frameH * s);
    ctx.restore();
    return true;
  }
}
