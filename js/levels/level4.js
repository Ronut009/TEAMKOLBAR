/**
 * ==========================================================================
 * GLITCHVERSE - CHAPTER 4: THE CELESTIAL ARENA (js/levels/level4.js)
 * High-stakes amphitheater battle against three distinct villains:
 * 1. Ghoul Swordsman & Sorcerer (Image 2: assets/level4/ghoul.png)
 * 2. Skull Mask Hunter (Image 3: assets/level4/skull_hunter.png)
 * 3. Green Rakshasa Archer (Image 4: assets/level4/green_archer.png)
 *
 * All villains and player positioned strictly inside the circular arena floor.
 * Includes pre-fight standoff countdown, smooth walking animations, and
 * balanced low-damage combat ('hp will reduce like not much').
 * ==========================================================================
 */

// ---------------------------------------------------------------------------
// Balance & Level Configuration
// ---------------------------------------------------------------------------
export const L4_CONFIG = {
  PLAYER_MAX_HP: 50,           // Rakti's life after the Forest Heart (set by engine.applyRelicPowers)

  // Balanced low villain damage ('hp will reduce like not much')
  SWORDSMAN_DAMAGE: 4,
  SORCERER_DAMAGE:  4,
  SKULL_HUNTER_DAMAGE: 3,
  GREEN_ARCHER_DAMAGE: 3,

  // Villain HP
  SWORDSMAN_MAX_HP: 20,
  SORCERER_MAX_HP:  20,
  SKULL_HUNTER_MAX_HP: 20,
  GREEN_ARCHER_MAX_HP: 18,

  // Rakti's sword damage lives on the player (player.swordDamage = 5, one hit per swing)

  // Speeds & ranges
  SWORDSMAN_SPEED: 75,
  SWORDSMAN_ATTACK_RANGE: 54,
  SORCERER_SPEED: 50,
  GREEN_ARCHER_SPEED: 65,
  SKULL_HUNTER_SPEED: 55,

  // Pre-fight countdown time (standoff delay before fighting starts)
  INITIAL_STANDOFF: 1.5,
  WAVE_STANDOFF: 1.2,

  // Arena Circle Geometry Limits (inside the circular stone floor)
  CIRCLE_LEFT: 220,
  CIRCLE_RIGHT: 800,
  FLOOR_Y: 480,
  DAIS_Y: 455
};

