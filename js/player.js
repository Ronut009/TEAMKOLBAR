/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * Undertale-style pixel avatar, red SOUL heart aura, 4-way walk, & Z-axis leap.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 736, startY = 576) {
    this.x = startX;
    this.y = startY;

    this.vx = 0;
    this.vy = 0;
    this.speed = 195;
    this.acceleration = 1600;
    this.friction = 1400;

    this.width = 24;
    this.height = 34;
    this.colliderWidth = 18;
    this.colliderHeight = 14;
    this.colliderOffsetY = 8;

    this.facing = 'down'; // 'down' | 'up' | 'left' | 'right'
    this.isMoving = false;
    this.animTime = 0;
    this.stepCycle = 0;

    // Simulated Z-Axis Jump
    this.zHeight = 0;
    this.zVelocity = 0;
    this.gravity = 980;
    this.jumpImpulse = 360;
    this.isJumping = false;

    // Retro particles & trail
    this.particles = [];

    // Vitality stats
    this.hp = 20;
    this.maxHp = 20;
  }

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;

    // Freeze player input during dialogue
    if (dialogueActive) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    const inputVec = Input.getMovementVector();
    this.isMoving = (inputVec.x !== 0 || inputVec.y !== 0);

    if (inputVec.y > 0) this.facing = 'down';
    else if (inputVec.y < 0) this.facing = 'up';
    else if (inputVec.x < 0) this.facing = 'left';
    else if (inputVec.x > 0) this.facing = 'right';

    const targetVx = inputVec.x * this.speed;
    const targetVy = inputVec.y * this.speed;

    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);
      this.vy = this.approach(this.vy, targetVy, this.acceleration * dt);
      this.stepCycle += dt * 8.5;
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.vy = this.approach(this.vy, 0, this.friction * dt);
      this.stepCycle = 0;
    }

    // Space to Jump
    if ((Input.isPressed('Space') || Input.isPressed('jump')) && !this.isJumping) {
      this.isJumping = true;
      this.zVelocity = this.jumpImpulse;
      this.spawnPoof(8);
    }

    if (this.isJumping || this.zHeight > 0) {
      this.zVelocity -= this.gravity * dt;
      this.zHeight += this.zVelocity * dt;

      if (this.zHeight <= 0) {
        this.zHeight = 0;
        this.zVelocity = 0;
        this.isJumping = false;
        this.spawnPoof(6);
      }
    }

    this.moveWithCollision(this.vx * dt, this.vy * dt, level);
    this.updateParticles(dt);

    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      this.x = level.width / 2;
      this.y = level.height / 2 + 50;
      this.vx = 0;
      this.vy = 0;
      this.zHeight = 0;
      this.isJumping = false;
      this.spawnPoof(12);
    }
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return target;
  }

  moveWithCollision(dx, dy, level) {
    const halfW = this.colliderWidth / 2;
    const halfH = this.colliderHeight / 2;

    if (dx !== 0) {
      const nextX = this.x + dx;
      if (!level.isColliding(nextX - halfW, this.y + this.colliderOffsetY - halfH, this.colliderWidth, this.colliderHeight)) {
        this.x = nextX;
      } else {
        this.vx = 0;
      }
    }

    if (dy !== 0) {
      const nextY = this.y + dy;
      if (!level.isColliding(this.x - halfW, nextY + this.colliderOffsetY - halfH, this.colliderWidth, this.colliderHeight)) {
        this.y = nextY;
      } else {
        this.vy = 0;
      }
    }

    const margin = 64;
    this.x = Math.max(margin, Math.min(this.x, level.width - margin));
    this.y = Math.max(margin, Math.min(this.y, level.height - margin));
  }

  spawnPoof(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y + 10,
        vx: Math.cos(angle) * 36,
        vy: Math.sin(angle) * 18,
        life: 0.3,
        maxLife: 0.3,
        color: '#ffea79'
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  renderShadow(ctx, camX, camY) {
    const rx = Math.floor(this.x - camX);
    const ry = Math.floor(this.y + 12 - camY);
    const heightFactor = Math.max(0.35, 1.0 - (this.zHeight / 360));

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.48 * heightFactor})`;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 14 * heightFactor, 6 * heightFactor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderParticles(ctx, camX, camY) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y - camY), 2, 2);
    }
    ctx.restore();
  }

  render(ctx, camX, camY) {
    const cx = Math.floor(this.x - camX);
    const cy = Math.floor(this.y - this.zHeight - camY);

    const step = this.isMoving ? Math.sin(this.stepCycle) * 3 : 0;
    const bob = this.isMoving ? Math.abs(Math.sin(this.stepCycle)) * 2 : 0;

    const headY = cy - 22 - bob;
    const torsoY = headY + 10;
    const legY = torsoY + 11;

    ctx.save();

    // Undertale Red SOUL Heart indicator when leaping
    if (this.isJumping) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '11px monospace';
      ctx.fillText('❤', cx - 4, headY - 8);
    }

    // Legs
    ctx.fillStyle = '#1c1b18';
    if (this.facing === 'left' || this.facing === 'right') {
      const flip = this.facing === 'left' ? -1 : 1;
      ctx.fillRect(cx - 3 * flip - step * flip, legY, 5, 7);
      ctx.fillRect(cx + step * flip, legY, 5, 7);
    } else {
      ctx.fillRect(cx - 6, legY + step, 4, 7);
      ctx.fillRect(cx + 2, legY - step, 4, 7);
    }

    // Vestments / Torso (Saffron with gold trim)
    ctx.fillStyle = '#e86a17';
    ctx.fillRect(cx - 7, torsoY, 14, 11);
    ctx.fillStyle = '#f4be41';
    ctx.fillRect(cx - 7, torsoY + 9, 14, 2);

    if (this.facing === 'down') {
      ctx.fillStyle = '#ffea79';
      ctx.fillRect(cx - 6, torsoY + 1, 3, 3);
      ctx.fillRect(cx - 3, torsoY + 4, 3, 3);
      ctx.fillRect(cx, torsoY + 7, 3, 3);
    }

    // Head & Hair
    ctx.fillStyle = '#e8ad82';
    ctx.fillRect(cx - 5, headY, 10, 10);
    ctx.fillStyle = '#18130e';
    ctx.fillRect(cx - 6, headY - 3, 12, 4);

    // Eyes
    ctx.fillStyle = '#000';
    if (this.facing === 'down') {
      ctx.fillRect(cx - 3, headY + 3, 2, 2);
      ctx.fillRect(cx + 2, headY + 3, 2, 2);
    } else if (this.facing === 'left') {
      ctx.fillRect(cx - 4, headY + 3, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(cx + 2, headY + 3, 2, 2);
    }

    ctx.restore();
  }

  toggleDimension() {}
  manipulateObject() {}
}
