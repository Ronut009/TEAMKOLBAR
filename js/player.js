/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * Full Sprite Animation Engine (Run, Jump, 6-Frame Attack Combo on Left Click),
 * Authentic Pit Falling Physics, Divine Form, & Zero Floating.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 160, startY = 368) {
    this.x = startX;
    this.y = startY; // Exact foot anchor point on platform surface

    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 195;
    this.divineSpeed = 260;
    this.speed = this.baseSpeed;
    this.acceleration = 1700;
    this.friction = 1400;

    // Platformer Jump Physics
    this.gravity = 920;
    this.jumpImpulse = -430;
    this.divineJumpImpulse = -540;
    this.isGrounded = true;
    this.currentPlatform = null;
    this.dropThroughTimer = 0;

    // Sprite Display Dimensions (Synchronized with temple scale)
    this.spriteWidth = 50;
    this.spriteHeight = 54;
    this.divineWidth = 56;
    this.divineHeight = 62;

    this.facing = 'right'; // 'left' | 'right'
    this.isMoving = false;
    this.animTime = 0;

    // Combat & Attack Combo State (Left Click)
    this.isAttacking = false;
    this.attackFrame = 0;
    this.attackTimer = 0;
    this.attackFrameDuration = 0.065; // ~65ms per frame = ~0.39s total slash
    this.slashes = []; // Sword slash crescent trails

    // Run & Jump Animation State
    this.runFrame = 0;
    this.runTimer = 0;
    this.runFrameDuration = 0.085; // ~85ms per run frame

    // Divine Transformation State (6-Second Duration)
    this.isDivine = false;
    this.divineDuration = 6.0;
    this.divineTimer = 0.0;
    this.divinePulse = 0.0;

    // Preload Animation Sprite Frames
    this.loadAnimations();

    // Visual particles
    this.particles = [];

    // Vitality stats
    this.hp = 20;
    this.maxHp = 20;
  }

  loadAnimations() {
    this.anims = {
      idle: new Image(),
      run: [],
      attack: [],
      jump: [],
      divine: new Image()
    };

    // Idle
    this.anims.idle.src = 'assets/anims/idle.png';

    // Run (6 frames)
    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/run_${i}.png`;
      this.anims.run.push(img);
    }

    // Attack (6 frames)
    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/attack_${i}.png`;
      this.anims.attack.push(img);
    }

    // Jump (6 frames)
    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/jump_${i}.png`;
      this.anims.jump.push(img);
    }

    // Divine Form
    this.anims.divine.src = 'assets/mc_divine.png';
  }

  triggerAttack() {
    if (this.isAttacking) {
      // Chain or re-trigger combo
      this.attackFrame = 0;
      this.attackTimer = 0;
    } else {
      this.isAttacking = true;
      this.attackFrame = 0;
      this.attackTimer = 0;
    }

    // Spawn dynamic sword slash wave in front of player
    const slashDir = (this.facing === 'left') ? -1 : 1;
    this.slashes.push({
      x: this.x + slashDir * 24,
      y: this.y - 24,
      dir: slashDir,
      life: 0.22,
      maxLife: 0.22,
      isDivine: this.isDivine
    });

    // Sword sparks
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.x + slashDir * 20,
        y: this.y - 20 + (Math.random() - 0.5) * 16,
        vx: slashDir * (50 + Math.random() * 60),
        vy: (Math.random() - 0.5) * 40,
        life: 0.25,
        maxLife: 0.25,
        size: 2,
        color: this.isDivine ? '#ffd700' : '#ffffff'
      });
    }
  }

  triggerDivineTransformation() {
    this.isDivine = true;
    this.divineTimer = this.divineDuration;
    this.speed = this.divineSpeed;

    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 250);
    }

    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 70 + Math.random() * 80;
      this.particles.push({
        x: this.x,
        y: this.y - 25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55 + Math.random() * 0.25,
        maxLife: 0.8,
        size: 3 + Math.random() * 2,
        color: i % 2 === 0 ? '#ffd700' : '#ff0055'
      });
    }
  }

  revertToMortal() {
    this.isDivine = false;
    this.divineTimer = 0.0;
    this.speed = this.baseSpeed;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 25,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        life: 0.4,
        maxLife: 0.4,
        size: 2,
        color: '#ffea79'
      });
    }
  }

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;
    this.divinePulse += dt * 4.0;

    if (this.dropThroughTimer > 0) {
      this.dropThroughTimer -= dt;
    }

    // Freeze during dialogue
    if (dialogueActive) {
      this.vx = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    // 1. Attack Trigger on Left Click (or Z / J)
    if (Input.isPressed('attack')) {
      this.triggerAttack();
    }

    // Advance Attack Animation
    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackFrameDuration) {
        this.attackTimer = 0;
        this.attackFrame++;
        if (this.attackFrame >= 6) {
          this.isAttacking = false;
          this.attackFrame = 0;
        }
      }
    }

    // 2. Divine Transformation (Key X)
    if (Input.isPressed('KeyX') || Input.isPressed('x')) {
      if (!this.isDivine) {
        this.triggerDivineTransformation();
      }
    }

    if (this.isDivine) {
      this.divineTimer -= dt;

      if (Math.random() < 0.75) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 26,
          y: this.y - 20 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 20,
          vy: -15 - Math.random() * 35,
          life: 0.45,
          maxLife: 0.45,
          size: 2 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#ffd700' : '#ff0055'
        });
      }

      if (this.divineTimer <= 0) {
        this.revertToMortal();
      }
    }

    // 3. Horizontal Movement (A / D, Left / Right)
    let moveDir = 0;
    if (Input.isDown('left') || Input.isDown('KeyA') || Input.isDown('ArrowLeft')) moveDir -= 1;
    if (Input.isDown('right') || Input.isDown('KeyD') || Input.isDown('ArrowRight')) moveDir += 1;

    this.isMoving = (moveDir !== 0);
    if (moveDir < 0) this.facing = 'left';
    else if (moveDir > 0) this.facing = 'right';

    const targetVx = moveDir * this.speed;
    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);

      // Cycle run frames
      this.runTimer += dt;
      if (this.runTimer >= this.runFrameDuration) {
        this.runTimer = 0;
        this.runFrame = (this.runFrame + 1) % 6;
      }
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.runFrame = 0;
      this.runTimer = 0;
    }

    // 4. Jump & Drop-Through Physics
    const jumpPressed = Input.isPressed('jump') || Input.isPressed('Space') || Input.isPressed('KeyW') || Input.isPressed('ArrowUp');
    const isDownHeld = Input.isDown('down') || Input.isDown('KeyS') || Input.isDown('ArrowDown');

    if (jumpPressed && this.isGrounded) {
      if (isDownHeld && this.currentPlatform && this.currentPlatform.oneWay) {
        // Drop down through current one-way platform
        this.dropThroughTimer = 0.28;
        this.isGrounded = false;
        this.currentPlatform = null;
        this.vy = 80;
      } else {
        const impulse = this.isDivine ? this.divineJumpImpulse : this.jumpImpulse;
        this.vy = impulse;
        this.isGrounded = false;
        this.currentPlatform = null;
        this.spawnPoof(8);
      }
    }

    // 5. Apply Gravity
    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
    }

    // 6. Platform Collision & Integration
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Hard map horizontal boundaries
    this.x = Math.max(16, Math.min(this.x, level.width - 16));

    // Check platform landing when falling
    if (this.vy >= 0) {
      const dropping = (this.dropThroughTimer > 0);
      const landed = level.checkPlatformLanding(prevY, this.y, this.x, dropping);

      if (landed) {
        // Firmly plant feet on platform surface
        this.y = landed.y;
        this.vy = 0;
        this.isGrounded = true;
        this.currentPlatform = landed;
      } else if (this.isGrounded) {
        // Stepped off ledge into empty air / pit!
        if (!level.isOnPlatform(this.x, this.y)) {
          this.isGrounded = false;
          this.currentPlatform = null;
        }
      }
    }

    // 7. Open Chasm Pit Fall & Respawn
    // When falling past the bottom of the sunken ruins (y > 434)
    if (this.y > 434) {
      this.respawnFromPit();
    }

    // 8. Reset Key (R)
    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      this.x = 180;
      this.y = 368;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;
      this.spawnPoof(12);
    }

    this.updateParticles(dt);
    this.updateSlashes(dt);
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return target;
  }

  respawnFromPit() {
    this.x = 180;
    this.y = 368;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.currentPlatform = null;

    // Ethereal aqua lotus splash
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 40 + Math.random() * 50;
      this.particles.push({
        x: this.x,
        y: this.y - 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 3,
        color: '#4eedff'
      });
    }
  }

  spawnPoof(count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 2,
        vx: Math.cos(angle) * 36,
        vy: Math.sin(angle) * 16,
        life: 0.3,
        maxLife: 0.3,
        size: 2,
        color: this.isDivine ? '#ffd700' : '#4eedff'
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

  updateSlashes(dt) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderShadow(ctx) {
    // Only draw grounded shadow when firmly standing on a solid platform
    if (this.isGrounded) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.beginPath();
      const sw = this.isDivine ? 17 : 13;
      const sh = this.isDivine ? 5 : 3.5;
      // Draw directly on the platform surface line
      ctx.ellipse(this.x, this.y, sw, sh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      const s = p.size || 2;
      ctx.fillRect(Math.floor(p.x - s / 2), Math.floor(p.y - s / 2), s, s);
    }
    ctx.restore();
  }

  renderSlashes(ctx) {
    ctx.save();
    for (const s of this.slashes) {
      const progress = s.life / s.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, progress * 1.5));

      // Draw stylized scimitar crescent slash arc
      const arcColor = s.isDivine ? '#ffd700' : '#ffffff';
      const innerColor = s.isDivine ? '#ff0055' : '#38e1ff';

      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const startAngle = s.dir > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
      const endAngle = s.dir > 0 ? Math.PI * 0.35 : Math.PI * 1.35;
      ctx.arc(s.x, s.y, 24, startAngle, endAngle);
      ctx.stroke();

      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, startAngle, endAngle);
      ctx.stroke();
    }
    ctx.restore();
  }

  render(ctx) {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y); // Exact foot position
    const isFacingLeft = (this.facing === 'left');

    ctx.save();

    // 1. Divine Aura (When in Maa Kali Divine Form)
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - 30);
    }

    // 2. Undertale Red SOUL Heart indicator when leaping
    if (!this.isGrounded) {
      ctx.fillStyle = '#ff0000';
      ctx.font = '11px monospace';
      ctx.fillText('❤', cx - 5, cy - 58);
    }

    // 3. Render Sprite
    ctx.save();
    ctx.translate(cx, cy); // Anchor at exact feet position
    if (isFacingLeft) {
      ctx.scale(-1, 1); // Flip horizontally for left facing
    }

    if (this.isDivine) {
      // Maa Kali Divine Form
      const rw = this.divineWidth;
      const rh = this.divineHeight;
      if (this.anims.divine.complete && this.anims.divine.naturalWidth > 0) {
        ctx.drawImage(this.anims.divine, -rw / 2, -rh, rw, rh);
      }
    } else {
      // Determine Current Mortal Animation Frame
      let currentImg = this.anims.idle;

      if (this.isAttacking) {
        // Play 6-Frame Attack Combo
        currentImg = this.anims.attack[this.attackFrame] || this.anims.idle;
      } else if (!this.isGrounded) {
        // Play Jump Frames based on vertical velocity
        if (this.vy < -160) {
          currentImg = this.anims.jump[1] || this.anims.jump[0]; // Ascending leap
        } else if (Math.abs(this.vy) <= 160) {
          currentImg = this.anims.jump[2] || this.anims.jump[3]; // Apex
        } else {
          currentImg = this.anims.jump[4] || this.anims.jump[5]; // Descending
        }
      } else if (this.isMoving) {
        // Play Run Forward Frames
        currentImg = this.anims.run[this.runFrame] || this.anims.idle;
      }

      const rw = this.spriteWidth;
      const rh = this.spriteHeight;

      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        // Bottom is anchored at 0 (feet touch platform firmly)
        ctx.drawImage(currentImg, -rw / 2, -rh, rw, rh);
      }
    }

    ctx.restore();

    // 4. Render Sword Slash Arc
    this.renderSlashes(ctx);

    ctx.restore();
  }

  drawDivineAura(ctx, x, y) {
    ctx.save();
    const pulse = Math.sin(this.divinePulse) * 3;
    const radius = 24 + pulse;

    const bloom = ctx.createRadialGradient(x, y, 4, x, y, radius + 12);
    bloom.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
    bloom.addColorStop(0.5, 'rgba(56, 225, 255, 0.2)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    const rot = this.animTime * 1.5;
    ctx.strokeStyle = '#ffea79';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 + rot;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (radius - 2), y + Math.sin(angle) * (radius - 2));
      ctx.lineTo(x + Math.cos(angle) * (radius + 5), y + Math.sin(angle) * (radius + 5));
      ctx.stroke();
    }
    ctx.restore();
  }
}
