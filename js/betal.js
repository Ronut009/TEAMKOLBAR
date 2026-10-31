/**
 * ==========================================================================
 * BETAL (js/betal.js)
 * Grey blade demon that patrols a stretch of floor. When Rakti comes close it
 * turns, closes in and swings: a raised-blade wind-up (readable tell), then the
 * cut lands. Hitting him during the wind-up staggers him and cancels the swing.
 * 10 HP = two hits of Rakti's sword (5 damage each).
 * ==========================================================================
 */

export class Betal {
  constructor(x, minX, maxX, y = 368) {
    this.spawn = { x, minX, maxX, y };
    this.minX = minX;
    this.maxX = maxX;
    this.reset();
  }

  reset() {
    Object.assign(this, {
      x: this.spawn.x, y: this.spawn.y,
      hp: 10, maxHp: 10,
      facing: 'left', patrolDir: -1,
      isMoving: false, isAttacking: false,
      attackAnimTimer: 0, attackAnimDuration: 0.7, attackHitAt: 0.38, attackHitDone: false,
      attackCooldown: 0.6, hurtTimer: 0, hitFlash: 0,
      dead: false, deathTimer: 0, fadeAlpha: 1, animTime: 0, removed: false, hidden: false,
      patrolSpeed: 34, chaseSpeed: 72, noticeRange: 190, attackRange: 46, damage: 4
    });
  }

  /** `active` false = he ignores Rakti (e.g. before she has her powers). */
  update(dt, player, level, active = true) {
    // Hidden Betal are neither drawn nor active; once shown they fade in over ~0.4 s before acting.
    if (this.hidden) { this.fadeAlpha = 0; return; }
    this.animTime += dt;
    if (!this.dead && this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 2.5);
      if (this.fadeAlpha < 1) return;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.dead) {
      this.deathTimer += dt;
      if (this.deathTimer > 2.2) this.fadeAlpha = Math.max(0, 1 - (this.deathTimer - 2.2) / 0.8);
      if (this.fadeAlpha <= 0) this.removed = true;
      return;
    }

    const alive = player && !player.isDead && active;
    const dx = alive ? player.x - this.x : 0;
    const closeVertically = alive && Math.abs(player.y - this.y) < 40;

    // 1. Rakti's sword (one hit per swing; must face him)
    if (alive && player.isAttacking && Math.abs(dx) < 58 && closeVertically) {
      const facingHim = dx === 0 || (dx > 0 ? player.facing === 'left' : player.facing !== 'left');
      if (facingHim && player.claimSwingHit(this)) {
        if (this.takeHit(player.swordDamage, player.x, level)) return;
      }
    }

    if (this.hurtTimer > 0) { this.isMoving = false; return; }

    // 2. Swing in progress
    if (this.isAttacking) {
      this.attackAnimTimer += dt;
      if (!this.attackHitDone && this.attackAnimTimer >= this.attackHitAt) {
        this.attackHitDone = true;
        const inFront = this.facing === 'left' ? dx < 8 : dx > -8;
        if (alive && closeVertically && inFront && Math.abs(dx) <= this.attackRange + 14 && player.invulnerableTimer <= 0) {
          player.takeDamage(this.damage, dx < 0 ? -170 : 170, -140);
          if (level) level.cameraShake = Math.max(level.cameraShake || 0, 0.3);
        }
      }
      if (this.attackAnimTimer >= this.attackAnimDuration) {
        this.isAttacking = false;
        this.attackCooldown = 1.0;
      }
      this.isMoving = false;
      return;
    }

    // 3. Chase / attack when Rakti is near, otherwise patrol
    const inSight = alive && closeVertically && Math.abs(dx) < this.noticeRange
      && player.x > this.minX - 60 && player.x < this.maxX + 60;
    if (inSight) {
      this.facing = dx < 0 ? 'left' : 'right';
      if (Math.abs(dx) > this.attackRange) {
        const nx = this.clampX(this.x + Math.sign(dx) * this.chaseSpeed * dt);
        this.isMoving = nx !== this.x;
        this.x = nx;
      } else {
        this.isMoving = false;
        if (this.attackCooldown <= 0) {
          this.isAttacking = true;
          this.attackAnimTimer = 0;
          this.attackHitDone = false;
        }
      }
      return;
    }

    const nx = this.x + this.patrolDir * this.patrolSpeed * dt;
    if (nx <= this.minX || nx >= this.maxX) this.patrolDir *= -1;
    this.x = this.clampX(nx);
    this.facing = this.patrolDir < 0 ? 'left' : 'right';
    this.isMoving = true;
  }

  /** Damage from any source (sword swing, thrown Trishul). Returns true if it killed him. */
  takeHit(damage, fromX, level = null) {
    if (this.dead || this.hidden) return false;
    this.hp -= damage;
    this.hitFlash = 0.18;
    this.hurtTimer = 0.3;
    this.x = this.clampX(this.x + (fromX > this.x ? -10 : 10));
    if (this.isAttacking && this.attackAnimTimer < this.attackHitAt) this.isAttacking = false;  // stagger cancels the swing
    if (level) level.cameraShake = Math.max(level.cameraShake || 0, 0.25);
    if (this.hp <= 0) {
      this.dead = true;
      this.isAttacking = false;
      this.isMoving = false;
      if (level) {
        level.killToastText = '⚔ BETAL SLAIN';
        level.killToastTimer = 1.6;
        level.registerKill?.(this);
      }
      return true;
    }
    return false;
  }

  clampX(x) {
    return Math.max(this.minX, Math.min(this.maxX, x));
  }

  render(ctx, sprites) {
    if (this.removed || this.hidden) return;
    sprites.render(ctx, this);
    if (this.dead || this.hp >= this.maxHp) return;
    // small health bar once he has been hit
    const w = 34, x = Math.round(this.x - w / 2), y = Math.round(this.y - 80);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 14, 0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = this.hitFlash > 0 ? '#fff1bd' : '#b54b55';
    ctx.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), 3);
    ctx.restore();
  }
}
