/**
 * ==========================================================================
 * GLITCHVERSE - ARCHER & ARROW ENTITY SYSTEM (js/archer.js)
 * Modular Skeleton Archer & Attached Arrow Objects:
 * - Fluid 8-Frame Bow Draw & Arrow Release Animation
 * - Arrow Object attached to Skeleton Archer's bow while aiming/drawing
 * - Arrow flight physics and player collision (damage & knockback)
 * - 4-Frame Skeleton Shattering / Crumbling Death Sequence (+1 Kill)
 * - Dynamic removal and replacement with reinforcement archers
 * ==========================================================================
 */

export class Arrow {
  constructor(x, y, owner = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 340;
    this.life = 2.8;
    this.maxLife = 2.8;
    this.damage = 4;
    this.width = 44;
    this.height = 7;
    this.isAttached = true;
    this.owner = owner;
    this.offsetX = -24;
    this.offsetY = -48;
    this.hasHit = false;
  }

  attachTo(archer, offsetX = -24, offsetY = -48) {
    this.owner = archer;
    this.isAttached = true;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.x = archer.x + offsetX;
    this.y = archer.y + offsetY;
    this.vx = 0;
    this.vy = 0;
  }

  release(speed = 340, dir = -1) {
    this.isAttached = false;
    this.vx = dir * speed;
    this.vy = 0;
    this.life = this.maxLife;
  }

  update(dt, player = null, level = null) {
    if (this.isAttached) {
      if (this.owner) {
        this.x = this.owner.x + this.offsetX;
        this.y = this.owner.y + this.offsetY;
      }
      return true; // Remains active while attached
    }

    // Flight Integration
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Hit Player Check (Deals 4 damage, knockback & camera shake)
    if (!this.hasHit && player) {
      const dist = Math.hypot(player.x - this.x, player.y - (this.y + 10));
      if (dist < 26) {
        if (player.invulnerableTimer <= 0) {
          player.takeDamage(this.damage, (this.vx < 0 ? -240 : 240), -160);
          this.hasHit = true;
          if (level) level.cameraShake = 0.45;
          return false; // Despawn after impact
        }
      }
    }

    // Despawn when life expires or flies offscreen
    if (this.life <= 0 || this.x < -60 || (level && this.x > level.width + 60)) {
      return false;
    }
    return true;
  }

  render(ctx, arrowImg = null) {
    ctx.save();

    if (arrowImg && arrowImg.complete && arrowImg.naturalWidth > 0) {
      // The skeleton arrow points left by default
      ctx.drawImage(arrowImg, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    } else {
      // Fallback procedural bone arrow
      ctx.fillStyle = '#ffeedd';
      ctx.fillRect(this.x - 16, this.y - 2, 32, 4);
      ctx.fillStyle = '#cda24e';
      ctx.beginPath();
      ctx.moveTo(this.x - 18, this.y);
      ctx.lineTo(this.x - 12, this.y - 4);
      ctx.lineTo(this.x - 12, this.y + 4);
      ctx.fill();
    }

    // Flying Arrow Trail & Glow
    if (!this.isAttached) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 200, 80, 0.5)';
      ctx.fillRect(this.x + 8, this.y - 2, 10, 4);
      ctx.restore();
    }

    ctx.restore();
  }
}

export class Archer {
  constructor(x, y, id = 'archer') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.width = 84;
    this.height = 100;

    this.alive = true;
    this.crushed = false;
    this.state = 'idle'; // 'idle', 'pull', 'shoot', 'defeated'
    this.frame = 0;
    this.animTimer = 0;
    this.frameDuration = 0.12;

    this.shootCooldown = 2.4;
    this.cooldownTimer = 1.0;

    // Attached Arrow Object (attached to skeleton's bow hand while drawing)
    this.attachedArrow = new Arrow(this.x - 24, this.y - 48, this);
    // Active released flying arrows
    this.arrows = [];

