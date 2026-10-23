/**
 * ==========================================================================
 * GLITCHVERSE - ARCHER & ARROW ENTITY SYSTEM (js/archer.js)
 * Asura / Rakshasa Archer & Homing Tracking Arrow System:
 * - Authentic 6-Frame Aim & Shoot and Aim-Up Animation cycles
 * - 4-Frame Hurt & Fall Death Sequence with Collapsed State & Dropped Bow
 * - Archer HP: 12 HP (divided into 3 segments of 4 damage each)
 * - Rakti's Sword Damage: 4 damage per melee strike (3 hits defeat archer)
 * - Homing / Tracking Arrow: Released arrow continuously curves and follows Rakti!
 * - Mini Ornate HP Bar rendered above the archer displaying 12 / 12 HP
 * - Dynamic removal and replacement with reinforcement archers
 * ==========================================================================
 */

export class Arrow {
  constructor(x, y, owner = null) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 220; // Homing flight speed
    this.angle = Math.PI; // In radians, initially facing left
    this.life = 6.2;
    this.maxLife = 6.2;
    this.damage = 2; // Reduced arrow damage
    this.width = 44;
    this.height = 8;
    this.isAttached = true;
    this.owner = owner;
    this.offsetX = -24;
    this.offsetY = -66;
    this.hasHit = false;
    this.trailParticles = [];
  }

  attachTo(archer, offsetX = -24, offsetY = -66) {
    this.owner = archer;
    this.isAttached = true;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    const dir = (archer.facing === 'left') ? -1 : 1;
    this.x = archer.x + dir * Math.abs(offsetX);
    this.y = archer.y + offsetY;
    this.angle = (dir === -1) ? Math.PI : 0;
    this.vx = 0;
    this.vy = 0;
  }

  release(speed = 230, targetAngle = Math.PI) {
    this.isAttached = false;
    this.speed = speed;
    this.angle = targetAngle;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.life = this.maxLife;
    this.hasHit = false;
    this.trailParticles = [];
  }

  update(dt, player = null, level = null) {
    if (this.isAttached) {
      if (this.owner) {
        const dir = (this.owner.facing === 'left') ? -1 : 1;
        this.x = this.owner.x + dir * Math.abs(this.offsetX);
        this.y = this.owner.y + this.offsetY;
        this.angle = (dir === -1) ? Math.PI : 0;
      }
      return true; // Remains active while attached
    }

    // HOMING / TRACKING MECHANISM: Arrow curves and follows Rakti!
    if (player && !player.isDead) {
      const targetX = player.x;
      const targetY = player.y - 25; // Aim at torso/center height
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const desiredAngle = Math.atan2(dy, dx);

      // Normalize angle difference to [-PI, PI]
      let diff = desiredAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Softened turn rate: curves moderately at a distance (1.35 rad/s), eases off close to player (< 110px -> 0.65 rad/s)
      const distToPlayer = Math.hypot(dx, dy);
      const turnSpeed = distToPlayer < 110 ? 0.65 : 1.35;
      const maxTurn = turnSpeed * dt;
      this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));

      // Update velocity vector along current angle
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }

    // Flight Integration
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Mystical Tracking Trail Particles (Crimson & Solar Amber)
    if (Math.random() < 0.75) {
      this.trailParticles.push({
        x: this.x - Math.cos(this.angle) * 16 + (Math.random() - 0.5) * 4,
        y: this.y - Math.sin(this.angle) * 16 + (Math.random() - 0.5) * 4,
        vx: -this.vx * 0.12 + (Math.random() - 0.5) * 15,
        vy: -this.vy * 0.12 + (Math.random() - 0.5) * 15,
        life: 0.32,
        maxLife: 0.32,
        color: Math.random() > 0.4 ? '#ff3b30' : '#ffd700',
        size: 2.0 + Math.random() * 2.0
      });
    }

    // Update trail particles
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    // Rakti Sword Strike Arrow Deflection: Slicing the arrow destroys it!
    if (player && player.isAttacking) {
      const swordDist = Math.hypot(player.x - this.x, (player.y - 25) - this.y);
      if (swordDist < 38) {
        this.spawnShatterParticles();
        if (level) level.cameraShake = 0.25;
        return false; // Arrow sliced out of the air!
      }
    }

    // Hit Player Check (Deals 4 damage, knockback & camera shake)
    if (!this.hasHit && player) {
      const dist = Math.hypot(player.x - this.x, (player.y - 25) - this.y);
      if (dist < 24) {
        if (player.invulnerableTimer <= 0) {
          player.takeDamage(this.damage, (this.vx < 0 ? -220 : 220), -150);
          this.hasHit = true;
          this.spawnShatterParticles();
          if (level) level.cameraShake = 0.5;
          return false; // Despawn after impact
        }
      }
    }

    // Despawn when life expires or moves outside the level boundaries
    if (this.life <= 0 || this.x < -80 || (level && this.x > level.width + 80)) {
      return false;
    }
    return true;
  }

  spawnShatterParticles() {
    // Shatter bursts
    for (let i = 0; i < 8; i++) {
      this.trailParticles.push({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        life: 0.35,
        maxLife: 0.35,
        color: Math.random() > 0.5 ? '#ffd700' : '#885533',
        size: 2.5 + Math.random() * 2.0
      });
    }
  }

  render(ctx, arrowImg = null) {
    ctx.save();

    // 1. Render Tracking Trail Particles
    for (const p of this.trailParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 2. Render Arrow Sprite
    if (arrowImg && arrowImg.complete && arrowImg.naturalWidth > 0) {
      // Natural arrow sprite points to the right (angle = 0)
      ctx.drawImage(arrowImg, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      // Procedural fallback
      ctx.fillStyle = '#ffeedd';
      ctx.fillRect(-16, -2, 32, 4);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(10, -3);
      ctx.lineTo(10, 3);
      ctx.fill();
    }

    // 3. Glowing Homing Arrowhead Pulse
    if (!this.isAttached) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 60, 40, 0.75)';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.width / 2, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
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
    this.width = 96;
    this.height = 116;

    // Archer Stats: 12 HP (Rakti deals 4 damage per sword strike)
    this.hp = 12;
    this.maxHp = 12;

    this.alive = true;
    this.crushed = false;
    this.facing = 'left';

    this.state = 'idle'; // 'idle', 'aim', 'shoot', 'hurt', 'defeated'
    this.isAimingUp = false;
    this.frame = 0;
    this.animTimer = 0;
    this.frameDuration = 0.12;

    this.shootCooldown = 2.6;
    this.cooldownTimer = 1.0;

    // Sword Hit Cooldown & Flinch Timer
    this.hitCooldown = 0.0;
    this.hurtTimer = 0.0;
    this.hitParticles = [];

    // Attached Arrow Object (synchronized with bow hand)
    this.attachedArrow = new Arrow(this.x - 24, this.y - 66, this);
    this.arrows = [];

    // Removal & replacement lifecycle
    this.canBeRemoved = false;
    this.deathTimer = 0;
    this.removalDelay = 2.0;
    this.fadeAlpha = 1.0;
  }

  attachNewArrow() {
    this.attachedArrow = new Arrow(this.x - 24, this.y - 66, this);
    return this.attachedArrow;
  }

  releaseAttachedArrow(targetAngle) {
    if (!this.attachedArrow) return null;
    const released = this.attachedArrow;
    released.release(230, targetAngle);
    this.arrows.push(released);
    this.attachedArrow = null;
    return released;
  }

  takeDamage(damage, fromX = null) {
    if (!this.alive || this.hitCooldown > 0) return false;

    this.hp = Math.max(0, this.hp - damage);
    this.hitCooldown = 0.38; // Invulnerability window between sword swings
    this.hurtTimer = 0.32;
    this.state = 'hurt';
    this.frame = 0;

    if (fromX !== null) {
      this.facing = (fromX < this.x) ? 'left' : 'right';
    }

    this.spawnHitSparks();

    if (this.hp <= 0) {
      this.die('slashed');
      return true; // Killed
    }
    return false;
  }

  spawnHitSparks() {
    for (let i = 0; i < 10; i++) {
      this.hitParticles.push({
        x: this.x + (Math.random() - 0.5) * 20,
        y: this.y - 50 + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 110,
        vy: -40 - Math.random() * 80,
        life: 0.35,
        maxLife: 0.35,
        color: Math.random() > 0.4 ? '#ffd700' : '#ff2244',
        size: 2.0 + Math.random() * 2.5
      });
    }
  }

  die(cause = 'crushed') {
    if (!this.alive) return false;
    this.alive = false;
    this.crushed = (cause === 'crushed');
    this.hp = 0;
    this.state = 'defeated';
    this.deathTimer = 0;
    this.frame = 0;

    // Drop any attached arrow
    this.attachedArrow = null;
    this.spawnHitSparks();
    return true;
  }

  update(dt, player = null, level = null) {
    // 0. Update hit cooldown & hurt flinch
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      if (this.hurtTimer <= 0 && this.alive) {
        this.state = 'idle';
        this.frame = 0;
      }
    }

    // Update hit sparks
    for (let i = this.hitParticles.length - 1; i >= 0; i--) {
      const p = this.hitParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.hitParticles.splice(i, 1);
      }
    }

    // 1. Defeated state & removal timer
    if (!this.alive) {
      this.deathTimer += dt;
      if (this.deathTimer >= this.removalDelay) {
        this.canBeRemoved = true;
      }
      this.fadeAlpha = Math.max(0, 1.0 - (this.deathTimer / this.removalDelay) * 0.45);

      // Continue updating arrows already in flight
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        if (!this.arrows[i].update(dt, player, level)) {
          this.arrows.splice(i, 1);
        }
      }
      return;
    }

    // 2. Check Rakti Melee Sword Attack (Her sword deals 4 damage!)
    if (this.alive && player && player.isAttacking && this.hitCooldown <= 0) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < 60) {
        const damage = player.swordDamage || 4;
        const killed = this.takeDamage(damage, player.x);
        if (level) {
          level.cameraShake = 0.35;
          if (killed && level.registerKill) {
            level.registerKill(this);
          }
        }
        return;
      }
    }

    // 3. Facing & Elevated Aim Tracking
    if (player) {
      this.facing = (player.x < this.x) ? 'left' : 'right';
      // Aim up if player is elevated (e.g. jumping or on higher ledge)
      this.isAimingUp = (player.y < this.y - 50);
    }

    // 4. Alive Archer State Machine
    this.cooldownTimer -= dt;
    this.animTimer += dt;

    if (this.state === 'idle') {
      if (this.cooldownTimer <= 0.8) {
        this.state = 'aim';
        this.frame = 0;
        this.animTimer = 0;
        if (!this.attachedArrow) {
          this.attachNewArrow();
        }
      }
    } else if (this.state === 'aim') {
      if (this.animTimer >= this.frameDuration) {
        this.animTimer = 0;
        this.frame++;
        if (this.frame >= 6) {
          // Frame 4 released the arrow, cycle completed
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.shootCooldown;
        } else if (this.frame === 4) {
          // Release arrow at frame 4!
          let targetAngle = (this.facing === 'left') ? Math.PI : 0;
          if (player) {
            targetAngle = Math.atan2((player.y - 25) - (this.y - 66), player.x - this.x);
          }
          this.releaseAttachedArrow(targetAngle);
        }
      }
    }

    // Synchronize attached arrow with bow hand
    if (this.attachedArrow) {
      const pullOffset = this.frame * 2.0;
      this.attachedArrow.attachTo(this, -24 + pullOffset, -66);
    }

    // Update active flying arrows
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      if (!this.arrows[i].update(dt, player, level)) {
        this.arrows.splice(i, 1);
      }
    }
  }

  renderHealthBar(ctx) {
    if (!this.alive || this.hp >= this.maxHp) return;

    ctx.save();
    const bx = this.x;
    const by = this.y - 124;
    const bw = 48;
    const bh = 5;

    // Dark backing
    ctx.fillStyle = 'rgba(10, 6, 4, 0.9)';
    ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);

    // Gold filigree border
    ctx.strokeStyle = '#cda24e';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);

    // Fill ratio (4 damage segments)
    const ratio = Math.max(0, this.hp / this.maxHp);
    const grad = ctx.createLinearGradient(bx - bw / 2, by, bx + bw / 2, by);
    grad.addColorStop(0, '#ff3b30');
    grad.addColorStop(1, '#ffd700');
    ctx.fillStyle = grad;
    ctx.fillRect(bx - bw / 2, by, bw * ratio, bh);

    // Segment notches at 1/3 (4 HP) and 2/3 (8 HP)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx - bw / 2 + bw * (1 / 3), by, 1, bh);
    ctx.fillRect(bx - bw / 2 + bw * (2 / 3), by, 1, bh);

    // Label: "12 / 12"
    ctx.font = '700 8px Cinzel, serif';
    ctx.fillStyle = '#ffeedd';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.hp} / ${this.maxHp} HP`, bx, by - 3);

    ctx.restore();
  }

  render(ctx, sprites) {
    ctx.save();
    const ax = this.x;
    const ay = this.y;

    // 1. Defeated / Collapsed State
    if (!this.alive) {
      ctx.globalAlpha = this.fadeAlpha;
      const dieIdx = Math.min(3, Math.floor((this.deathTimer / this.removalDelay) * 4));
      const dieImg = (sprites.dieFrames && sprites.dieFrames[dieIdx]) || sprites.defeated;

      ctx.save();
      ctx.translate(ax, ay);
      const dir = (this.facing === 'left') ? -1 : 1;
      ctx.scale(dir, 1);
      if (dieImg && dieImg.complete) {
        ctx.drawImage(dieImg, -48, -110, 96, 116);
      }
      ctx.restore();

      // Crumbling dust indicator
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(180, 150, 110, ${0.4 * this.fadeAlpha})`;
      ctx.beginPath();
      ctx.arc(ax, ay - 8, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Render flying arrows already shot
      for (const arr of this.arrows) {
        arr.render(ctx, sprites.arrow);
      }
      return;
    }

    // 2. Alive Archer Rendering
    let frameImg = sprites.idle;
    if (this.state === 'hurt') {
      const hurtIdx = Math.min(3, Math.floor(this.animTimer * 10));
      frameImg = (sprites.hurtFrames && sprites.hurtFrames[hurtIdx]) || (sprites.dieFrames && sprites.dieFrames[0]) || sprites.idle;
    } else if (this.state === 'aim') {
      const aimCollection = this.isAimingUp ? (sprites.aimUpFrames || sprites.aimFrames) : sprites.aimFrames;
      frameImg = (aimCollection && aimCollection[this.frame]) || sprites.idle;
    } else {
      // Idle breathing / stance
      const idleFrame = Math.floor(this.animTimer * 5) % 6;
      frameImg = (sprites.idleFrames && sprites.idleFrames[idleFrame]) || sprites.idle;
    }

    ctx.save();
    ctx.translate(ax, ay);
    const dir = (this.facing === 'left') ? -1 : 1;
    ctx.scale(dir, 1);

    if (frameImg && frameImg.complete) {
      ctx.drawImage(frameImg, -48, -110, 96, 116);
    }
    ctx.restore();

    // 3. Render Hit Sparks when slashed by sword
    ctx.save();
    for (const p of this.hitParticles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Render Mini Ornate HP Bar (12 HP with 4-damage segments)
    this.renderHealthBar(ctx);

    // 5. Render Attached Arrow while nocked on bow
    if (this.attachedArrow && this.state === 'aim' && this.frame < 4) {
      this.attachedArrow.render(ctx, sprites.arrow);
    }

    // 6. Render Active Flying Homing Arrows
    for (const arr of this.arrows) {
      arr.render(ctx, sprites.arrow);
    }

    ctx.restore();
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.hp = this.maxHp;
    this.alive = true;
    this.crushed = false;
    this.facing = 'left';
    this.state = 'idle';
    this.frame = 0;
    this.animTimer = 0;
    this.cooldownTimer = 1.0;
    this.hitCooldown = 0.0;
    this.hurtTimer = 0.0;
    this.hitParticles = [];
    this.arrows = [];
    this.attachedArrow = new Arrow(this.x - 24, this.y - 66, this);
    this.canBeRemoved = false;
    this.deathTimer = 0;
    this.fadeAlpha = 1.0;
  }
}