// ---------------------------------------------------------------------------
// Floating Combat Text Indicator
// ---------------------------------------------------------------------------
export class FloatingText {
  constructor(x, y, text, color = '#ffd700', size = 14) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.85;
    this.maxLife = 0.85;
    this.vy = -38;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy += 22 * dt;
  }

  render(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${this.size}px 'Cinzel', serif`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Arena Arrow Projectile (Deflectable by Whip)
// ---------------------------------------------------------------------------
export class ArenaArrow {
  constructor(x, y, vx, vy, damage = 3, type = 'skull') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.type = type; // 'skull' or 'emerald'
    this.alive = true;
    this.deflected = false;
    this.trail = [];
    this.life = 4.0;
  }

  update(dt, player, level) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    this.trail.push({ x: this.x, y: this.y, alpha: 0.7 });
    if (this.trail.length > 5) this.trail.shift();
    for (const t of this.trail) t.alpha -= dt * 2.2;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check bounds
    if (this.x < 120 || this.x > 900 || this.y < 200 || this.y > 600) {
      this.alive = false;
      return;
    }

    // Whip Deflection Check
    if (!this.deflected && player && player.isAttacking) {
      const whipDist = Math.hypot(this.x - player.x, this.y - (player.y - 25));
      if (whipDist < 60) {
        this.deflected = true;
        this.vx = (player.facing === 'left' ? -380 : 380);
        this.vy = -60 + (Math.random() - 0.5) * 80;
        level.spawnSparks(this.x, this.y, 14, '#ffd700');
        level.addFloatingText(this.x, this.y - 15, 'PARRY!', '#ffd700', 13);
        return;
      }
    }

    // Player collision
    if (!this.deflected && player && !player.isDead && !player.isDead) {
      const pDist = Math.hypot(this.x - player.x, this.y - (player.y - 25));
      if (pDist < 26) {
        this.alive = false;
        player.takeDamage(this.damage, this.x);
        level.addFloatingText(player.x, player.y - 50, `-${this.damage}`, '#ff4444', 15);
        level.spawnSparks(this.x, this.y, 10, '#ff3344');
      }
    }
  }

  render(ctx) {
    if (!this.alive) return;
    ctx.save();
    for (const t of this.trail) {
      if (t.alpha > 0) {
        ctx.fillStyle = this.type === 'emerald' ? `rgba(46, 204, 113, ${t.alpha})` : `rgba(230, 230, 230, ${t.alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const angle = Math.atan2(this.vy, this.vx);
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    ctx.fillStyle = this.type === 'emerald' ? '#2ecc71' : '#f5f5f5';
    ctx.fillRect(-12, -2, 24, 4);

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(12, -4);
    ctx.lineTo(18, 0);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fillStyle = this.type === 'emerald' ? '#27ae60' : '#e74c3c';
    ctx.fill();

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Magic Bolt Projectile (Fired by Ghoul Sorcerer)
// ---------------------------------------------------------------------------
export class MagicBolt {
  constructor(x, y, targetX, targetY, damage = 4) {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = L4_CONFIG.MAGIC_BOLT_SPEED;
    this.alive = true;
    this.life = 4.2;
    this.deflected = false;
    this.radius = 8;
    this.trail = [];

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.pulse = 0;
  }

  update(dt, player, level) {
    if (!this.alive) return;
    this.life -= dt;
    this.pulse += dt * 8;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    this.trail.push({ x: this.x, y: this.y, alpha: 0.65 });
    if (this.trail.length > 6) this.trail.shift();
    for (const t of this.trail) t.alpha -= dt * 2.0;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 150 || this.x > 880 || this.y < 240 || this.y > 580) {
      this.alive = false;
      return;
    }

    // Whip Deflection
    if (!this.deflected && player && player.isAttacking) {
      const whipDist = Math.hypot(this.x - player.x, this.y - (player.y - 25));
      if (whipDist < 58) {
        this.deflected = true;
        this.vx = (player.facing === 'left' ? -280 : 280);
        this.vy = -40;
        level.spawnSparks(this.x, this.y, 16, '#ba55d3');
        level.addFloatingText(this.x, this.y - 15, 'DEFLECT!', '#ba55d3', 13);
        return;
      }
    }

    // Player collision
    if (!this.deflected && player && !player.isDead && !player.isDead) {
      const pDist = Math.hypot(this.x - player.x, this.y - (player.y - 25));
      if (pDist < 25) {
        this.alive = false;
        player.takeDamage(this.damage, this.x);
        level.addFloatingText(player.x, player.y - 50, `-${this.damage}`, '#ba55d3', 15);
        level.spawnSparks(this.x, this.y, 12, '#9932cc');
      }
    }
  }

  render(ctx) {
    if (!this.alive) return;
    ctx.save();
    for (const t of this.trail) {
      if (t.alpha > 0) {
        ctx.fillStyle = `rgba(186, 85, 211, ${t.alpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const r = this.radius + Math.sin(this.pulse) * 2;
    const grad = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ba55d3');
    grad.addColorStop(1, 'rgba(75, 0, 130, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// VILLAIN 1: GHOUL SWORDSMAN (Image 2: assets/level4/ghoul.png)
// Melee dual-blade combatant inside the arena circle
// ---------------------------------------------------------------------------
export class GhoulSwordsman {
  constructor(x, y, id = 'swordsman') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = L4_CONFIG.SWORDSMAN_MAX_HP;
    this.maxHp = L4_CONFIG.SWORDSMAN_MAX_HP;
    this.alive = true;
    this.canBeRemoved = false;
    this.state = 'idle'; // idle, walk, attack, hurt, dead
    this.facing = 'left';

    this.frame = 0;
    this.frameTimer = 0;
    this.frameDuration = 0.12;

    this.hitCooldown = 0.0;
    this.attackCooldown = 1.8;
    this.cooldownTimer = 0.4;
    this.hasDamagedPlayer = false;
    this.deathFade = 1.0;

    // Sprite frames bounding boxes in ghoul.png (1024x682)
    // Row 0: Walk (7 frames)
    this.walkFrames = [
      { x: 33, w: 117 }, { x: 165, w: 94 }, { x: 309, w: 92 },
      { x: 444, w: 94 }, { x: 589, w: 87 }, { x: 727, w: 82 }, { x: 863, w: 88 }
    ];
    // Row 1: Attack (6 frames)
    this.attackFrames = [
      { x: 33, w: 126 }, { x: 174, w: 122 }, { x: 337, w: 140 },
      { x: 532, w: 95 }, { x: 673, w: 105 }, { x: 830, w: 124 }
    ];
    // Row 3: Hurt / Dead (5 frames)
    this.hurtFrames = [
      { x: 37, w: 90 }, { x: 192, w: 127 }, { x: 364, w: 119 },
      { x: 505, w: 161 }, { x: 692, w: 129 }
    ];
  }

  takeDamage(amount, sourceX) {
    if (!this.alive || this.hitCooldown > 0) return;
    this.hitCooldown = 0.35;
    this.hp = Math.max(0, this.hp - amount);
    this.state = 'hurt';
    this.frame = 0;
    this.frameTimer = 0;
    this.vx = (sourceX < this.x) ? 60 : -60;

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.frame = 2;
    }
  }

  update(dt, player, level, inStandoff) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (!this.alive) {
      if (this.state === 'dead') {
        this.deathFade -= dt * 0.9;
        if (this.deathFade <= 0) {
          this.deathFade = 0;
          this.canBeRemoved = true;
        }
      }
      return;
    }

    if (player) {
      this.facing = (player.x < this.x) ? 'left' : 'right';
    }

    // In standoff countdown, strictly idle facing player
    if (inStandoff) {
      this.state = 'idle';
      this.vx = 0;
      this.frameTimer += dt;
      if (this.frameTimer >= 0.18) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % 4;
      }
      return;
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.state === 'hurt') {
      this.frameTimer += dt;
      this.vx = level.approach(this.vx, 0, 180 * dt);
      this.x += this.vx * dt;
      this.x = Math.max(L4_CONFIG.CIRCLE_LEFT, Math.min(this.x, L4_CONFIG.CIRCLE_RIGHT));
      if (this.frameTimer >= 0.16) {
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
      }
      return;
    }

    if (this.state === 'attack') {
      this.frameTimer += dt;
      this.vx = 0;
      if (this.frameTimer >= 0.10) {
        this.frameTimer = 0;
        this.frame++;

        // Deal damage on slash frames (frames 2-3)
        if ((this.frame === 2 || this.frame === 3) && !this.hasDamagedPlayer && player && !player.isDead) {
          const dist = Math.hypot(player.x - this.x, player.y - this.y);
          if (dist <= L4_CONFIG.SWORDSMAN_ATTACK_RANGE + 16) {
            this.hasDamagedPlayer = true;
            player.takeDamage(L4_CONFIG.SWORDSMAN_DAMAGE, this.x);
            level.addFloatingText(player.x, player.y - 50, `-${L4_CONFIG.SWORDSMAN_DAMAGE}`, '#ff4444', 15);
            level.spawnSparks(player.x, player.y - 25, 10, '#ff2244');
          }
        }

        if (this.frame >= this.attackFrames.length) {
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.attackCooldown;
        }
      }
      return;
    }

    // AI: Walk towards player within circle floor bounds
    if (player && !player.isDead) {
      const dist = Math.abs(player.x - this.x);
      if (dist <= L4_CONFIG.SWORDSMAN_ATTACK_RANGE && this.cooldownTimer <= 0) {
        this.state = 'attack';
        this.frame = 0;
        this.frameTimer = 0;
        this.hasDamagedPlayer = false;
        return;
      }

      this.state = 'walk';
      const moveDir = (player.x < this.x) ? -1 : 1;
      this.vx = moveDir * L4_CONFIG.SWORDSMAN_SPEED;
      this.x += this.vx * dt;
      this.x = Math.max(L4_CONFIG.CIRCLE_LEFT, Math.min(this.x, L4_CONFIG.CIRCLE_RIGHT));

      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % this.walkFrames.length;
      }
    }
  }

  render(ctx, ghoulImg) {
    if (!ghoulImg || !ghoulImg.complete) return;
    ctx.save();
    ctx.globalAlpha = this.alive ? 1.0 : this.deathFade;
    ctx.translate(this.x, this.y);
    const dir = (this.facing === 'left') ? -1 : 1;
    ctx.scale(dir, 1);

    let sx = 33, sy = 0, sw = 117, sh = 170;
    let dw = 64, dh = 76;

    if (this.state === 'idle') {
      const f = this.walkFrames[this.frame % 3];
      sx = f.x; sy = 0; sw = f.w; sh = 170;
    } else if (this.state === 'walk') {
      const f = this.walkFrames[this.frame % this.walkFrames.length];
      sx = f.x; sy = 0; sw = f.w; sh = 170;
    } else if (this.state === 'attack') {
      const f = this.attackFrames[Math.min(this.frame, this.attackFrames.length - 1)];
      sx = f.x; sy = 170; sw = f.w; sh = 170;
      dw = 74;
    } else if (this.state === 'hurt') {
      const f = this.hurtFrames[0];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    } else if (this.state === 'dead') {
      const f = this.hurtFrames[Math.min(3, this.hurtFrames.length - 1)];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    }

    ctx.drawImage(ghoulImg, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    ctx.restore();

    if (this.alive) {
      this.renderHealthBar(ctx);
    }
  }

  renderHealthBar(ctx) {
    ctx.save();
    const bx = this.x;
    const by = this.y - 82;
    const bw = 54, bh = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(bx - bw / 2, by, bw * pct, bh);
    ctx.font = 'bold 9px Cinzel, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`BETAL ${this.hp}/${this.maxHp}`, bx, by - 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// VILLAIN 2: GHOUL SORCERER (Image 2: assets/level4/ghoul.png)
// Ranged magic caster firing purple homing bolts
// ---------------------------------------------------------------------------
export class GhoulSorcerer {
  constructor(x, y, id = 'sorcerer') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.hp = L4_CONFIG.SORCERER_MAX_HP;
    this.maxHp = L4_CONFIG.SORCERER_MAX_HP;
    this.alive = true;
    this.canBeRemoved = false;
    this.state = 'idle'; // idle, cast, hurt, dead
    this.facing = 'left';

    this.frame = 0;
    this.frameTimer = 0;
    this.frameDuration = 0.14;

    this.hitCooldown = 0.0;
    this.castCooldown = 3.2;
    this.cooldownTimer = 1.5;
    this.hasFired = false;
    this.deathFade = 1.0;

    // Sprite frames for magic row in ghoul.png (y=340, h=170)
    this.castFrames = [
      { x: 36, w: 108 }, { x: 182, w: 137 }, { x: 337, w: 107 },
      { x: 479, w: 131 }, { x: 662, w: 120 }, { x: 797, w: 197 }
    ];
    this.hurtFrames = [
      { x: 37, w: 90 }, { x: 192, w: 127 }, { x: 364, w: 119 },
      { x: 505, w: 161 }, { x: 692, w: 129 }
    ];
  }

  takeDamage(amount, sourceX) {
    if (!this.alive || this.hitCooldown > 0) return;
    this.hitCooldown = 0.35;
    this.hp = Math.max(0, this.hp - amount);
    this.state = 'hurt';
    this.frame = 0;
    this.frameTimer = 0;

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.frame = 2;
    }
  }

  update(dt, player, level, inStandoff) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (!this.alive) {
      if (this.state === 'dead') {
        this.deathFade -= dt * 0.9;
        if (this.deathFade <= 0) {
          this.deathFade = 0;
          this.canBeRemoved = true;
        }
      }
      return;
    }

    if (player) {
      this.facing = (player.x < this.x) ? 'left' : 'right';
    }

    if (inStandoff) {
      this.state = 'idle';
      this.frameTimer += dt;
      if (this.frameTimer >= 0.20) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % 3;
      }
      return;
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.state === 'hurt') {
      this.frameTimer += dt;
      if (this.frameTimer >= 0.18) {
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
      }
      return;
    }

    if (this.state === 'cast') {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.frame++;

        if (this.frame === 3 && !this.hasFired && player && !player.isDead) {
          this.hasFired = true;
          level.spawnMagicBolt(this.x, this.y - 38, player.x, player.y - 25);
        }

        if (this.frame >= this.castFrames.length) {
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.castCooldown;
        }
      }
      return;
    }

    // AI: Reposition inside circle and cast magic
    if (this.cooldownTimer <= 0 && player && !player.isDead) {
      this.state = 'cast';
      this.frame = 0;
      this.frameTimer = 0;
      this.hasFired = false;
    } else {
      this.state = 'idle';
      this.frameTimer += dt;
      if (this.frameTimer >= 0.22) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % 3;
      }
    }
  }

  render(ctx, ghoulImg) {
    if (!ghoulImg || !ghoulImg.complete) return;
    ctx.save();
    ctx.globalAlpha = this.alive ? 1.0 : this.deathFade;
    ctx.translate(this.x, this.y);
    const dir = (this.facing === 'left') ? -1 : 1;
    ctx.scale(dir, 1);

    let sx = 36, sy = 340, sw = 108, sh = 170;
    let dw = 64, dh = 76;

    if (this.state === 'idle') {
      const f = this.castFrames[this.frame % 3];
      sx = f.x; sy = 340; sw = f.w; sh = 170;
    } else if (this.state === 'cast') {
      const f = this.castFrames[Math.min(this.frame, this.castFrames.length - 1)];
      sx = f.x; sy = 340; sw = f.w; sh = 170;
      dw = 74;
    } else if (this.state === 'hurt') {
      const f = this.hurtFrames[0];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    } else if (this.state === 'dead') {
      const f = this.hurtFrames[Math.min(3, this.hurtFrames.length - 1)];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    }

    ctx.drawImage(ghoulImg, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    ctx.restore();

    if (this.alive) {
      this.renderHealthBar(ctx);
    }
  }

  renderHealthBar(ctx) {
    ctx.save();
    const bx = this.x;
    const by = this.y - 80;
    const bw = 46, bh = 5;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#ba55d3';
    ctx.fillRect(bx - bw / 2, by, bw * pct, bh);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// VILLAIN 3: SKULL MASK HUNTER (Image 3: assets/level4/skull_hunter.png)
// Masked tribal archer drawing bow, shooting bone arrows, and reloading
// ---------------------------------------------------------------------------
export class SkullHunter {
  constructor(x, y, id = 'skull_hunter') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = L4_CONFIG.SKULL_HUNTER_MAX_HP;
    this.maxHp = L4_CONFIG.SKULL_HUNTER_MAX_HP;
    this.alive = true;
    this.canBeRemoved = false;
    this.state = 'idle'; // idle, draw, shoot, reload, hurt, dead
    this.facing = 'left';

    this.frame = 0;
    this.frameTimer = 0;
    this.frameDuration = 0.13;

    this.hitCooldown = 0.0;
    this.shootCooldown = 3.0;
    this.cooldownTimer = 0.7;
    this.hasFired = false;
    this.deathFade = 1.0;

    // Sprite frames bounding boxes in skull_hunter.png (1024x570)
    // Row 0: Draw bow (4 frames, y=0, h=190)
    this.drawFrames = [
      { x: 89, w: 164 }, { x: 315, w: 167 }, { x: 558, w: 171 }, { x: 809, w: 170 }
    ];
    // Row 1: Shoot arrow (4 frames, y=190, h=190)
    this.shootFrames = [
      { x: 89, w: 156 }, { x: 325, w: 151 }, { x: 568, w: 160 }, { x: 821, w: 157 }
    ];
    // Row 2: Reload arrow (4 frames, y=380, h=190)
    this.reloadFrames = [
      { x: 90, w: 163 }, { x: 330, w: 163 }, { x: 568, w: 166 }, { x: 821, w: 168 }
    ];
  }

  takeDamage(amount, sourceX) {
    if (!this.alive || this.hitCooldown > 0) return;
    this.hitCooldown = 0.35;
    this.hp = Math.max(0, this.hp - amount);
    this.state = 'hurt';
    this.frame = 0;
    this.frameTimer = 0;

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
    }
  }

  update(dt, player, level, inStandoff) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (!this.alive) {
      if (this.state === 'dead') {
        this.deathFade -= dt * 0.9;
        if (this.deathFade <= 0) {
          this.deathFade = 0;
          this.canBeRemoved = true;
        }
      }
      return;
    }

    if (player) {
      this.facing = (player.x < this.x) ? 'left' : 'right';
    }

    if (inStandoff) {
      this.state = 'idle';
      this.frameTimer += dt;
      if (this.frameTimer >= 0.22) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % 2;
      }
      return;
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.state === 'hurt') {
      this.frameTimer += dt;
      if (this.frameTimer >= 0.18) {
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
      }
      return;
    }

    // Sequence: draw -> shoot -> reload -> idle
    if (this.state === 'draw') {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.frame++;
        if (this.frame >= this.drawFrames.length) {
          this.state = 'shoot';
          this.frame = 0;
          this.hasFired = false;
        }
      }
      return;
    }

    if (this.state === 'shoot') {
      this.frameTimer += dt;
      if (this.frameTimer >= 0.10) {
        this.frameTimer = 0;
        this.frame++;

        if (this.frame === 1 && !this.hasFired && player && !player.isDead) {
          this.hasFired = true;
          const arrowSpeed = 280;
          const dir = (this.facing === 'left') ? -1 : 1;
          const targetY = player.y - 25;
          const dy = (targetY - (this.y - 35)) * 0.4;
          level.spawnArrow(this.x + dir * 25, this.y - 35, dir * arrowSpeed, dy, L4_CONFIG.SKULL_HUNTER_DAMAGE, 'skull');
        }

        if (this.frame >= this.shootFrames.length) {
          this.state = 'reload';
          this.frame = 0;
        }
      }
      return;
    }

    if (this.state === 'reload') {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.frame++;
        if (this.frame >= this.reloadFrames.length) {
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.shootCooldown;
        }
      }
      return;
    }

    // AI: Tactical movement and shooting
    if (player && !player.isDead) {
      const dist = Math.abs(player.x - this.x);

      // Ready to fire from range
      if (this.cooldownTimer <= 0 && dist >= 60) {
        this.state = 'draw';
        this.frame = 0;
        this.frameTimer = 0;
        return;
      }

      // Reposition across the arena circle
      let moveDir = 0;
      if (dist < 90) {
        moveDir = (player.x < this.x) ? 1 : -1; // back away from player
      } else if (dist > 220) {
        moveDir = (player.x < this.x) ? -1 : 1; // close in
      }

      if (moveDir !== 0) {
        this.vx = moveDir * L4_CONFIG.SKULL_HUNTER_SPEED;
        this.x += this.vx * dt;
        this.x = Math.max(L4_CONFIG.CIRCLE_LEFT, Math.min(this.x, L4_CONFIG.CIRCLE_RIGHT));
        this.frameTimer += dt;
        if (this.frameTimer >= 0.14) {
          this.frameTimer = 0;
          this.frame = (this.frame + 1) % this.drawFrames.length;
        }
      } else {
        this.state = 'idle';
        this.frameTimer += dt;
        if (this.frameTimer >= 0.22) {
          this.frameTimer = 0;
          this.frame = (this.frame + 1) % 2;
        }
      }
    }
  }

  render(ctx, skullImg) {
    if (!skullImg || !skullImg.complete) return;
    ctx.save();
    ctx.globalAlpha = this.alive ? 1.0 : this.deathFade;
    ctx.translate(this.x, this.y);
    const dir = (this.facing === 'left') ? -1 : 1;
    ctx.scale(dir, 1);

    let sx = 89, sy = 0, sw = 164, sh = 190;
    let dw = 68, dh = 78;

    if (this.state === 'idle') {
      const f = this.drawFrames[this.frame % 2];
      sx = f.x; sy = 0; sw = f.w; sh = 190;
    } else if (this.state === 'draw') {
      const f = this.drawFrames[Math.min(this.frame, this.drawFrames.length - 1)];
      sx = f.x; sy = 0; sw = f.w; sh = 190;
    } else if (this.state === 'shoot') {
      const f = this.shootFrames[Math.min(this.frame, this.shootFrames.length - 1)];
      sx = f.x; sy = 190; sw = f.w; sh = 190;
    } else if (this.state === 'reload') {
      const f = this.reloadFrames[Math.min(this.frame, this.reloadFrames.length - 1)];
      sx = f.x; sy = 380; sw = f.w; sh = 190;
    } else if (this.state === 'hurt' || this.state === 'dead') {
      const f = this.reloadFrames[0];
      sx = f.x; sy = 380; sw = f.w; sh = 190;
    }

    ctx.drawImage(skullImg, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    ctx.restore();

    if (this.alive) {
      this.renderHealthBar(ctx);
    }
  }

  renderHealthBar(ctx) {
    ctx.save();
    const bx = this.x;
    const by = this.y - 82;
    const bw = 54, bh = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(bx - bw / 2, by, bw * pct, bh);
    ctx.font = 'bold 9px Cinzel, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`SKELETON ${this.hp}/${this.maxHp}`, bx, by - 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// VILLAIN 4: GREEN RAKSHASA ARCHER (Image 4: assets/level4/green_archer.png)
// Smooth walking (8-frame animation) & emerald arrow archer
// ---------------------------------------------------------------------------
export class GreenArcher {
  constructor(x, y, id = 'green_archer') {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.hp = L4_CONFIG.GREEN_ARCHER_MAX_HP;
    this.maxHp = L4_CONFIG.GREEN_ARCHER_MAX_HP;
    this.alive = true;
    this.canBeRemoved = false;
    this.state = 'idle'; // idle, walk, aim, shoot, hurt, dead
    this.facing = 'left';

    this.frame = 0;
    this.frameTimer = 0;
    this.walkFrameDuration = 0.09; // Silky smooth 8-frame walk loop

    this.hitCooldown = 0.0;
    this.shootCooldown = 3.2;
    this.cooldownTimer = 1.0;
    this.hasFired = false;
    this.deathFade = 1.0;

    // Sprite frames bounding boxes in green_archer.png (1024x682)
    // Row 0: Smooth Walk (8 frames, y=0, h=170)
    this.walkFrames = [
      { x: 31, w: 103 }, { x: 150, w: 105 }, { x: 275, w: 95 }, { x: 398, w: 106 },
      { x: 524, w: 101 }, { x: 647, w: 105 }, { x: 777, w: 100 }, { x: 909, w: 91 }
    ];
    // Row 1: Aim & Shoot (7 frames, y=170, h=170)
    this.aimShootFrames = [
      { x: 35, w: 114 }, { x: 181, w: 115 }, { x: 324, w: 117 },
      { x: 474, w: 122 }, { x: 620, w: 103 }, { x: 736, w: 111 }, { x: 893, w: 97 }
    ];
    // Row 3: Hurt & Defeat (5 frames, y=510, h=170)
    this.hurtFrames = [
      { x: 48, w: 99 }, { x: 170, w: 132 }, { x: 324, w: 154 },
      { x: 492, w: 233 }, { x: 786, w: 218 }
    ];
  }

  takeDamage(amount, sourceX) {
    if (!this.alive || this.hitCooldown > 0) return;
    this.hitCooldown = 0.35;
    this.hp = Math.max(0, this.hp - amount);
    this.state = 'hurt';
    this.frame = 0;
    this.frameTimer = 0;

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
    }
  }

  update(dt, player, level, inStandoff) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (!this.alive) {
      if (this.state === 'dead') {
        this.deathFade -= dt * 0.9;
        if (this.deathFade <= 0) {
          this.deathFade = 0;
          this.canBeRemoved = true;
        }
      }
      return;
    }

    if (player) {
      this.facing = (player.x < this.x) ? 'left' : 'right';
    }

    if (inStandoff) {
      this.state = 'idle';
      this.frameTimer += dt;
      if (this.frameTimer >= 0.18) {
        this.frameTimer = 0;
        this.frame = (this.frame + 1) % 4;
      }
      return;
    }

    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

    if (this.state === 'hurt') {
      this.frameTimer += dt;
      if (this.frameTimer >= 0.18) {
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
      }
      return;
    }

    if (this.state === 'aim' || this.state === 'shoot') {
      this.frameTimer += dt;
      if (this.frameTimer >= 0.11) {
        this.frameTimer = 0;
        this.frame++;

        if (this.frame === 4 && !this.hasFired && player && !player.isDead) {
          this.hasFired = true;
          const arrowSpeed = 290;
          const dir = (this.facing === 'left') ? -1 : 1;
          const targetY = player.y - 25;
          const dy = (targetY - (this.y - 35)) * 0.35;
          level.spawnArrow(this.x + dir * 25, this.y - 35, dir * arrowSpeed, dy, L4_CONFIG.GREEN_ARCHER_DAMAGE, 'emerald');
        }

        if (this.frame >= this.aimShootFrames.length) {
          this.state = 'idle';
          this.frame = 0;
          this.cooldownTimer = this.shootCooldown;
        }
      }
      return;
    }

    // AI: Tactical repositioning with smooth 8-frame walk loop
    if (player && !player.isDead) {
      const dist = Math.abs(player.x - this.x);

      // Ready to shoot from distance
      if (this.cooldownTimer <= 0 && dist >= 80) {
        this.state = 'aim';
        this.frame = 0;
        this.frameTimer = 0;
        this.hasFired = false;
        return;
      }

      // If player gets too close, back away smoothly; otherwise advance or patrol
      let moveDir = 0;
      if (dist < 120) {
        moveDir = (player.x < this.x) ? 1 : -1; // back away
      } else if (dist > 280) {
        moveDir = (player.x < this.x) ? -1 : 1; // close in
      }

      if (moveDir !== 0) {
        this.state = 'walk';
        this.vx = moveDir * L4_CONFIG.GREEN_ARCHER_SPEED;
        this.x += this.vx * dt;
        this.x = Math.max(L4_CONFIG.CIRCLE_LEFT, Math.min(this.x, L4_CONFIG.CIRCLE_RIGHT));

        this.frameTimer += dt;
        if (this.frameTimer >= this.walkFrameDuration) {
          this.frameTimer = 0;
          this.frame = (this.frame + 1) % this.walkFrames.length;
        }
      } else {
        this.state = 'idle';
        this.frameTimer += dt;
        if (this.frameTimer >= 0.18) {
          this.frameTimer = 0;
          this.frame = (this.frame + 1) % 4;
        }
      }
    }
  }

  render(ctx, greenImg) {
    if (!greenImg || !greenImg.complete) return;
    ctx.save();
    ctx.globalAlpha = this.alive ? 1.0 : this.deathFade;
    ctx.translate(this.x, this.y);
    const dir = (this.facing === 'left') ? -1 : 1;
    ctx.scale(dir, 1);

    let sx = 31, sy = 0, sw = 103, sh = 170;
    let dw = 66, dh = 76;

    if (this.state === 'idle') {
      const f = this.walkFrames[this.frame % 4];
      sx = f.x; sy = 0; sw = f.w; sh = 170;
    } else if (this.state === 'walk') {
      const f = this.walkFrames[this.frame % this.walkFrames.length];
      sx = f.x; sy = 0; sw = f.w; sh = 170;
    } else if (this.state === 'aim' || this.state === 'shoot') {
      const f = this.aimShootFrames[Math.min(this.frame, this.aimShootFrames.length - 1)];
      sx = f.x; sy = 170; sw = f.w; sh = 170;
      dw = 74;
    } else if (this.state === 'hurt') {
      const f = this.hurtFrames[0];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    } else if (this.state === 'dead') {
      const f = this.hurtFrames[Math.min(3, this.hurtFrames.length - 1)];
      sx = f.x; sy = 510; sw = f.w; sh = 170;
    }

    ctx.drawImage(greenImg, sx, sy, sw, sh, -dw / 2, -dh, dw, dh);
    ctx.restore();

    if (this.alive) {
      this.renderHealthBar(ctx);
    }
  }

  renderHealthBar(ctx) {
    ctx.save();
    const bx = this.x;
    const by = this.y - 82;
    const bw = 54, bh = 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(bx - bw / 2, by, bw * pct, bh);
    ctx.font = 'bold 9px Cinzel, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`ARCHER ${this.hp}/${this.maxHp}`, bx, by - 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// MAIN CHAPTER 4 LEVEL CLASS
// ---------------------------------------------------------------------------
export class Level4 {
  constructor() {
    this.levelIndex = 4;
    this.width = 1024;
    this.height = 686;

    // Assets
    this.arenaImg = new Image();
    this.arenaImg.src = 'assets/level4/arena.jpg';

    this.ghoulImg = new Image();
    this.ghoulImg.src = 'assets/level4/ghoul.png';

    this.skullHunterImg = new Image();
    this.skullHunterImg.src = 'assets/level4/skull_hunter.png';

    this.greenArcherImg = new Image();
    this.greenArcherImg.src = 'assets/level4/green_archer.png';

    // Arena Platform Layout (Floor is strictly aligned to circle)
    this.platforms = [
      { id: 'floor_circle', x1: 210, x2: 810, y: L4_CONFIG.FLOOR_Y, oneWay: false },
      { id: 'dais_center',  x1: 390, x2: 635, y: L4_CONFIG.DAIS_Y,  oneWay: false },
      { id: 'rear_ledge',   x1: 440, x2: 584, y: 380,               oneWay: true },
      { id: 'balcony_left', x1: 40,  x2: 210, y: 365,               oneWay: true },
      { id: 'balcony_right',x1: 810, x2: 984, y: 365,               oneWay: true }
    ];

    // Ancient Relic Chest
    this.chest = {
      x: 512,
      y: 380,
      opened: false,
      unlocked: false,
      glowPulse: 0
    };

    // Actors & Projectiles
    this.swordsmen = [];
    this.sorcerers = [];
    this.skullHunters = [];
    this.greenArchers = [];
    this.arrows = [];
    this.magicBolts = [];
    this.particles = [];
    this.floatingTexts = [];

    // Combat & Flow
    this.wave = 1;
    this.maxWaves = 1;
    this.victory = false;
    this.victoryTimer = 0;
    this.waveTransitionTimer = 0;
    this.kills = 0;
    this.cameraShake = 0;
    this.toastText = '';
    this.toastTimer = 0;

    // Pre-Fight Standoff Countdown
    this.standoffTimer = L4_CONFIG.INITIAL_STANDOFF;
    this.fightBannerTimer = 0;

    this.ladders = [];
    this.killToastText = '';
    this.killToastTimer = 0;
    this.debugMode = false;

    this.initWave(1);
  }

  reset() {
    this.wave = 1;
    this.waveTransitionTimer = 0;
    this.kills = 0;
    this.cameraShake = 0;
    this.toastText = '';
    this.toastTimer = 0;
    this.standoffTimer = L4_CONFIG.INITIAL_STANDOFF;
    this.fightBannerTimer = 0;
    this.victory = false;
    this.victoryTimer = 0;

    this.chest.opened = false;
    this.chest.unlocked = false;

    this.arrows = [];
    this.magicBolts = [];
    this.particles = [];
    this.floatingTexts = [];

    this.initWave(1);
  }

  initWave(w = 1) {
    this.wave = 1;
    this.swordsmen = [];
    this.sorcerers = [];
    this.skullHunters = [];
    this.greenArchers = [];
    this.victory = false;
    this.victoryTimer = 0;

    // Standoff delay before fighting begins
    this.standoffTimer = L4_CONFIG.INITIAL_STANDOFF;
    this.fightBannerTimer = 0;

    // The Three Arena Champions:
    // 1. Skull Hunter (Skeleton - 20 HP) at x = 480
    // 2. Ghoul Swordsman (Betal - 20 HP) at x = 630
    // 3. Green Archer (Archer - 18 HP) at x = 740
    this.skullHunters.push(new SkullHunter(480, L4_CONFIG.FLOOR_Y, 'skull_1'));
    this.swordsmen.push(new GhoulSwordsman(630, L4_CONFIG.FLOOR_Y, 'swordsman_1'));
    this.greenArchers.push(new GreenArcher(740, L4_CONFIG.FLOOR_Y, 'green_1'));
    this.showToast('CHAPTER 4: THE CELESTIAL ARENA - FIGHT!');
  }

  spawnVictoryFireworks() {
    for (let burst = 0; burst < 3; burst++) {
      const bx = 320 + Math.random() * 384;
      const by = 200 + Math.random() * 200;
      const palette = ['#ffd700', '#ff3b30', '#00e5ff', '#a855f7', '#34c759', '#ff9500'];
      const color = palette[Math.floor(Math.random() * palette.length)];
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const speed = 40 + Math.random() * 110;
        this.particles.push({
          x: bx,
          y: by,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 20,
          life: 0.7 + Math.random() * 0.6,
          maxLife: 1.3,
          size: 2.5 + Math.random() * 3,
          color
        });
      }
    }
  }

  spawnArrow(x, y, vx, vy, damage, type) {
    this.arrows.push(new ArenaArrow(x, y, vx, vy, damage, type));
  }

  spawnMagicBolt(x, y, tx, ty) {
    this.magicBolts.push(new MagicBolt(x, y, tx, ty, L4_CONFIG.SORCERER_DAMAGE));
  }

  showToast(text) {
    this.toastText = text;
    this.toastTimer = 2.8;
  }

  addFloatingText(x, y, text, color, size) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, size));
  }

  spawnSparks(x, y, count = 10, color = '#ffd700') {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 110;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 20,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        size: 2.2 + Math.random() * 2,
        color
      });
    }
  }

  approach(curr, target, step) {
    if (curr < target) return Math.min(curr + step, target);
    if (curr > target) return Math.max(curr - step, target);
    return target;
  }

  checkPlatformLanding(prevY, currY, x, dropping = false, isDivine = false) {
    let best = null;
    let bestDist = Infinity;

    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) continue;
      if (plat.oneWay && dropping) continue;
      if (x < plat.x1 - 10 || x > plat.x2 + 10) continue;

      const platY = plat.y;
      const isFallingOnto = (prevY <= platY + 16 && currY >= platY - 8);
      const isSteppingDown = (Math.abs(currY - platY) <= 26 && Math.abs(prevY - platY) <= 34);

      if (isFallingOnto || isSteppingDown) {
        const d = Math.abs(currY - platY);
        if (d < bestDist) {
          bestDist = d;
          best = { id: plat.id, y: platY, oneWay: plat.oneWay };
        }
      }
    }
    return best;
  }

  isOnPlatform(x, y, isDivine = false) {
    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) continue;
      if (x >= plat.x1 - 10 && x <= plat.x2 + 10) {
        if (Math.abs(y - plat.y) <= 12) return true;
      }
    }
    return false;
  }

  resolvePitWallCollision(x, y) {
    // Keep characters strictly within the circular arena floor
    return Math.max(L4_CONFIG.CIRCLE_LEFT, Math.min(x, L4_CONFIG.CIRCLE_RIGHT));
  }

  update(playerX, playerY, dt, isDivine, player) {
    // Standoff countdown timer
    let inStandoff = false;
    if (this.standoffTimer > 0) {
      this.standoffTimer -= dt;
      if (this.standoffTimer <= 0) {
        this.standoffTimer = 0;
        this.fightBannerTimer = 1.6; // Show 'ENGAGE!' for 1.6s
      }
      inStandoff = true;
    } else if (this.fightBannerTimer > 0) {
      this.fightBannerTimer -= dt;
    }

    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.cameraShake > 0) this.cameraShake -= dt * 6;
    this.chest.glowPulse += dt * 3.5;

    // 1. Update Ghoul Swordsmen
    for (let i = this.swordsmen.length - 1; i >= 0; i--) {
      const sw = this.swordsmen[i];
      sw.update(dt, player, this, inStandoff);

      // Player melee whip strike
      if (sw.alive && player && player.isAttacking && sw.hitCooldown <= 0) {
        const dist = Math.hypot(player.x - sw.x, (player.y - 25) - (sw.y - 35));
        if (dist <= 70 && player.claimSwingHit(sw)) {
          const dmg = player.swordDamage;
          sw.takeDamage(dmg, player.x);
          this.addFloatingText(sw.x, sw.y - 65, `-${dmg}`, isDivine ? '#ffd700' : '#ffffff', 14);
          this.spawnSparks(sw.x, sw.y - 35, 12, isDivine ? '#ffd700' : '#ff3344');
          if (!sw.alive) this.kills++;
        }
      }

      if (sw.canBeRemoved) this.swordsmen.splice(i, 1);
    }

    // 2. Update Ghoul Sorcerers
    for (let i = this.sorcerers.length - 1; i >= 0; i--) {
      const sc = this.sorcerers[i];
      sc.update(dt, player, this, inStandoff);

      if (sc.alive && player && player.isAttacking && sc.hitCooldown <= 0) {
        const dist = Math.hypot(player.x - sc.x, (player.y - 25) - (sc.y - 35));
        if (dist <= 70 && player.claimSwingHit(sc)) {
          const dmg = player.swordDamage;
          sc.takeDamage(dmg, player.x);
          this.addFloatingText(sc.x, sc.y - 65, `-${dmg}`, isDivine ? '#ffd700' : '#ba55d3', 14);
          this.spawnSparks(sc.x, sc.y - 35, 12, '#ba55d3');
          if (!sc.alive) this.kills++;
        }
      }

      if (sc.canBeRemoved) this.sorcerers.splice(i, 1);
    }

    // 3. Update Skull Hunters
    for (let i = this.skullHunters.length - 1; i >= 0; i--) {
      const sh = this.skullHunters[i];
      sh.update(dt, player, this, inStandoff);

      if (sh.alive && player && player.isAttacking && sh.hitCooldown <= 0) {
        const dist = Math.hypot(player.x - sh.x, (player.y - 25) - (sh.y - 35));
        if (dist <= 70 && player.claimSwingHit(sh)) {
          const dmg = player.swordDamage;
          sh.takeDamage(dmg, player.x);
          this.addFloatingText(sh.x, sh.y - 65, `-${dmg}`, isDivine ? '#ffd700' : '#e67e22', 14);
          this.spawnSparks(sh.x, sh.y - 35, 12, '#e67e22');
          if (!sh.alive) this.kills++;
        }
      }

      if (sh.canBeRemoved) this.skullHunters.splice(i, 1);
    }

    // 4. Update Green Archers
    for (let i = this.greenArchers.length - 1; i >= 0; i--) {
      const ga = this.greenArchers[i];
      ga.update(dt, player, this, inStandoff);

      if (ga.alive && player && player.isAttacking && ga.hitCooldown <= 0) {
        const dist = Math.hypot(player.x - ga.x, (player.y - 25) - (ga.y - 35));
        if (dist <= 70 && player.claimSwingHit(ga)) {
          const dmg = player.swordDamage;
          ga.takeDamage(dmg, player.x);
          this.addFloatingText(ga.x, ga.y - 65, `-${dmg}`, isDivine ? '#ffd700' : '#2ecc71', 14);
          this.spawnSparks(ga.x, ga.y - 35, 12, '#2ecc71');
          if (!ga.alive) this.kills++;
        }
      }

      if (ga.canBeRemoved) this.greenArchers.splice(i, 1);
    }

    // 5. Update Projectiles
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      this.arrows[i].update(dt, player, this);
      if (!this.arrows[i].alive) this.arrows.splice(i, 1);
    }

    for (let i = this.magicBolts.length - 1; i >= 0; i--) {
      this.magicBolts[i].update(dt, player, this);
      if (!this.magicBolts[i].alive) this.magicBolts.splice(i, 1);
    }

    // 6. Update Floating Text & Particles
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(dt);
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 7. Check Victory Condition (All 3 Villains Defeated)
    const livingVillains =
      this.swordsmen.filter(s => s.alive).length +
      this.sorcerers.filter(s => s.alive).length +
      this.skullHunters.filter(s => s.alive).length +
      this.greenArchers.filter(s => s.alive).length;

    if (livingVillains === 0) {
      if (!this.victory) {
        this.victory = true;
        this.victoryTimer = 0;
        this.chest.unlocked = true;
        this.chest.opened = true;
        this.showToast('YOU WON! YOU HAVE DEFEATED ALL REALMS OF DARK POWERS!');
        this.spawnVictoryFireworks();
      } else {
        this.victoryTimer += dt;
        if (Math.random() < 0.20) {
          this.spawnVictoryFireworks();
        }
      }
    }
  }

  getNearbyInteractable(px, py) {
    if (this.chest.unlocked && !this.chest.opened) {
      const dist = Math.hypot(px - this.chest.x, py - this.chest.y);
      if (dist < 56) {
        return {
          type: 'arena_chest',
          x: this.chest.x,
          y: this.chest.y - 20,
          label: 'OPEN CELESTIAL CHEST',
          title: 'CELESTIAL CHEST CONQUERED',
          text: 'You have vanquished all champions of the arena! The ancient celestial relics bestow their eternal blessing upon you.'
        };
      }
    }
    return null;
  }

  checkLevelComplete(px, py) {
    return Boolean(this.victory && this.victoryTimer >= 2.5);
  }

  clearDialoguePending() {}

  interact(px, py, player, engine) {
    const item = this.getNearbyInteractable(px, py);
    if (!item) return false;

    if (item.type === 'chest' && !this.chest.opened) {
      this.chest.opened = true;
      this.spawnSparks(this.chest.x, this.chest.y - 20, 50, '#ffd700');
      this.showToast('YOU HAVE CONQUERED THE CELESTIAL ARENA!');
      if (engine && engine.triggerLevelComplete) {
        setTimeout(() => engine.triggerLevelComplete(), 900);
      }
      return true;
    }
    return false;
  }

  renderBackground(ctx, isDivine = false, player = null) {
    // 1. Draw Clean Arena Background (No blue bubbles!)
    if (this.arenaImg && this.arenaImg.complete) {
      ctx.drawImage(this.arenaImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#10141e';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Render Chest on Dais
    this.renderChest(ctx);

    // 3. Render Villains (Image 2 Ghoul, Image 3 Skull Hunter, Image 4 Green Archer)
    for (const sw of this.swordsmen) sw.render(ctx, this.ghoulImg);
    for (const sc of this.sorcerers) sc.render(ctx, this.ghoulImg);
    for (const sh of this.skullHunters) sh.render(ctx, this.skullHunterImg);
    for (const ga of this.greenArchers) ga.render(ctx, this.greenArcherImg);

    // 4. Render Projectiles
    for (const arrow of this.arrows) arrow.render(ctx);
    for (const bolt of this.magicBolts) bolt.render(ctx);

    // 5. Render Particles
    for (const p of this.particles) {
      ctx.save();
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Render Floating Combat Text
    for (const ft of this.floatingTexts) ft.render(ctx);

    // 7. Render Standoff Banner / Fight Announcer
    this.renderStandoffBanner(ctx);

    // 8. Render HUD Wave / Status Indicator
    this.renderWaveHud(ctx);
  }

  render(ctx) {
    this.renderBackground(ctx);
  }

  renderChest(ctx) {
    ctx.save();
    const cx = this.chest.x;
    const cy = this.chest.y;

    if (this.chest.unlocked && !this.chest.opened) {
      const glow = (Math.sin(this.chest.glowPulse) + 1) * 0.5;
      const grad = ctx.createRadialGradient(cx, cy - 10, 4, cx, cy - 10, 36);
      grad.addColorStop(0, `rgba(255, 215, 0, ${0.4 + glow * 0.4})`);
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chest Body
    ctx.fillStyle = '#4a2c11';
    ctx.fillRect(cx - 16, cy - 18, 32, 18);

    // Chest Trim & Lock
    ctx.fillStyle = this.chest.unlocked ? '#ffd700' : '#888888';
    ctx.fillRect(cx - 16, cy - 18, 32, 4);
    ctx.fillRect(cx - 4, cy - 12, 8, 8);

    if (this.chest.unlocked && !this.chest.opened) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[E] OPEN', cx, cy - 26);
    }
    ctx.restore();
  }

  renderStandoffBanner(ctx) {
    if (this.victory) {
      ctx.save();
      const pulse = 1.0 + 0.04 * Math.sin(this.victoryTimer * 5);
      ctx.translate(this.width / 2, 95);
      ctx.scale(pulse, pulse);

      // Ornate Gold & Dark Plaque
      ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
      ctx.fillRect(-290, -42, 580, 84);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffd700';
      ctx.strokeRect(-290, -42, 580, 84);

      // Inner gold trim
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-286, -38, 572, 76);

      // Gold Title: YOU WON!
      ctx.font = "900 32px 'Cinzel', serif";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.fillText('YOU WON!', 0, -4);

      // Subtitle: YOU HAVE DEFEATED ALL REALMS OF DARK POWERS
      ctx.font = "bold 13px 'Cinzel', serif";
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 8;
      ctx.fillText('YOU HAVE DEFEATED ALL REALMS OF DARK POWERS', 0, 24);

      ctx.restore();
      return;
    }

    if (this.standoffTimer > 0) {
      ctx.save();
      const secondsLeft = Math.ceil(this.standoffTimer);
      const text = `STANDOFF: ${secondsLeft}`;

      ctx.font = '900 24px \'Cinzel\', serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(this.width / 2 - 140, 68, 280, 44);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd700';
      ctx.strokeRect(this.width / 2 - 140, 68, 280, 44);

      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.fillText(text, this.width / 2, 98);
      ctx.restore();
    } else if (this.fightBannerTimer > 0) {
      ctx.save();
      const alpha = Math.min(1.0, this.fightBannerTimer / 1.0);
      ctx.globalAlpha = alpha;
      ctx.font = '900 32px \'Cinzel\', serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3344';
      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 16;
      ctx.fillText('ENGAGE!', this.width / 2, 102);
      ctx.restore();
    }
  }

  renderWaveHud(ctx) {
    ctx.save();
    // Top banner for wave info
    ctx.fillStyle = 'rgba(10, 15, 25, 0.7)';
    ctx.fillRect(20, 20, 220, 36);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(20, 20, 220, 36);

    ctx.font = 'bold 12px \'Cinzel\', serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    if (this.victory) {
      ctx.fillText('VICTORY: ALL REALMS DEFEATED', 32, 42);
    } else {
      ctx.fillText('CELESTIAL ARENA: 3 CHAMPIONS', 32, 42);
    }

    if (this.toastTimer > 0 && this.toastText) {
      const a = Math.min(1.0, this.toastTimer / 0.5);
      ctx.globalAlpha = a;
      ctx.font = 'bold 14px \'Cinzel\', serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(this.toastText, this.width / 2, 140);
    }
    ctx.restore();
  }
}
