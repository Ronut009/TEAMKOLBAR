/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * Full Sprite Animation Engine (Run, Jump, 6-Frame Attack Combo on Left Click),
 * Authentic Pit Falling Physics, Double Jump, Pit Wall Collisions, & Zero Floating.
 * ==========================================================================
 */

import { Input } from './input.js';

export class Player {
  constructor(startX = 160, startY = 368) {
    this.x = startX;
    this.y = startY;

    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 205;
    this.divineSpeed = 265;
    this.speed = this.baseSpeed;
    this.acceleration = 1800;
    this.friction = 1400;

    // Fluid Jump Physics & Feel
    this.gravity = 920;
    this.jumpImpulse = -470;
    this.divineJumpImpulse = -560;
    this.isGrounded = true;
    this.currentPlatform = null;
    this.dropThroughTimer = 0;

    // Platformer Jump Quality of Life (Coyote Time & Jump Buffer)
    this.coyoteTimer = 0;
    this.coyoteMax = 0.12;
    this.jumpBufferTimer = 0;
    this.jumpBufferMax = 0.12;
    this.canDoubleJump = false; // Divine ability (Key X)

    // Landing animation trigger
    this.landingTimer = 0;

    // Sprite Display Dimensions (Normalized to 160x280 canvas with foot at y=274)
    this.spriteWidth = 46;
    this.spriteHeight = 80;
    this.footOffsetY = 274 / 280;

    this.divineWidth = 56;
    this.divineHeight = 62;

    this.facing = 'right';
    this.doorwayFade = 1.0;
    this.isMoving = false;
    this.animTime = 0;

    // Combat & Attack Combo State (Left Click)
    this.isAttacking = false;
    this.attackFrame = 0;
    this.attackTimer = 0;
    this.attackFrameDuration = 0.065;
    this.slashes = [];

    // Run Animation
    this.runFrame = 0;
    this.runTimer = 0;
    this.runFrameDuration = 0.085;

    // Divine Transformation State (6-Second Duration)
    this.isDivine = false;
    this.divineDuration = 6.0;
    this.divineTimer = 0.0;
    this.divinePulse = 0.0;

    // Preload Animation Sprite Frames
    this.loadAnimations();

    this.particles = [];

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

    this.anims.idle.src = 'assets/anims/idle.png';

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/run_${i}.png`;
      this.anims.run.push(img);
    }

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/attack_${i}.png`;
      this.anims.attack.push(img);
    }

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/jump_${i}.png`;
      this.anims.jump.push(img);
    }

    this.anims.divine.src = 'assets/mc_divine.png';
  }

  triggerAttack() {
    if (this.isAttacking) {
      this.attackFrame = 0;
      this.attackTimer = 0;
    } else {
      this.isAttacking = true;
      this.attackFrame = 0;
      this.attackTimer = 0;
    }

    const slashDir = (this.facing === 'left') ? -1 : 1;
    this.slashes.push({
      x: this.x + slashDir * 24,
      y: this.y - 24,
      dir: slashDir,
      life: 0.22,
      maxLife: 0.22,
      isDivine: this.isDivine
    });

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
    this.canDoubleJump = true;

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
    this.canDoubleJump = false;

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

    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;
    if (this.landingTimer > 0) this.landingTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    if (dialogueActive) {
      this.vx = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    // 1. Attack on Left Click
    if (Input.isPressed('attack')) {
      this.triggerAttack();
    }

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

        // If standing on the divine golden bridge when power expires, fall!
        if (this.currentPlatform && this.currentPlatform.divineOnly) {
          this.isGrounded = false;
          this.currentPlatform = null;
          this.vy = 80;
        }
      }
    }

    // 3. Horizontal Movement
    let moveDir = 0;
    if (Input.isDown('left') || Input.isDown('KeyA') || Input.isDown('ArrowLeft')) moveDir -= 1;
    if (Input.isDown('right') || Input.isDown('KeyD') || Input.isDown('ArrowRight')) moveDir += 1;

    this.isMoving = (moveDir !== 0);
    if (moveDir < 0) this.facing = 'left';
    else if (moveDir > 0) this.facing = 'right';

    const targetVx = moveDir * this.speed;
    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);
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

    // 4. Jump & Drop-Through Handling
    const jumpPressed = Input.isPressed('jump') || Input.isPressed('Space') || Input.isPressed('KeyW') || Input.isPressed('ArrowUp');
    const isDownHeld = Input.isDown('down') || Input.isDown('KeyS') || Input.isDown('ArrowDown');

    if (jumpPressed) {
      this.jumpBufferTimer = this.jumpBufferMax;
    }

    const canGroundJump = (this.isGrounded || this.coyoteTimer > 0);
    if (this.jumpBufferTimer > 0) {
      if (canGroundJump) {
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;

        if (isDownHeld && this.currentPlatform && this.currentPlatform.oneWay) {
          this.dropThroughTimer = 0.28;
          this.isGrounded = false;
          this.currentPlatform = null;
          this.vy = 90;
        } else {
          const impulse = this.isDivine ? this.divineJumpImpulse : this.jumpImpulse;
          this.vy = impulse;
          this.isGrounded = false;
          this.currentPlatform = null;
          this.canDoubleJump = this.isDivine;
          this.spawnPoof(8);
        }
      } else if (this.canDoubleJump) {
        this.jumpBufferTimer = 0;
        this.canDoubleJump = false;
        this.vy = this.isDivine ? this.divineJumpImpulse : this.jumpImpulse * 0.95;
        this.spawnDoubleJumpSparks();
      }
    }

    const jumpHeld = Input.isDown('jump') || Input.isDown('Space') || Input.isDown('KeyW') || Input.isDown('ArrowUp');
    if (!jumpHeld && this.vy < -160) {
      this.vy = -160;
    }

    // 5. Apply Gravity
    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
    }

    // 6. Movement Integration & Collisions
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(16, Math.min(this.x, level.width - 16));
    this.x = level.resolvePitWallCollision(this.x, this.y);

    if (this.vy >= 0) {
      const dropping = (this.dropThroughTimer > 0);
      const landed = level.checkPlatformLanding(prevY, this.y, this.x, dropping, this.isDivine);

      if (landed) {
        this.y = landed.y;
        this.vy = 0;
        if (!this.isGrounded) {
          this.landingTimer = 0.12;
        }
        this.isGrounded = true;
        this.currentPlatform = landed;
        this.canDoubleJump = this.isDivine;
        this.coyoteTimer = 0;
      } else if (this.isGrounded) {
        if (!level.isOnPlatform(this.x, this.y, this.isDivine)) {
          this.isGrounded = false;
          this.currentPlatform = null;
          this.coyoteTimer = this.coyoteMax;
        }
      }
    }

    // 7. Open Chasm Pit Fall & Respawn
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

  spawnDoubleJumpSparks() {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 10,
        vx: Math.cos(angle) * 45,
        vy: Math.sin(angle) * 25,
        life: 0.35,
        maxLife: 0.35,
        size: 2.5,
        color: '#ffd700'
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
  // RENDERING (SYNCHRONIZED FEET, UNCLIPPED JUMP, NO FLOATING)
  // ==========================================================================

  renderShadow(ctx) {
    if (this.isGrounded) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.beginPath();
      const sw = this.isDivine ? 17 : 13;
      const sh = this.isDivine ? 5 : 3.5;
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
    const cy = Math.floor(this.y);
    const isFacingLeft = (this.facing === 'left');

    ctx.save();
    if (this.doorwayFade !== undefined) {
      ctx.globalAlpha = Math.max(0, Math.min(1.0, this.doorwayFade));
    }

    // 1. Divine Aura (When in Maa Kali Divine Form)
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - 30);
    }

    // 2. Render Sprite
    ctx.save();
    ctx.translate(cx, cy);
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }

    if (this.isDivine) {
      const rw = this.divineWidth;
      const rh = this.divineHeight;
      if (this.anims.divine.complete && this.anims.divine.naturalWidth > 0) {
        ctx.drawImage(this.anims.divine, -rw / 2, -rh, rw, rh);
      }
    } else {
      let currentImg = this.anims.idle;

      if (this.isAttacking) {
        currentImg = this.anims.attack[this.attackFrame] || this.anims.idle;
      } else if (!this.isGrounded) {
        if (this.vy < -120) {
          currentImg = this.anims.jump[1] || this.anims.jump[0];
        } else if (Math.abs(this.vy) <= 120) {
          currentImg = this.anims.jump[2] || this.anims.jump[3];
        } else {
          currentImg = this.anims.jump[3] || this.anims.jump[4];
        }
      } else if (this.landingTimer > 0) {
        currentImg = this.anims.jump[4] || this.anims.idle;
      } else if (this.isMoving) {
        currentImg = this.anims.run[this.runFrame] || this.anims.idle;
      }

      const rw = this.spriteWidth;
      const rh = this.spriteHeight;

      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        const drawOffsetY = -rh * this.footOffsetY;
        ctx.drawImage(currentImg, -rw / 2, drawOffsetY, rw, rh);
      }
    }

    ctx.restore();

    // 3. Render Sword Slash Arc
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
