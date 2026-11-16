/**
 * ==========================================================================
 * BETAL (js/entities/betal.js)
 * Grey blade demon that patrols a stretch of floor. When Rakti comes close it
 * turns, closes in and swings: a raised-blade wind-up (readable tell), then the
 * cut lands. Hitting him during the wind-up staggers him and cancels the swing.
 * Health from Run.betalHp: 15 on Levels 1-2 and 20 on Level 3 (Hard / Hardcore 20 and 30).
 * ==========================================================================
 */

import { Sfx } from '../core/audio.js';
import { Run } from '../core/run.js';

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
      hp: Run.betalHp, maxHp: Run.betalHp,   // by level and difficulty (run.js)
      facing: 'left', patrolDir: -1,
      isMoving: false, isAttacking: false,
      attackAnimTimer: 0, attackAnimDuration: 0.7, attackHitAt: 0.38, attackHitDone: false,
      attackCooldown: 0.6, hurtTimer: 0, hitFlash: 0,
      dead: false, deathTimer: 0, fadeAlpha: 1, animTime: 0, removed: false, hidden: false,
      patrolSpeed: 34, chaseSpeed: 72, noticeRange: 330, attackRange: 46, damage: 4,   // (notices her from 1.75x further than before: 190 -> 330)
      aggro: false, aggroLock: 0, calm: 0
    });
  }

  /** After Rakti respawns at a checkpoint at x = spawnX, heading `dir` (+1 east, -1 west on a way back): a Betal
   *  behind her is gone for good, one ahead stays at his post. One posted close to where she appears waits at the
   *  far end of his beat and needs a moment (calm) before he notices her, so a respawn is never an ambush. */
  settleAfterRespawn(spawnX, dir = 1) {
    if (this.dead || this.removed) return;
    const ahead = dir > 0 ? this.spawn.x > spawnX : this.spawn.x < spawnX;
    if (!ahead) { this.dead = true; this.removed = true; return; }
    if (!this.hidden && Math.abs(this.x - spawnX) < 300) {
      this.x = dir > 0 ? this.maxX : this.minX;
      this.facing = dir > 0 ? 'right' : 'left';
      this.patrolDir = dir > 0 ? 1 : -1;
      this.calm = 1.5;
    }
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
    this.aggroLock = Math.max(0, this.aggroLock - dt);
    this.calm = Math.max(0, this.calm - dt);

    if (this.dead) {
      this.deathTimer += dt;
      if (this.deathTimer > 2.2) this.fadeAlpha = Math.max(0, 1 - (this.deathTimer - 2.2) / 0.8);
      if (this.fadeAlpha <= 0) this.removed = true;
      return;
    }

    if (this.knockV) {   // sliding back from the super blow, slowing down (kept inside his patrol bounds)
      this.x = this.clampX(this.x + this.knockV * dt);
      this.knockV *= Math.exp(-9 * dt);
      if (Math.abs(this.knockV) < 12) this.knockV = 0;
    }
    const alive = player && !player.isDead && active;
    const dx = alive ? player.x - this.x : 0;
    const closeVertically = alive && Math.abs(player.y - this.y) < 40;

    // 1. Rakti's sword (one hit per swing; must face him)
    if (alive && player.isAttacking && Math.abs(dx) < 58 && closeVertically) {
      const facingHim = dx === 0 || (dx > 0 ? player.facing === 'left' : player.facing !== 'left');
      if (facingHim && player.claimSwingHit(this)) {
        const knock = player.swingKnockback;
        if (this.takeHit(player.swingDamage ?? player.swordDamage, player.x, level)) return;
        if (knock) {   // Rakti's super blow: he is thrown back and staggered
          this.knockV = (player.x > this.x ? -1 : 1) * 520;
          this.hurtTimer = Math.max(this.hurtTimer, 0.55);
          if (level) level.cameraShake = Math.max(level.cameraShake || 0, 0.4);
        }
      }
    }

    if (this.hurtTimer > 0) { this.isMoving = false; return; }

    // 2. Swing in progress
    if (this.isAttacking) {
      this.attackAnimTimer += dt;
      if (!this.attackHitDone && this.attackAnimTimer >= this.attackHitAt) {
        this.attackHitDone = true;
        Sfx.play('mob_swing');
        const inFront = this.facing === 'left' ? dx < 8 : dx > -8;
        if (alive && closeVertically && inFront && Math.abs(dx) <= this.attackRange + 14 && player.invulnerableTimer <= 0) {
          player.takeDamage(this.damage, dx < 0 ? -170 : 170, -140);
          if (level) level.cameraShake = Math.max(level.cameraShake || 0, 0.3);
        }
      }
      if (this.attackAnimTimer >= this.attackAnimDuration) {
        this.isAttacking = false;
        this.attackCooldown = this.rushCooldown ?? 1.0;   // (Level 2's quickened desert: shorter rests between swings)
      }
      this.isMoving = false;
      return;
    }

    // 3. Notice Rakti -> aggro: he locks on (a short roar), then chases her down to attack. He keeps hunting her
    // beyond the distance he first noticed her at (the leash) and gives up only when she gets clear away.
    const inBounds = alive && player.x > this.minX - 160 && player.x < this.maxX + 160;   // she can be seen a little past his beat
    const inSight = inBounds && closeVertically && Math.abs(dx) < this.noticeRange && this.calm <= 0;
    const leashed = inBounds && Math.abs(player.y - this.y) < 140 && Math.abs(dx) < this.noticeRange * 1.6;
    if (!this.aggro && inSight) this.startAggro(player.x);
    else if (this.aggro && !leashed) this.aggro = false;
    if (this.aggro) {
      this.facing = dx < 0 ? 'left' : 'right';
      if (this.aggroLock > 0) { this.isMoving = false; return; }   // locking on
      if (Math.abs(dx) > this.attackRange) {
        const nx = this.clampX(this.x + Math.sign(dx) * this.chaseSpeed * dt);
        this.isMoving = nx !== this.x;
        this.x = nx;
        if (this.isMoving) Sfx.hold('mob_growl', Math.max(0.35, 1 - Math.abs(dx) / (this.noticeRange * 1.6)));   // one shared growl however many chase
      } else {
        this.isMoving = false;
        if (this.attackCooldown <= 0 && closeVertically) {
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

  /** He notices Rakti: faces her, roars and holds still for a beat, then the chase begins. */
  startAggro(targetX) {
    this.aggro = true;
    this.aggroLock = 0.35;
    this.facing = targetX < this.x ? 'left' : 'right';
    Sfx.play('mob_aggro');
  }

  /** Damage from any source (sword swing, thrown Trishul). Returns true if it killed him. */
  takeHit(damage, fromX, level = null) {
    if (this.dead || this.hidden) return false;
    Sfx.play('hit');
    if (!this.aggro && this.hp > damage) this.startAggro(fromX);   // struck from out of sight: he turns on her
    this.hp -= damage;
    this.hitFlash = 0.18;
    this.hurtTimer = 0.3;
    this.x = this.clampX(this.x + (fromX > this.x ? -10 : 10));
    if (this.isAttacking && this.attackAnimTimer < this.attackHitAt) this.isAttacking = false;  // stagger cancels the swing
    if (level) level.cameraShake = Math.max(level.cameraShake || 0, 0.25);
    if (this.hp <= 0) {
      this.dead = true;
      this.aggro = false;
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
