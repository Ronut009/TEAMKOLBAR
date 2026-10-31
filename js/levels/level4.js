/**
 * ==========================================================================
 * GLITCHVERSE - CHAPTER 4: THE ARCHER FORT (js/levels/level4.js)
 * Rakti steps onto the long stone platform below the red fort wall. Above her the
 * parapet's arched embrasures fill with archers who rise out of the dark and
 * loose arrows down at her through every opening.
 *
 *   waves   3 waves of archers (3, 5, then all 8 embrasures)
 *   Rakti   dodges, parries arrows with the talwar, and throws the Trishul [2] up at the windows
 *   finish  when the last archer falls the Lion Throne's seal breaks: [E] claims the final relic
 *
 * Art: assets/level4/fort_bg.png (1774x887 backdrop), fort_parapet.png (arched parapet with
 * its openings cut out) and fort_parapet_back.png (the dark chamber seen through the openings).
 * ==========================================================================
 */

import { Arrow } from '../entities/archer.js';

// ---------------------------------------------------------------------------
// Geometry (world px). The backdrop is drawn at 0.8x, so the world is 1420 x 710.
// ---------------------------------------------------------------------------
const BG = { src: 'assets/level4/fort_bg.png', scale: 0.8 };
const WORLD_W = 1420;
const WORLD_H = 710;

const DAIS_Y = 514;            // top of the carved platform (where Rakti's feet rest)
const DAIS_X1 = 40;
const DAIS_X2 = 1360;
const WALK_MIN = 60;           // Rakti stays between the corner towers
const WALK_MAX = 1340;
const SPAWN = { x: 120, y: DAIS_Y };
const THRONE = { x: 1218, reach: 120 };

// The parapet strip (fort_parapet.png is 1961 x 287). plainPx / the sill are measured on that image.
const PARAPET = {
  src: 'assets/level4/fort_parapet.png',
  backSrc: 'assets/level4/fort_parapet_back.png',
  x: 152, bottom: 290, scale: 0.57, imgW: 1961, imgH: 287,
  sillPx: 201, topPx: 123,
  windowPx: [109, 429, 586, 743, 1053, 1212, 1525, 1684]   // the 8 open embrasures (the 4 belled panels stay shut)
};
PARAPET.y = PARAPET.bottom - PARAPET.imgH * PARAPET.scale;
const SILL_Y = PARAPET.y + PARAPET.sillPx * PARAPET.scale;
const WINDOWS = PARAPET.windowPx.map((px, i) => ({ id: i, x: PARAPET.x + px * PARAPET.scale, sill: SILL_Y }));

// Archer sprites are Level 2's desert archer frames at the same 0.5 scale.
const ARCHER_ART = {
  dir: 'assets/level2/archer/',
  frameW: 156, frameH: 130, anchorX: 79, anchorY: 128.5, scale: 0.5,
  pivotY: -33,               // shoulder height above the feet (the bow tilts around it)
  muzzle: [16, -38.5],       // the drawn arrow's tip when the bow is at full draw
  arrowW: 34, arrowH: 7,
  footDrop: 14               // feet sit just below the sill, hidden by the stone, so head and bow show in the opening
};

export const L4_CONFIG = {
  ARCHER_HP: 12,
  ARROW_DAMAGE: 2,
  ARROW_SPEED: 250,
  WAVES: [
    { windows: [1, 4, 6],                   stagger: 0.9, cooldown: [2.6, 3.8] },
    { windows: [0, 2, 3, 5, 7],             stagger: 0.7, cooldown: [2.4, 3.6] },
    { windows: [0, 1, 2, 3, 4, 5, 6, 7],    stagger: 0.55, cooldown: [3.0, 4.4] }
  ],
  INTRO_DELAY: 1.6,
  WAVE_BREAK: 2.4,
  FIRE_RANGE: 760            // archers only loose arrows at Rakti within this horizontal distance
};

const rand = (a, b) => a + Math.random() * (b - a);
const img = (src) => { const i = new Image(); i.src = src; return i; };
const ready = (i) => i && i.complete && i.naturalWidth > 0;

// ---------------------------------------------------------------------------
// An archer in one of the parapet's embrasures
// ---------------------------------------------------------------------------
class FortArcher {
  constructor(win) {
    this.id = `fort_${win.id}`;
    this.win = win;
    this.x = win.x;
    this.baseY = win.sill + ARCHER_ART.footDrop;
    this.y = this.baseY;
    this.hitHeight = 50;
    this.hitHalfW = 20;
    this.maxHp = L4_CONFIG.ARCHER_HP;
    this.reset();
  }