    // Removal & replacement lifecycle
    this.canBeRemoved = false;
    this.deathTimer = 0;
    this.removalDelay = 1.8;
    this.fadeAlpha = 1.0;
  }

  attachNewArrow() {
    this.attachedArrow = new Arrow(this.x - 24, this.y - 48, this);
    return this.attachedArrow;
  }

  releaseAttachedArrow() {
    if (!this.attachedArrow) return null;
    const released = this.attachedArrow;
    released.release(340, -1);
    this.arrows.push(released);
    this.attachedArrow = null;
    return released;
  }

  die(cause = 'crushed') {
    if (!this.alive) return false;
    this.alive = false;
    this.crushed = (cause === 'crushed');
    this.state = 'defeated';
    this.deathTimer = 0;

    // Drop any attached arrow
    this.attachedArrow = null;
    return true;
  }

  update(dt, player = null, level = null) {
    // 1. Defeated state & removal timer
    if (!this.alive) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.removalDelay) {
        this.canBeRemoved = true;
      }
      this.fadeAlpha = Math.max(0, 1.0 - (this.deathTimer / this.removalDelay) * 0.4);

      // Continue updating arrows already in flight
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        if (!this.arrows[i].update(dt, player, level)) {
          this.arrows.splice(i, 1);
        }
      }
      return;
    }

    // Check player melee attack kill (if player reaches archer and attacks)
    if (player && player.isAttacking) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < 55) {
        this.die('slashed');
        if (level && level.registerKill) {
          level.registerKill(this);
        }
        return;
      }
    }

    // 2. Alive Skeleton Archer State Machine
    this.cooldownTimer -= dt;
    this.animTimer += dt;

    if (this.state === 'idle') {
      if (this.cooldownTimer <= 0.8) {
        this.state = 'pull';
        this.frame = 0;
        this.animTimer = 0;
        if (!this.attachedArrow) {
          this.attachNewArrow();
        }
      }
    } else if (this.state === 'pull') {
      if (this.animTimer >= this.frameDuration) {
        this.animTimer = 0;
        this.frame++;
        if (this.frame >= 4) {
          // Bow fully drawn with attached arrow! Release arrow!
          this.state = 'shoot';
          this.frame = 0;
          this.releaseAttachedArrow();
        }
      }
    } else if (this.state === 'shoot') {
      if (this.animTimer >= this.frameDuration) {
        this.animTimer = 0;
        this.frame++;
        if (this.frame >= 4) {
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.shootCooldown;
        }
      }
    }

    // Keep attached arrow synced with skeleton's bow hand
    if (this.attachedArrow) {
      const pullOffset = this.frame * 2.0;
      this.attachedArrow.attachTo(this, -24 + pullOffset, -48);
    }

    // Update active flying arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      if (!this.arrows[i].update(dt, player, level)) {
        this.arrows.splice(i, 1);
      }
    }
  }

  render(ctx, sprites) {
    ctx.save();
    const ax = this.x;
    const ay = this.y;

    if (!this.alive) {
      // 1. Defeated / Shattering Bones Death Sequence
      ctx.globalAlpha = this.fadeAlpha;
      const dieIdx = Math.min(3, Math.floor((this.deathTimer / this.removalDelay) * 4));
      const dieImg = (sprites.dieFrames && sprites.dieFrames[dieIdx]) || sprites.defeated;
      if (dieImg && dieImg.complete) {
        ctx.drawImage(dieImg, ax - 42, ay - 96, 84, 100);
      }

      // Crumbling dust indicator
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(180, 160, 130, ${0.4 * this.fadeAlpha})`;
      ctx.beginPath();
      ctx.arc(ax, ay - 10, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Render flying arrows that were already shot
      for (const arr of this.arrows) {
        arr.render(ctx, sprites.arrow);
      }
      return;
    }

    // 2. Alive Skeleton Archer Rendering (natively facing left towards player)
    let frameImg = sprites.idle;
    if (this.state === 'idle') {
      const idleFrame = Math.floor(this.animTimer * 5) % 6;
      frameImg = (sprites.idleFrames && sprites.idleFrames[idleFrame]) || sprites.idle;
    } else if (this.state === 'pull' && sprites.pullFrames[this.frame]) {
      frameImg = sprites.pullFrames[this.frame];
    } else if (this.state === 'shoot' && sprites.shootFrames[this.frame]) {
      frameImg = sprites.shootFrames[this.frame];
    }

    if (frameImg && frameImg.complete) {
      ctx.save();
      ctx.drawImage(frameImg, ax - 42, ay - 96, 84, 100);
      ctx.restore();
    }

    // 3. Render Attached Arrow while nocked on bow!
    if (this.attachedArrow) {
      this.attachedArrow.render(ctx, sprites.arrow);
    }

    // 4. Render Active Flying Arrows in the air
    for (const arr of this.arrows) {
      arr.render(ctx, sprites.arrow);
    }

    ctx.restore();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.alive = true;
    this.crushed = false;
    this.state = 'idle';
    this.frame = 0;
    this.animTimer = 0;
    this.cooldownTimer = 1.0;
    this.arrows = [];
    this.attachedArrow = new Arrow(this.x - 24, this.y - 48, this);
    this.canBeRemoved = false;
    this.deathTimer = 0;
    this.fadeAlpha = 1.0;
  }
}
