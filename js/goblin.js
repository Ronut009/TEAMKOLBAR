/**
 * ============================================================================
 * RUINS OF SURYA - SWORD GOBLIN ENTITY & MAGIC PROJECTILE SYSTEM (js/goblin.js)
 * ============================================================================
 * Dual-Mode Image Support:
 * - Primary: High-quality transparent PNG animation frames (assets/anims/goblin/*.png)
 * - Fallback / Direct Link: Master mob spritesheet (assets/mob_spritesheet.jpg)
 *
 * Capabilities:
 * - Walking / Patrol (6-frame loop: walk_0..walk_5)
 * - Melee Sword Attack (6-frame combo: attack_0..attack_5, deals damage on swing)
 * - Magic Purple Cube Attack (5-frame cast: magic_0..magic_4, shoots MagicCube)
 * - Hurt / Stagger (4-frame reaction: hurt_0..hurt_3 with flash & knockback)
 * - Defeated / Collapse (defeated.png with twilight fade & kill toast)
 * - Flying MagicCube projectile with purple aura and particle trails
 * ============================================================================
 */

export class MagicCube {
  constructor(x, y, dir, speed = 250, damage = 3) {
    this.x = x;
    this.y = y;
    this.dir = dir; // 1 = right, -1 = left
    this.vx = dir * speed;
    this.vy = 0;
    this.life = 2.6;
    this.maxLife = 2.6;
    this.damage = damage;
    this.size = 22;
    this.rotation = 0;
    this.hasHit = false;
    this.particles = [];
  }

  update(dt, player = null, level = null) {
    this.x += this.vx * dt;
    this.rotation += dt * 7.5 * this.dir;
    this.life -= dt;

    // Hover floating wave
    this.y += Math.sin((this.maxLife - this.life) * 8) * 16 * dt;

    // Ambient purple magic trail
    if (Math.random() < 0.45) {
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y + (Math.random() - 0.5) * 8,
        vx: -this.vx * 0.12 + (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 25,
        life: 0.35,
        maxLife: 0.35,
        size: 2.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#b987ff' : '#df52ff'
      });
    }

    // Update trail particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Player collision (deals 3 damage & knockback)
    if (!this.hasHit && player && !player.isDead) {
      const dist = Math.hypot(player.x - this.x, (player.y - 28) - this.y);
      if (dist < 26) {
        if (player.invulnerableTimer <= 0) {
          player.takeDamage(this.damage, this.dir * 180, -120);
          this.hasHit = true;
          if (level) level.cameraShake = 0.4;
          return false;
        }
      }
    }