  reset() {
    this.hp = this.maxHp;
    this.alive = true;
    this.hidden = true;               // not yet risen into the window
    this.removed = false;
    this.state = 'hidden';            // hidden | rise | ready | aim | hurt | dying
    this.timer = 0;
    this.spawnDelay = Infinity;       // stays out of sight until the level summons it
    this.cooldown = 1;
    this.cooldownRange = [2.6, 3.8];
    this.frame = 0;
    this.animTimer = 0;
    this.facing = 'left';
    this.aim = 0;                     // bow tilt toward Rakti (radians, local to the facing)
    this.rise = 0;                    // 0 = crouched behind the sill, 1 = standing in the opening
    this.fade = 1;
    this.hitFlash = 0;
    this.hitCooldown = 0;
    this.sparks = [];
  }

  /** Queue this archer to rise after `delay` seconds. */
  summon(delay, cooldownRange) {
    this.reset();
    this.spawnDelay = delay;
    this.cooldownRange = cooldownRange;
    this.state = 'hidden';
  }

  /** Trishul hit (the player calls this on every target in its path). Returns true when it kills. */
  takeHit(damage, fromX, level = null) {
    if (!this.alive || this.hidden || this.hitCooldown > 0) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.hitFlash = 0.25;
    this.hitCooldown = 0.3;
    this.burst(10);
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dying';
      this.timer = 0;
      this.frame = 0;
      if (level) level.registerKill(this);
      return true;
    }
    this.state = 'hurt';
    this.timer = 0.32;
    return false;
  }

  burst(n) {
    for (let i = 0; i < n; i++) {
      this.sparks.push({
        x: this.x + (Math.random() - 0.5) * 22, y: this.baseY - 36 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 80,
        life: 0.4, maxLife: 0.4, size: 2 + Math.random() * 2.2,
        color: Math.random() > 0.4 ? '#ffd700' : '#ff2244'
      });
    }
  }

  fire(player, level) {
    const dir = this.facing === 'left' ? -1 : 1;
    const ox = this.x + dir * ARCHER_ART.muzzle[0];
    const oy = this.baseY + ARCHER_ART.muzzle[1] - (1 - this.rise) * 30;
    const arrow = new Arrow(ox, oy, this);
    arrow.width = ARCHER_ART.arrowW;
    arrow.height = ARCHER_ART.arrowH;
    arrow.damage = L4_CONFIG.ARROW_DAMAGE;
    const tx = player ? player.x : ox + dir * 100;
    const ty = player ? player.y - 25 : oy + 100;
    arrow.release(L4_CONFIG.ARROW_SPEED, Math.atan2(ty - oy, tx - ox));
    level.arrows.push(arrow);
    level.shake(0.1);
    level.burst(ox, oy, 6, ['#ffd700', '#ff9d3a', '#fff1b0'], 70, 0.3);
  }

  update(dt, player, level, paused) {
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt;
      if (p.life <= 0) this.sparks.splice(i, 1);
    }
    if (this.state === 'dying') {
      this.timer += dt;
      this.rise = Math.max(0, 1 - this.timer / 1.3);
      this.fade = Math.max(0, 1 - this.timer / 1.3);
      if (this.timer >= 1.3) this.removed = true;
      return;
    }
    if (this.removed || paused) return;

    if (player) {
      this.facing = player.x < this.x ? 'left' : 'right';
      const dx = Math.abs(player.x - this.x);
      const dy = (player.y - 25) - (this.baseY - 38);
      this.aim += (Math.max(-0.2, Math.min(0.75, Math.atan2(dy, Math.max(60, dx)))) - this.aim) * Math.min(1, dt * 6);
    }

    switch (this.state) {
      case 'hidden':
        this.spawnDelay -= dt;
        if (this.spawnDelay <= 0) {
          this.state = 'rise';
          this.timer = 0;
          this.hidden = false;
          level.burst(this.x, this.win.sill - 12, 10, ['#6b2a14', '#a24a24', '#ffb86b'], 50, 0.5);
        }
        break;
      case 'rise':
        this.timer += dt;
        this.rise = Math.min(1, this.timer / 0.8);
        if (this.rise >= 1) {
          this.state = 'ready';
          this.cooldown = rand(0.4, 1.2);
        }
        break;
      case 'ready': {
        this.animTimer += dt;
        const inRange = player && !player.isDead && Math.abs(player.x - this.x) <= L4_CONFIG.FIRE_RANGE;
        this.cooldown -= dt;
        if (this.cooldown <= 0 && inRange) {
          this.state = 'aim';
          this.frame = 0;
          this.animTimer = 0;
        }
        break;
      }
      case 'aim':
        this.animTimer += dt;
        if (this.animTimer >= 0.12) {
          this.animTimer = 0;
          this.frame++;
          if (this.frame === 4) this.fire(player, level);
          if (this.frame >= 6) {
            this.state = 'ready';
            this.frame = 0;
            this.cooldown = rand(this.cooldownRange[0], this.cooldownRange[1]);
          }
        }
        break;
      case 'hurt':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'ready';
          this.cooldown = rand(0.8, 1.6);
        }
        break;
    }
  }

  render(ctx, art) {
    if (this.hidden || this.removed) return;
    let frameImg;
    if (this.state === 'dying') {
      frameImg = art.die[Math.min(2, Math.floor(this.timer / 0.35))];
    } else if (this.state === 'hurt') {
      frameImg = art.hurt[Math.floor(this.timer * 10) % 2];
    } else if (this.state === 'aim') {
      frameImg = art.aim[Math.min(5, this.frame)];
    } else {
      frameImg = art.idle[Math.floor(this.animTimer * 4) % art.idle.length];
    }
    if (!ready(frameImg)) return;

    const dir = this.facing === 'left' ? -1 : 1;
    const y = this.baseY + (1 - this.rise) * 36;      // crouched below the sill until risen
    ctx.save();
    ctx.globalAlpha = this.fade;
    ctx.translate(this.x, y);
    ctx.scale(dir, 1);
    if (this.state !== 'dying' && this.state !== 'hurt') {
      ctx.translate(0, ARCHER_ART.pivotY);
      ctx.rotate(this.aim);
      ctx.translate(0, -ARCHER_ART.pivotY);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameImg, -ARCHER_ART.anchorX * ARCHER_ART.scale, -ARCHER_ART.anchorY * ARCHER_ART.scale,
      ARCHER_ART.frameW * ARCHER_ART.scale, ARCHER_ART.frameH * ARCHER_ART.scale);
    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, this.hitFlash * 4) * 0.7;
      ctx.drawImage(frameImg, -ARCHER_ART.anchorX * ARCHER_ART.scale, -ARCHER_ART.anchorY * ARCHER_ART.scale,
        ARCHER_ART.frameW * ARCHER_ART.scale, ARCHER_ART.frameH * ARCHER_ART.scale);
    }
    ctx.restore();

    // a warning glint in the dark opening while the bow is drawn
    if (this.state === 'aim' && this.frame >= 1 && this.frame <= 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(this.x, this.win.sill - 28, 2, this.x, this.win.sill - 28, 26);
      g.addColorStop(0, 'rgba(255,120,60,0.45)');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(this.x - 30, this.win.sill - 58, 60, 60);
      ctx.restore();
    }
  }

  /** Small bar above the arch once Rakti has hurt this archer. */
  renderBar(ctx) {
    if (this.hidden || this.removed || !this.alive || this.hp >= this.maxHp) return;
    const w = 30, h = 4, x = this.x - w / 2, y = PARAPET.y - 6;
    ctx.save();
    ctx.fillStyle = 'rgba(20,6,4,0.85)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x, y, w * (this.hp / this.maxHp), h);
    ctx.restore();
  }

  renderSparks(ctx) {
    for (const p of this.sparks) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// The level
// ---------------------------------------------------------------------------
export class Level4 {
  constructor() {
    this.levelIndex = 4;
    this.width = WORLD_W;
    this.height = WORLD_H;
    this.deathY = 900;

    this.bgImg = img(BG.src);
    this.parapetImg = img(PARAPET.src);
    this.parapetBackImg = img(PARAPET.backSrc);
    this.arrowImg = img('assets/anims/archer_arrow.png');
    const frames = (name, n) => Array.from({ length: n }, (_, i) => img(`${ARCHER_ART.dir}${name}_${i}.png`));
    const aim = frames('aim', 6);
    this.art = {
      aim,
      idle: [aim[0], aim[0], aim[5], aim[5]],
      hurt: frames('hurt', 2),
      die: frames('die', 3)
    };

    this.platforms = [{ id: 'dais', x1: DAIS_X1, x2: DAIS_X2, y: DAIS_Y, oneWay: false }];
    this.ladders = [];
    this.archers = WINDOWS.map((w) => new FortArcher(w));

    this.cameraShake = 0;
    this.killToastText = '';
    this.killToastTimer = 0;
    this.pendingDialogue = null;
    this.reset();
  }

  /** Arriving from another level (not a death or [R]): Kali briefs Rakti once. */
  freshStart() {
    this.pendingDialogue = {
      speaker: 'kali',
      title: '⚜ THE ARCHER FORT ⚜',
      text: 'The last relic lies on the Lion Throne, Rakti, and the fort will not yield it. Every opening in that wall hides a bow. Keep moving, parry arrows with your talwar, and raise the Trishul with [2]: it flies up to the windows and will find them. Clear all three volleys and the throne is yours.'
    };
  }

  reset() {
    this.wave = 0;                  // 0 = before the first wave
    this.phase = 'intro';           // intro | wave | break | victory
    this.phaseTimer = L4_CONFIG.INTRO_DELAY;
    this.arrows = [];
    this.particles = [];
    this.kills = 0;
    this.victoryTimer = 0;
    this.unlocked = false;
    this.claimed = false;
    this.claimTimer = 0;
    this.glow = 0;
    this.cameraShake = 0;
    this.killToastTimer = 0;
    for (const a of this.archers) a.reset();
  }

  getRespawnPoint() { return { ...SPAWN }; }

  // ------------------------------------------------------------ helpers used by Arrow / Player
  isSolidPoint(x, y) {
    return y >= DAIS_Y - 2 && x >= DAIS_X1 && x <= DAIS_X2;
  }

  getDamageables() {
    return this.archers.filter((a) => a.alive && !a.hidden && !a.removed);
  }

  shake(v) { this.cameraShake = Math.max(this.cameraShake, v); }

  burst(x, y, count, colors, speed = 80, life = 0.4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: life * (0.6 + Math.random() * 0.6), maxLife: life,
        size: 1.5 + Math.random() * 2, color: colors[i % colors.length]
      });
    }
  }

  toast(text, secs = 2.4) {
    this.killToastText = text;
    this.killToastTimer = secs;
  }

  registerKill(archer) {
    this.kills++;
    const pending = this.archers.filter((a) => this.isWaveMember(a) && a.alive).length;
    this.shake(0.4);
    this.burst(archer.x, archer.baseY - 30, 18, ['#ffd700', '#ff3b30', '#fff1b0'], 110, 0.6);
    this.toast(pending > 0 ? `ARCHER DOWN  ·  ${pending} LEFT` : 'VOLLEY BROKEN', 1.8);
  }

  isWaveMember(a) {
    return this.wave > 0 && L4_CONFIG.WAVES[this.wave - 1].windows.includes(a.win.id);
  }

  startWave(n) {
    this.wave = n;
    this.phase = 'wave';
    const cfg = L4_CONFIG.WAVES[n - 1];
    for (const a of this.archers) a.reset();
    cfg.windows.forEach((id, i) => {
      // alternate sides so they do not all emerge in a row
      const order = i % 2 === 0 ? i / 2 : cfg.windows.length - 1 - (i - 1) / 2;
      this.archers[id].summon(0.4 + order * cfg.stagger, cfg.cooldown);
    });
    this.toast(`VOLLEY ${n} OF ${L4_CONFIG.WAVES.length}  ·  ${cfg.windows.length} ARCHERS`, 2.4);
    this.shake(0.35);
  }

  // ------------------------------------------------------------ platform queries (the Level API)
  checkPlatformLanding(prevY, currY, x, dropping = false) {
    for (const p of this.platforms) {
      if (p.oneWay && dropping) continue;
      if (x < p.x1 - 10 || x > p.x2 + 10) continue;
      const fallingOnto = prevY <= p.y + 16 && currY >= p.y - 8;
      const steppingDown = Math.abs(currY - p.y) <= 26 && Math.abs(prevY - p.y) <= 34;
      if (fallingOnto || steppingDown) return { id: p.id, y: p.y, oneWay: p.oneWay };
    }
    return null;
  }

  isOnPlatform(x, y) {
    return this.platforms.some((p) => x >= p.x1 - 10 && x <= p.x2 + 10 && Math.abs(y - p.y) <= 12);
  }

  resolvePitWallCollision(x) {
    return Math.max(WALK_MIN, Math.min(x, WALK_MAX));
  }

  // ------------------------------------------------------------ per-frame update
  update(playerX, playerY, dt, isDivine, player) {
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    if (this.killToastTimer > 0) this.killToastTimer -= dt;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Kali's briefing (or any dialogue) freezes the fort
    const paused = Boolean(player && player.dialogueOpen);
    if (!paused) {
      if (this.phase === 'intro') {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.startWave(1);
      } else if (this.phase === 'break') {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.startWave(this.wave + 1);
      } else if (this.phase === 'wave') {
        const alive = this.archers.some((a) => this.isWaveMember(a) && a.alive);
        if (!alive && this.wave > 0) {
          if (this.wave >= L4_CONFIG.WAVES.length) {
            this.phase = 'victory';
            this.unlocked = true;
            this.toast('THE LION THRONE IS UNSEALED', 3.2);
            this.shake(0.7);
          } else {
            this.phase = 'break';
            this.phaseTimer = L4_CONFIG.WAVE_BREAK;
          }
        }
      } else if (this.phase === 'victory') {
        this.victoryTimer += dt;
      }
    }

    for (const a of this.archers) a.update(dt, player, this, paused);

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      if (!this.arrows[i].update(dt, player, this)) this.arrows.splice(i, 1);
    }

    if (this.unlocked) {
      this.glow += dt;
      if (!this.claimed && Math.random() < 0.25) {
        this.burst(THRONE.x + rand(-26, 26), DAIS_Y - 112 + rand(-10, 10), 1, ['#ffd700', '#fff1b0'], 24, 0.9);
      }
    }
    if (this.claimed) {
      this.claimTimer += dt;
      if (Math.random() < 0.3) this.burst(THRONE.x + rand(-90, 90), DAIS_Y - rand(40, 220), 3, ['#ffd700', '#ff3b30', '#00e5ff', '#a855f7'], 120, 0.8);
    }
  }

  // ------------------------------------------------------------ interaction
  getNearbyInteractable(px, py) {
    if (Math.abs(px - THRONE.x) > THRONE.reach || Math.abs(py - DAIS_Y) > 40) return null;
    if (this.claimed) return null;
    if (!this.unlocked) {
      return {
        type: 'throne', x: THRONE.x, y: DAIS_Y - 120, prompt: '[E] EXAMINE THE THRONE',
        title: '⚜ THE LION THRONE ⚜', speaker: 'stele',
        text: 'A seal of red flame holds the throne shut. It will not break while a single archer still watches from the wall.'
      };
    }
    return {
      type: 'throne', x: THRONE.x, y: DAIS_Y - 120, prompt: '[E] CLAIM THE FINAL RELIC',
      title: '⚜ THE FOURTH RELIC ⚜', speaker: 'kali',
      text: 'The seal gutters out and the last relic rises from the lion\'s paws, warm as a held breath. Take it, Rakti. The four realms are whole again, and the fort falls silent.',
      onInteract: () => this.claimRelic()
    };
  }

  claimRelic() {
    if (this.claimed) return;
    this.claimed = true;
    this.claimTimer = 0;
    this.shake(0.9);
    this.toast('✦ THE FOUR RELICS ARE RESTORED ✦', 3.2);
    this.burst(THRONE.x, DAIS_Y - 110, 60, ['#ffd700', '#fff1b0', '#ff9d3a'], 160, 1.1);
  }

  checkLevelComplete() {
    return this.claimed && this.claimTimer >= 3.4;
  }

  clearDialoguePending() {}

  // ------------------------------------------------------------ drawing
  renderBackground(ctx) {
    if (ready(this.bgImg)) {
      ctx.drawImage(this.bgImg, 0, 0, WORLD_W, WORLD_H);
    } else {
      ctx.fillStyle = '#7a2d12';
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    }

    this.renderThroneGlow(ctx);

    // dark chambers behind the openings -> archers -> the carved parapet in front of them
    const pw = PARAPET.imgW * PARAPET.scale, ph = PARAPET.imgH * PARAPET.scale;
    if (ready(this.parapetBackImg)) ctx.drawImage(this.parapetBackImg, PARAPET.x, PARAPET.y, pw, ph);
    for (const a of this.archers) a.render(ctx, this.art);
    if (ready(this.parapetImg)) ctx.drawImage(this.parapetImg, PARAPET.x, PARAPET.y, pw, ph);

    for (const a of this.archers) a.renderBar(ctx);
    for (const a of this.archers) a.renderSparks(ctx);
    for (const arrow of this.arrows) arrow.render(ctx, this.arrowImg);

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderThroneGlow(ctx) {
    if (!this.unlocked || this.claimed && this.claimTimer > 2.5) return;
    const pulse = 0.75 + 0.25 * Math.sin(this.glow * 3.2);
    const cx = THRONE.x, cy = DAIS_Y - 95;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 150 * pulse);
    g.addColorStop(0, 'rgba(255,225,130,0.55)');
    g.addColorStop(0.5, 'rgba(255,150,60,0.22)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 170, cy - 170, 340, 340);
    if (!this.claimed) {
      // the relic hovering above the lion's paws
      const bob = Math.sin(this.glow * 2.4) * 4;
      ctx.fillStyle = '#fff6c9';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, cy - 22 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  render(ctx) {
    this.renderBackground(ctx);
  }
}
