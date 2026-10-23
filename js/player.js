/**
 * ==========================================================================
 * UNDERWATER RUINS - PLAYER (js/player.js)
 * Side-scrolling platformer physics: gravity, jumping, platform landing.
 * Renders actual MC sprite (mortal) and Divine form (Kali) with X key.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 200, startY = 260) {
    // World position (bottom-center anchor)
    this.x = startX;
    this.y = startY;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // Movement tuning
    this.baseSpeed = 180;
    this.divineSpeed = 240;
    this.speed = this.baseSpeed;
    this.acceleration = 900;
    this.friction = 1200;
    this.jumpForce = 420;
    this.gravity = 860;
    this.maxFallSpeed = 700;

    // Hitbox (width × height, anchored at bottom-center)
    this.hitW = 26;
    this.hitH = 52;

    // Ground & jump state
    this.onGround = false;
    this.wasOnGround = false;
    this.coyoteTime = 0;
    this.coyoteMax = 0.1; // 100ms grace for edge jumps
    this.jumpBufferTime = 0;
    this.jumpBufferMax = 0.1;

    // Facing direction ('left' | 'right')
    this.facing = 'right';

    // Animation
    this.animTime = 0;
    this.stepCycle = 0;
    this.isMoving = false;

    // Divine Transformation State (6 seconds)
    this.isDivine = false;
    this.divineDuration = 6.0;
    this.divineTimer = 0.0;
    this.divinePulse = 0.0;

    // Sprite loading (mortal + divine)
    this.mortalLoaded = false;
    this.imgMortal = new Image();
    this.imgMortal.onload = () => { this.mortalLoaded = true; };
    this.imgMortal.src = 'assets/mc_mortal.png';
    if (this.imgMortal.complete && this.imgMortal.naturalWidth > 0) this.mortalLoaded = true;

    this.divineLoaded = false;
    this.imgDivine = new Image();
    this.imgDivine.onload = () => { this.divineLoaded = true; };
    this.imgDivine.src = 'assets/mc_divine.png';
    if (this.imgDivine.complete && this.imgDivine.naturalWidth > 0) this.divineLoaded = true;

    // Particles
    this.particles = [];

    // Stats
    this.hp = 20;
    this.maxHp = 20;
  }

  // ── DIVINE FORM ─────────────────────────────────────────────────────────────

  triggerDivineTransformation() {
    this.isDivine = true;
    this.divineTimer = this.divineDuration;
    this.speed = this.divineSpeed;

    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 220);
    }

    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const sp = 80 + Math.random() * 90;
      this.particles.push({
        x: this.x, y: this.y - this.hitH * 0.5,
        vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp,
        life: 0.6, maxLife: 0.6,
        size: 3 + Math.random() * 2,
        color: i % 2 === 0 ? '#ffd700' : '#ff0055'
      });
    }
  }

  revertToMortal() {
    this.isDivine = false;
    this.divineTimer = 0;
    this.speed = this.baseSpeed;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: this.x, y: this.y - this.hitH * 0.5,
        vx: Math.cos(angle) * 45, vy: Math.sin(angle) * 45,
        life: 0.4, maxLife: 0.4, size: 2, color: '#ffea79'
      });
    }
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;
    this.divinePulse += dt * 4.0;

    // Freeze during dialogue
    if (dialogueActive) {
      this.vx = 0;
      this.updateParticles(dt);
      return;
    }

    // 1. Divine trigger (X key)
    if (Input.isPressed('KeyX') || Input.isPressed('x')) {
      if (!this.isDivine) this.triggerDivineTransformation();
    }

    // 2. Divine timer
    if (this.isDivine) {
      this.divineTimer -= dt;

      // Emit continuous divine particles
      if (Math.random() < 0.75) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 28,
          y: this.y - this.hitH * 0.6 + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 28,
          vy: -18 - Math.random() * 40,
          life: 0.4, maxLife: 0.4,
          size: 2 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#ffd700' : '#ff0055'
        });
      }

      if (this.divineTimer <= 0) this.revertToMortal();
    }

    // 3. Horizontal movement
    const leftDown  = Input.isDown('left');
    const rightDown = Input.isDown('right');
    this.isMoving = leftDown || rightDown;

    if (rightDown) {
      this.facing = 'right';
      this.vx = this.approach(this.vx, this.speed, this.acceleration * dt);
      this.stepCycle += dt * 8.5;
    } else if (leftDown) {
      this.facing = 'left';
      this.vx = this.approach(this.vx, -this.speed, this.acceleration * dt);
      this.stepCycle += dt * 8.5;
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.stepCycle = 0;
    }

    // 4. Coyote time & jump buffer
    this.wasOnGround = this.onGround;
    if (this.onGround) this.coyoteTime = this.coyoteMax;
    else this.coyoteTime = Math.max(0, this.coyoteTime - dt);

    if (Input.isPressed('Space') || Input.isPressed('jump') || Input.isPressed('KeyW') || Input.isPressed('ArrowUp')) {
      this.jumpBufferTime = this.jumpBufferMax;
    } else {
      this.jumpBufferTime = Math.max(0, this.jumpBufferTime - dt);
    }

    if (this.jumpBufferTime > 0 && this.coyoteTime > 0) {
      this.vy = -this.jumpForce;
      this.coyoteTime = 0;
      this.jumpBufferTime = 0;
      this.onGround = false;
      this.spawnPoof(8);
    }

    // 5. Gravity
    if (!this.onGround) {
      this.vy = Math.min(this.maxFallSpeed, this.vy + this.gravity * dt);
    }

    // 6. Move & resolve collisions
    this.moveAndCollide(dt, level);

    // 7. World boundaries
    this.x = Math.max(this.hitW / 2, Math.min(this.x, level.width - this.hitW / 2));
    if (this.y > level.height + 200) {
      // Fell off world — respawn on left platform
      this.x = 200;
      this.y = 280;
      this.vx = 0;
      this.vy = 0;
    }

    // 8. Particles
    this.updateParticles(dt);

    // 9. Reset key
    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      this.x = 200;
      this.y = 280;
      this.vx = 0;
      this.vy = 0;
      this.spawnPoof(12);
    }
  }

  moveAndCollide(dt, level) {
    // Move X then resolve, then move Y then resolve (split-axis)
    const hw = this.hitW / 2;

    // X axis
    this.x += this.vx * dt;
    if (level.isSolidAt(this.x - hw, this.y - this.hitH, this.hitW, this.hitH)) {
      // Push out of wall — step back
      const stepX = this.vx > 0 ? -1 : 1;
      while (level.isSolidAt(this.x - hw, this.y - this.hitH, this.hitW, this.hitH)) {
        this.x += stepX;
      }
      this.vx = 0;
    }

    // Y axis
    this.y += this.vy * dt;
    this.onGround = false;

    if (this.vy >= 0) {
      // Falling — check floor
      if (level.isSolidAt(this.x - hw, this.y - 2, this.hitW, 4)) {
        // Snap to top of collider
        for (const col of level.colliders) {
          if (this.x - hw < col.x + col.w && this.x + hw > col.x &&
              this.y > col.y && this.y - this.vy * dt < col.y + col.h) {
            this.y = col.y;
            break;
          }
        }
        this.vy = 0;
        this.onGround = true;
      }
    } else {
      // Rising — check ceiling
      if (level.isSolidAt(this.x - hw, this.y - this.hitH, this.hitW, 4)) {
        for (const col of level.colliders) {
          if (this.x - hw < col.x + col.w && this.x + hw > col.x &&
              this.y - this.hitH < col.y + col.h && this.y - this.hitH > col.y) {
            this.y = col.y + col.h + this.hitH;
            break;
          }
        }
        this.vy = Math.max(0, this.vy);
      }
    }
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return curr;
  }

  spawnPoof(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.particles.push({
        x: this.x, y: this.y,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 20,
        life: 0.3, maxLife: 0.3,
        size: 2,
        color: this.isDivine ? '#ffd700' : '#aaddff'
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt; // slight gravity on particles
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────────────────

  renderShadow(ctx, camX, camY) {
    const rx = Math.floor(this.x - camX);
    const ry = Math.floor(this.y - camY);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    const sw = this.isDivine ? 24 : 18;
    ctx.ellipse(rx, ry, sw, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderParticles(ctx, camX, camY) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      const s = p.size || 2;
      ctx.fillRect(Math.floor(p.x - camX - s/2), Math.floor(p.y - camY - s/2), s, s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  render(ctx, camX, camY) {
    // Screen coords — player y is ground contact point
    const cx = Math.floor(this.x - camX);
    const cy = Math.floor(this.y - camY); // bottom of sprite

    const bob = this.isMoving && this.onGround ? Math.abs(Math.sin(this.stepCycle)) * 3 : 0;
    const flipX = (this.facing === 'left');

    ctx.save();

    // 1. Divine aura halo
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - this.hitH * 0.55 - bob);
    }

    // 2. Jump indicator (Undertale red SOUL)
    if (!this.onGround) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ff0000';
      ctx.fillText('❤', cx - 5, cy - this.hitH - 10 - bob);
    }

    // 3. Sprite
    ctx.save();
    ctx.translate(cx, cy);
    if (flipX) ctx.scale(-1, 1);

    const mortalReady = this.mortalLoaded || (this.imgMortal.complete && this.imgMortal.naturalWidth > 0);
    const divineReady = this.divineLoaded || (this.imgDivine.complete && this.imgDivine.naturalWidth > 0);

    if (this.isDivine && divineReady) {
      // Divine Kali form — native 161x182, render at 56×63
      const rw = 56, rh = 63;
      ctx.drawImage(this.imgDivine, -rw / 2, -rh - bob, rw, rh);
    } else if (mortalReady) {
      // Mortal warrior — native 176x192, render at 48×52
      const rw = 48, rh = 52;
      ctx.drawImage(this.imgMortal, -rw / 2, -rh - bob, rw, rh);
    } else {
      this.drawFallbackAvatar(ctx, 0, -this.hitH - bob);
    }

    ctx.restore();
    ctx.restore();
  }

  drawDivineAura(ctx, x, y) {
    ctx.save();
    const pulse = Math.sin(this.divinePulse) * 4;
    const radius = 28 + pulse;

    const bloom = ctx.createRadialGradient(x, y, 4, x, y, radius + 16);
    bloom.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
    bloom.addColorStop(0.5, 'rgba(56, 225, 255, 0.22)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, radius + 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const rot = this.animTime * 1.5;
    ctx.strokeStyle = '#ffea79';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + rot;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (radius - 2), y + Math.sin(angle) * (radius - 2));
      ctx.lineTo(x + Math.cos(angle) * (radius + 7), y + Math.sin(angle) * (radius + 7));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFallbackAvatar(ctx, x, y) {
    ctx.fillStyle = '#e86a17';
    ctx.fillRect(x - 8, y + 12, 16, 18);
    ctx.fillStyle = '#e8ad82';
    ctx.fillRect(x - 6, y, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 3, y + 4, 2, 2);
    ctx.fillRect(x + 1, y + 4, 2, 2);
  }

  toggleDimension() {}
  manipulateObject() {}
}