    // Despawn on life expiration or exiting level bounds
    if (this.life <= 0 || this.x < -60 || (level && this.x > level.width + 60)) {
      return false;
    }
    return true;
  }

  render(ctx, cubeImg = null, spritesheet = null) {
    // 1. Trail particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Rotating Glowing Magic Cube
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.save();
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 12;

    if (cubeImg && cubeImg.complete && cubeImg.naturalWidth > 0) {
      ctx.drawImage(cubeImg, -this.size / 2, -this.size / 2, this.size, this.size);
    } else if (spritesheet && spritesheet.complete && spritesheet.naturalWidth > 0) {
      // Direct spritesheet crop from assets/mob_spritesheet.jpg
      ctx.drawImage(spritesheet, 330, 940, 80, 75, -this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.strokeStyle = '#f0abfc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
    ctx.restore();
  }
}

export class SwordGoblin {
  constructor(x, y, id, platform = null) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.platform = platform;

    // Proportional dimensions for Canvas 2D scene
    this.width = 54;
    this.height = 62;
    this.walkSpeed = 65;
    this.chaseSpeed = 115; // Fast aggressive chase pursuing player
    this.facing = (Math.random() > 0.5) ? 'right' : 'left'; // Default sprite faces right

    // Dynamic Physics & Grounding
    this.vx = 0;
    this.vy = 0;
    this.gravity = 800;
    this.isGrounded = true;

    // Combat attributes
    this.maxHp = 16;
    this.hp = 16;
    this.alive = true;
    this.damage = 4; // Melee sword combo strike

    // AI & Animation State: 'walk', 'attack', 'magic', 'hurt', 'defeated'
    this.state = 'walk';
    this.frame = 0;
    this.animTimer = 0;
    this.frameDuration = 0.11;

    // Timers & Cooldowns
    this.patrolDir = (this.facing === 'right') ? 1 : -1;
    this.patrolWaitTimer = 0;
    this.attackCooldown = 0.4 + Math.random() * 0.4;
    this.magicCooldown = 2.0 + Math.random() * 2.5;
    this.hitStunTimer = 0;
    this.flashTimer = 0;
    this.deathTimer = 0;
    this.canBeRemoved = false;
    this.fadeAlpha = 1.0;

    // Attack action execution flags
    this.hasDamagedPlayerThisAttack = false;
    this.hasCastMagicThisAttack = false;

    // Attack debounce for player melee
    this.lastPlayerAttackTime = 0;

    // Spark & Blood particles
    this.particles = [];
  }

  takeDamage(amount, knockbackDir = 0, level = null) {
    if (!this.alive) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.22;

    // Spawn combat spark & blood particles
    for (let i = 0; i < 10; i++) {
      const angle = (Math.random() * Math.PI) - (knockbackDir > 0 ? 0 : Math.PI);
      const speed = 40 + Math.random() * 90;
      this.particles.push({
        x: this.x,
        y: this.y - 32,
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed) - 20,
        life: 0.45,
        maxLife: 0.45,
        size: 2.5 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#4ade80' : '#d946ef'
      });
    }

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'defeated';
      this.frame = 0;
      this.animTimer = 0;
      this.deathTimer = 0;

      if (level && level.registerKill) {
        level.registerKill(this);
      }
      return true;
    }

    // Flinch / Stagger into hurt state
    this.state = 'hurt';
    this.frame = 0;
    this.animTimer = 0;
    this.hitStunTimer = 0.32;
    this.x += knockbackDir * 14;
    return false;
  }

  update(dt, player = null, level = null) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt; // Gravity
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    // 2. Defeated / Death Sequence
    if (!this.alive) {
      this.deathTimer += dt;
      if (this.deathTimer >= 1.6) {
        this.canBeRemoved = true;
      }
      this.fadeAlpha = Math.max(0, 1.0 - (this.deathTimer / 1.6) * 0.9);
      return;
    }

    // 3. Check for Player Melee Attack Damage
    if (player && player.isAttacking) {
      const dx = this.x - player.x;
      const dy = Math.abs(this.y - player.y);
      const playerSlashDir = (player.facing === 'left') ? -1 : 1;

      // Generous melee slash hit detection
      if (dy < 40 && Math.abs(dx) < 56) {
        const isFacingGoblin = (Math.sign(dx) === playerSlashDir || Math.abs(dx) < 20);
        // One hit per swing; the sword always deals player.swordDamage (5).
        if (isFacingGoblin && player.claimSwingHit(this)) {
          this.takeDamage(player.swordDamage, playerSlashDir, level);
          if (level) level.cameraShake = 0.3;
        }
      }
    }

    // 4. Cooldown decrement
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.magicCooldown > 0) this.magicCooldown -= dt;

    // 5. State Machine: HURT
    if (this.state === 'hurt') {
      this.hitStunTimer -= dt;
      this.animTimer += dt;
      if (this.animTimer >= 0.08) {
        this.animTimer = 0;
        this.frame++;
        if (this.frame >= 4) {
          this.state = 'walk';
          this.frame = 0;
        }
      }
      return;
    }

    // 6. State Machine: ATTACK (MELEE)
    if (this.state === 'attack') {
      this.animTimer += dt;
      if (this.animTimer >= 0.09) {
        this.animTimer = 0;
        this.frame++;

        // Active damage frames (frames 2, 3, 4)
        if ((this.frame === 2 || this.frame === 3 || this.frame === 4) && !this.hasDamagedPlayerThisAttack) {
          if (player && !player.isDead) {
            const dx = player.x - this.x;
            const dy = Math.abs(player.y - this.y);
            const goblinDir = (this.facing === 'right') ? 1 : -1;

            if (dy < 45 && Math.abs(dx) < 56 && (Math.sign(dx) === goblinDir || Math.abs(dx) < 24)) {
              if (player.invulnerableTimer <= 0) {
                player.takeDamage(this.damage, goblinDir * 170, -120);
                this.hasDamagedPlayerThisAttack = true;
                if (level) level.cameraShake = 0.4;
              }
            }
          }
        }

        if (this.frame >= 6) {
          this.state = 'walk';
          this.frame = 0;
          this.attackCooldown = 0.5 + Math.random() * 0.4;
        }
      }
      return;
    }

    // 7. State Machine: MAGIC (PURPLE CUBE CAST)
    if (this.state === 'magic') {
      this.animTimer += dt;
      if (this.animTimer >= 0.11) {
        this.animTimer = 0;
        this.frame++;

        // Projectile release frame (frame 3)
        if (this.frame === 3 && !this.hasCastMagicThisAttack) {
          this.hasCastMagicThisAttack = true;
          const dir = (this.facing === 'right') ? 1 : -1;
          const cubeX = this.x + dir * 26;
          const cubeY = this.y - 36;
          if (level && level.addProjectile) {
            level.addProjectile(new MagicCube(cubeX, cubeY, dir, 250, 3));
          }
        }

        if (this.frame >= 5) {
          this.state = 'walk';
          this.frame = 0;
          this.magicCooldown = 2.4 + Math.random() * 2.2;
        }
      }
      return;
    }

    // 8. State Machine: WALK / PATROL / PURSUIT
    const dxToPlayer = player ? (player.x - this.x) : 999;
    const dyToPlayer = player ? Math.abs(player.y - this.y) : 999;
    const distToPlayer = player ? Math.hypot(dxToPlayer, dyToPlayer) : 999;

    // Check Trigger Melee Attack (Aggressive strike whenever adjacent to player)
    if (player && !player.isDead && Math.abs(dxToPlayer) <= 48 && dyToPlayer <= 44 && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.frame = 0;
      this.animTimer = 0;
      this.hasDamagedPlayerThisAttack = false;
      this.facing = (player.x > this.x) ? 'right' : 'left';
      return;
    }

    // Check Trigger Magic Attack (Stage 2 and 3)
    const canUseMagic = (level && level.hubrisStage >= 2);
    if (canUseMagic && player && !player.isDead && Math.abs(dxToPlayer) >= 85 && Math.abs(dxToPlayer) <= 280 && dyToPlayer <= 55 && this.magicCooldown <= 0) {
      this.state = 'magic';
      this.frame = 0;
      this.animTimer = 0;
      this.hasCastMagicThisAttack = false;
      this.facing = (player.x > this.x) ? 'right' : 'left';
      return;
    }

    // Persistent Pursuit AI: Follow the player directly across all terrain
    let moveDir = this.patrolDir;
    let currentSpeed = this.walkSpeed;

    if (player && !player.isDead) {
      moveDir = (player.x > this.x) ? 1 : -1;
      currentSpeed = this.chaseSpeed;
      this.facing = (moveDir > 0) ? 'right' : 'left';
    } else {
      this.facing = (this.patrolDir > 0) ? 'right' : 'left';
    }

    this.vx = moveDir * currentSpeed;

    // Stair-stepping assist: Step up gentle stairs/slopes when pursuing player
    if (level && level.platforms && player && !player.isDead && player.y < this.y - 4) {
      const stepAheadX = this.x + moveDir * 16;
      for (const plat of level.platforms) {
        if (stepAheadX >= plat.x1 - 4 && stepAheadX <= plat.x2 + 4) {
          const stepDiff = this.y - plat.y;
          if (stepDiff >= 4 && stepDiff <= 32) {
            this.y = plat.y;
            this.vy = 0;
            this.isGrounded = true;
            this.platform = plat;
            break;
          }
        }
      }
    }

    // Horizontal Movement Integration
    const prevY = this.y;
    this.x += this.vx * dt;

    // Screen Boundary Clamping
    if (this.x < 16) {
      this.x = 16;
      this.patrolDir = 1;
    } else if (level && this.x > level.width - 16) {
      this.x = level.width - 16;
      this.patrolDir = -1;
    }

    // Dynamic Vertical Physics & Platform Landing (Drop down ledges to chase player!)
    let stillOnPlat = false;
    if (this.platform && this.x >= this.platform.x1 - 8 && this.x <= this.platform.x2 + 8 && Math.abs(this.y - this.platform.y) <= 6) {
      this.y = this.platform.y;
      this.vy = 0;
      this.isGrounded = true;
      stillOnPlat = true;
    }

    if (!stillOnPlat) {
      this.isGrounded = false;
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      if (level && level.checkPlatformLanding) {
        const landed = level.checkPlatformLanding(prevY, this.y, this.x, false, false);
        if (landed) {
          this.y = landed.y;
          this.vy = 0;
          this.isGrounded = true;
          this.platform = landed;
        }
      }
    }

    // Safety Floor Grounding
    if (this.y > 510) {
      this.y = 472;
      this.vy = 0;
      this.isGrounded = true;
      if (level && level.getPlatform) {
        this.platform = level.getPlatform('maw_floor');
      }
    }

    // Walk animation cycling
    this.animTimer += dt;
    if (this.animTimer >= this.frameDuration) {
      this.animTimer = 0;
      this.frame = (this.frame + 1) % 6;
    }
  }

  render(ctx, sprites = null) {
    if (!sprites) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // 1. Platform Contact Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Select Current Animation Frame Image
    let currentImg = null;

    if (this.state === 'walk') {
      currentImg = sprites.walk ? sprites.walk[this.frame % (sprites.walk.length || 1)] : null;
    } else if (this.state === 'attack') {
      currentImg = sprites.attack ? sprites.attack[Math.min(this.frame, (sprites.attack.length || 1) - 1)] : null;
    } else if (this.state === 'magic') {
      currentImg = sprites.magic ? sprites.magic[Math.min(this.frame, (sprites.magic.length || 1) - 1)] : null;
    } else if (this.state === 'hurt') {
      currentImg = sprites.hurt ? sprites.hurt[Math.min(this.frame, (sprites.hurt.length || 1) - 1)] : null;
    } else if (this.state === 'defeated') {
      currentImg = sprites.defeated || (sprites.hurt ? sprites.hurt[3] : null);
    }

    const drawW = this.width;
    const drawH = this.height;

    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
      // High-quality transparent PNG animation frame
      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.facing === 'left') {
        ctx.scale(-1, 1);
      }

      if (this.flashTimer > 0) {
        ctx.filter = 'brightness(2.2) drop-shadow(0 0 6px #ef4444)';
      }

      ctx.drawImage(currentImg, -drawW / 2, -drawH, drawW, drawH);
      ctx.restore();
    } else if (sprites.spritesheet && sprites.spritesheet.complete && sprites.spritesheet.naturalWidth > 0) {
      // Direct spritesheet fallback from assets/mob_spritesheet.jpg
      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.facing === 'left') {
        ctx.scale(-1, 1);
      }

      if (this.flashTimer > 0) {
        ctx.filter = 'brightness(2.2) drop-shadow(0 0 6px #ef4444)';
      }

      let sx = 0, sy = 0, sw = 170.66, sh = 180;
      if (this.state === 'walk') {
        sx = (this.frame % 6) * (1024 / 6);
        sy = 56; sw = 1024 / 6; sh = 180;
      } else if (this.state === 'attack') {
        sx = Math.min(this.frame, 5) * (1024 / 6);
        sy = 286; sw = 1024 / 6; sh = 198;
      } else if (this.state === 'magic') {
        sx = Math.min(this.frame, 4) * (1024 / 5);
        sy = 535; sw = 1024 / 5; sh = 195;
      } else if (this.state === 'hurt') {
        sx = Math.min(this.frame, 3) * (1024 / 5);
        sy = 770; sw = 1024 / 5; sh = 170;
      } else if (this.state === 'defeated') {
        sx = 3 * (1024 / 5);
        sy = 770; sw = 1024 / 5; sh = 170;
      }

      ctx.drawImage(sprites.spritesheet, sx, sy, sw, sh, -drawW / 2, -drawH, drawW, drawH);
      ctx.restore();
    } else {
      // Procedural fallback
      ctx.save();
      ctx.fillStyle = (this.state === 'hurt') ? '#ef4444' : '#22c55e';
      ctx.fillRect(this.x - 16, this.y - 48, 32, 48);
      ctx.restore();
    }

    // 3. Render Blood & Magic Spark Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Subtle HP Bar (visible when damaged and still alive)
    if (this.alive && this.hp < this.maxHp) {
      ctx.save();
      const barW = 28;
      const barH = 4;
      const barX = this.x - barW / 2;
      const barY = this.y - this.height - 7;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const hpPct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * hpPct, barH);
      ctx.restore();
    }

    ctx.restore();
  }
}
