/**
 * ==========================================================================
 * GLITCHVERSE - SUBMERGED RUINS TEMPLE MAP (js/level.js)
 * Features visual stone stepping platform (left), celestial Golden Bridge [X],
 * Ancient Lever on RIGHT TOP balcony, widened pit fall space, rising ancient pillar,
 * and Black Space Doorway (Level Complete).
 * ==========================================================================
 */

import { EnemySpriteSheet } from './enemySprites.js';

export class Level {
  constructor() {
    this.width = 1024;
    this.height = 434;
    this.levelIndex = 1;

    // Base map without bridge (mortal view)
    this.baseMapImg = new Image();
    this.baseMapLoaded = false;
    this.baseMapImg.onload = () => { this.baseMapLoaded = true; };
    this.baseMapImg.src = 'assets/temple_map_base_generated.png';
    if (this.baseMapImg.complete && this.baseMapImg.naturalWidth > 0) {
      this.baseMapLoaded = true;
    }

    // Isolated Golden Constellation Bridge overlay (manifested in Divine Form)
    this.bridgeImg = new Image();
    this.bridgeLoaded = false;
    this.bridgeImg.onload = () => { this.bridgeLoaded = true; };
    this.bridgeImg.src = 'assets/golden_bridge.png';
    if (this.bridgeImg.complete && this.bridgeImg.naturalWidth > 0) {
      this.bridgeLoaded = true;
    }

    // Fallback full artwork if needed
    this.fullMapImg = new Image();
    this.fullMapImg.src = 'assets/temple_map.png';

    // Platform definitions
    // The fall space is increased (x=430 to 690) so MC cannot jump across directly!
    this.platforms = [
      // 1. Lower Left Ground (Ends at x=430 at the edge of the widened fall)
      { id: 'floor_left', x1: 0, x2: 430, y: 368, oneWay: false },

      // 2. Lower Right Ground (Starts at x=690 past the widened fall)
      { id: 'floor_right', x1: 690, x2: 1024, y: 368, oneWay: false },

      // 3. Left Carved Stepping Platform (Visual stone ledge at y=270 to reach the upper balcony)
      { id: 'pillar_step_left', x1: 172, x2: 248, y: 270, oneWay: true },

      // (Right stepping platform tile removed as requested in Image 3!)

      // 4. Upper Left Balcony (Overgrown roof platform)
      { id: 'balcony_left', x1: 220, x2: 388, y: 172, oneWay: true },

      // 5. Upper Right Temple Balcony (Temple roof extended leftward to x=635, lever located here!)
      { id: 'balcony_right', x1: 635, x2: 1024, y: 172, oneWay: true },

      // 6. The Golden Constellation Bridge (Reduced span from x=388 to 635, active in Divine Form [X])
      { id: 'golden_bridge', x1: 388, x2: 635, y: 172, oneWay: true, divineOnly: true }
    ];

    // Pit Side Walls (Widened from x=430 to 690)
    this.pitWalls = {
      leftWallX: 430,
      rightWallX: 690,
      wallTopY: 368,
      wallBottomY: 434
    };

    // Ancient Lever on the RIGHT TOP balcony (x=785, y=172)
    // Reached by crossing the invisible golden bridge using Divine Form [X]!
    this.lever = {
      x: 785,
      y: 172,
      width: 24,
      height: 30,
      activated: false,
      handleAngle: -0.55,       // radians: negative = left-up, positive = right-down
      targetAngle: -0.55,
      radius: 46
    };

    // Ancient Stone Pillar in the center of the fall space
    this.pillar = {
      x1: 528,
      x2: 592,
      width: 64,
      y: 445,                   // Submerged below water line (y=368..434)
      targetY: 445,
      raisedY: 360,             // Raised platform level
      isRaising: false,
      isRaised: false,
      waterFoamTimer: 0
    };

    this.pillarWaterSplashes = [];
    this.cameraShake = 0;
    this.isCompleted = false;

    // Sands of Time Guidance Landmarks
    this.interactables = [
      {
        x: 100, y: 368, radius: 45,
        text: "An ancient stele carved in forgotten Sanskrit: 'The path forward lies high above the ruins. Seek the sacred lotus on the western balcony.'"
      },
      {
        id: 'sacred_lotus',
        type: 'lotus_awakening',
        x: 355, y: 172, radius: 45,
        prompt: '[E] AWAKEN LOTUS',
        speaker: 'kali',
        title: '⚜ DIVINE AWAKENING: MAA KALI ⚜',
        text: "Awaken, Rakti! I am Kali, sovereign of time and destruction. Channel my divine essence with [X] to manifest the Bridge of Constellations across the abyss. Walk boldly upon the celestial sands!"
      },
      {
        x: 511, y: 172, radius: 50,
        speaker: 'kali',
        title: '⚜ MAA KALI: CELESTIAL SIGHT ⚜',
        text: "Mortal eyes see only empty void, Rakti. Unleash your Divine Form with [X]! My celestial power will solidify the golden bridge beneath your steps so you may reach the eastern balcony mechanism."
      },
      {
        x: 740, y: 172, radius: 40,
        text: "The Upper Balcony. The ancient lever mechanism awaits ahead. Pull it to raise the pillar from the sunken abyss."
      },
      {
        x: 898, y: 368, radius: 45,
        text: "The gateway to the Sunken Catacombs. Raise the central pillar by pulling the upper balcony lever to unseal the passage."
      }
    ];

    this.spores = [];

    this.bridgeStars = [];
    this.initBridgeStars(24);

    this.bridgeSentries = [
      { x: 438, y: 148, minX: 410, maxX: 610, speed: 118, direction: 1, phase: 0 },
      { x: 602, y: 143, minX: 410, maxX: 610, speed: 154, direction: -1, phase: 2.4 }
    ];

    this.enemySprites = new EnemySpriteSheet();
    this.endSentinel = this.createEndSentinel();

    this.camera = {
      x: 0,
      y: 0,
      width: window.innerWidth || 1024,
      height: window.innerHeight || 434,
      zoom: 1.0,
      targetX: 0,
      targetY: 0,
      lerpSpeed: 6.0
    };

    this.animTime = 0;
    this.bridgeOpacity = 0.0;
  }

  initSpores(count) {
    this.spores = [];
  }

  initBridgeStars(count) {
    this.bridgeStars = [];
    const xMin = 390;
    const xMax = 633;
    const yCenter = 172;

    for (let i = 0; i < count; i++) {
      this.bridgeStars.push({
        x: xMin + Math.random() * (xMax - xMin),
        y: yCenter - 8 + Math.random() * 16,
        size: 1 + Math.random() * 2,
        twinkleSpeed: 2 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  createEndSentinel() {
    return {
      x: 824,
      y: 368,
      hp: 10,
      maxHp: 10,
      noticeRange: 132,
      attackRange: 46,
      moveSpeed: 42,
      facing: 'left',
      isMoving: false,
      attacking: false,
      attackCooldown: 0.45,
      attackAnimTimer: 0,
      attackAnimDuration: 0.72,
      attackHitApplied: false,
      attackHitAt: 0.32,
      playerAttackWasActive: false,
      hitFlash: 0,
      hurtTimer: 0,
      animTime: 0,
      dead: false
    };
  }

  /**
   * Pulls the ancient lever on the RIGHT TOP balcony, triggering screen rumble
   * and raising the stone pillar from the watery abyss.
   */
  pullLever() {
    if (this.lever.activated) return false;
    this.lever.activated = true;
    this.lever.targetAngle = 0.55;
    this.pillar.targetY = this.pillar.raisedY;
    this.pillar.isRaising = true;
    this.cameraShake = 0.85;
    return true;
  }

  reset() {
    this.lever.activated = false;
    this.lever.handleAngle = -0.55;
    this.lever.targetAngle = -0.55;
    this.pillar.y = 445;
    this.pillar.targetY = 445;
    this.pillar.isRaising = false;
    this.pillar.isRaised = false;
    this.cameraShake = 0;
    this.isCompleted = false;
    this.endSentinel = this.createEndSentinel();
    if (this.bridgeSentries && this.bridgeSentries[0]) {
      this.bridgeSentries[0].x = 438;
      this.bridgeSentries[0].direction = 1;
      this.bridgeSentries[1].x = 602;
      this.bridgeSentries[1].direction = -1;
    }
  }

  /**
   * Collision check: Given previous and current foot position,
   * returns the platform landed upon, if any.
   * Golden bridge only lands if isDivine is true!
   * Raised pillar lands once surfaced above water!
   */
  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    // Dynamic raised pillar platform
    if (this.pillar.y <= 380) {
      if (x >= this.pillar.x1 && x <= this.pillar.x2) {
        if (!droppingThrough && prevY <= this.pillar.y + 6 && currY >= this.pillar.y - 2) {
          return {
            id: 'raised_pillar',
            x1: this.pillar.x1,
            x2: this.pillar.x2,
            y: Math.round(this.pillar.y),
            oneWay: true
          };
        }
      }
    }

    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) {
        continue; // Golden bridge does not exist in mortal form!
      }

      if (x >= plat.x1 && x <= plat.x2) {
        if (plat.oneWay && droppingThrough) {
          continue;
        }

        if (prevY <= plat.y + 6 && currY >= plat.y - 2) {
          return plat;
        }
      }
    }
    return null;
  }

  /**
   * Check if foot at (x, y) is on a valid platform
   */
  isOnPlatform(x, y, isDivine = false) {
    if (this.pillar.y <= 380) {
      if (x >= this.pillar.x1 - 2 && x <= this.pillar.x2 + 2 && Math.abs(y - this.pillar.y) <= 4) {
        return {
          id: 'raised_pillar',
          x1: this.pillar.x1,
          x2: this.pillar.x2,
          y: Math.round(this.pillar.y),
          oneWay: true
        };
      }
    }

    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) {
        continue;
      }
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) {
        return plat;
      }
    }
    return null;
  }

  resolvePitWallCollision(x, y) {
    if (y > this.pitWalls.wallTopY + 2 && y <= this.pitWalls.wallBottomY) {
      // If player is on or near the raised pillar, allow standing on it without pushback
      if (this.pillar.y <= 380 && x >= this.pillar.x1 - 6 && x <= this.pillar.x2 + 6) {
        return x;
      }
      if (x < this.pitWalls.leftWallX + 8 && x > this.pitWalls.leftWallX - 10) {
        return this.pitWalls.leftWallX + 8;
      }
      if (x > this.pitWalls.rightWallX - 8 && x < this.pitWalls.rightWallX + 10) {
        return this.pitWalls.rightWallX - 8;
      }
    }
    return x;
  }

  getNearbyInteractable(px, py) {
    // 1. Check Ancient Lever on the RIGHT TOP balcony first (x=785, y=172)
    const distToLever = Math.hypot(px - this.lever.x, py - (this.lever.y - 12));
    if (distToLever <= this.lever.radius) {
      return {
        type: 'lever',
        x: this.lever.x,
        y: this.lever.y - 12,
        activated: this.lever.activated,
        prompt: this.lever.activated ? '[E] LEVER (ENGAGED)' : '[E] PULL LEVER',
        text: this.lever.activated
          ? "The ancient mechanism is engaged and the stone pillar has risen from the depths. Descend and step through the sanctum doorway to advance."
          : "The mechanism of the elders. Pull the lever [E] to summon the submerged stone pillar and unlock the passage below."
      };
    }

    // 2. Check Black Space Doorway (x=898, y=368)
    const distToDoor = Math.hypot(px - 898, py - 368);
    if (distToDoor <= 40 && !this.lever.activated) {
      return {
        type: 'doorway_locked',
        x: 898,
        y: 368,
        prompt: '[E] DOORWAY',
        text: "The sanctum entrance is barred by deep shadows. Cross the celestial bridge [X] to the right balcony and pull the lever to open it."
      };
    }

    // 3. Check Other Landmarks
    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.x, py - item.y);
      if (dist <= item.radius) {
        return {
          type: item.type || 'inspection',
          id: item.id || null,
          x: item.x,
          y: item.y,
          prompt: item.prompt || '[E] EXAMINE',
          text: item.text
        };
      }
    }
    return null;
  }

  /**
   * Checks if player has walked into the black space doorway (x=885..918, y=368)
   * to complete the level, requiring the lever on the right top to be activated first!
   */
  checkLevelComplete(px, py) {
    if (this.isCompleted) return false;
    if (this.lever.activated && px >= 885 && px <= 918 && py >= 355 && py <= 380) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;

    // Decay camera shake
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.0);
    }

    // Animate Lever handle angle
    this.lever.handleAngle += (this.lever.targetAngle - this.lever.handleAngle) * Math.min(1.0, dt * 8.0);

    // Animate Rising Pillar
    if (this.pillar.isRaising) {
      const diff = this.pillar.targetY - this.pillar.y;
      if (Math.abs(diff) > 0.4) {
        this.pillar.y += diff * Math.min(1.0, dt * 2.5);
        this.cameraShake = Math.max(this.cameraShake, 0.35);

        // Water splash bubbles & spray around y=368
        this.pillar.waterFoamTimer += dt;
        if (this.pillar.waterFoamTimer > 0.05) {
          this.pillar.waterFoamTimer = 0;
          this.spawnPillarSplash();
        }
      } else {
        this.pillar.y = this.pillar.targetY;
        this.pillar.isRaising = false;
        this.pillar.isRaised = true;
      }
    }

    // Update pillar water splashes
    for (let i = this.pillarWaterSplashes.length - 1; i >= 0; i--) {
      const sp = this.pillarWaterSplashes[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 400 * dt; // gravity on water droplets
      sp.life -= dt;
      if (sp.life <= 0) {
        this.pillarWaterSplashes.splice(i, 1);
      }
    }

    // Smooth bridge opacity fade in/out
    const targetBridgeOpacity = isDivine ? 1.0 : 0.0;
    this.bridgeOpacity += (targetBridgeOpacity - this.bridgeOpacity) * Math.min(1.0, dt * 6.0);

    if (isDivine && this.bridgeSentries) {
      for (const sentry of this.bridgeSentries) {
        sentry.x += sentry.speed * sentry.direction * dt;
        if (sentry.x >= sentry.maxX || sentry.x <= sentry.minX) {
          sentry.direction *= -1;
          sentry.x = Math.max(sentry.minX, Math.min(sentry.x, sentry.maxX));
        }
        sentry.phase += dt * 4.5;
      }
    }

    if (player && isDivine && this.bridgeOpacity > 0.55 && Math.abs(playerY - 172) < 30 && this.bridgeSentries) {
      for (const sentry of this.bridgeSentries) {
        const sentryY = sentry.y + Math.sin(sentry.phase) * 5;
        if (Math.abs(playerX - sentry.x) < 15 && Math.abs((playerY - 28) - sentryY) < 18) {
          player.takeDamage(1, Math.sign(playerX - sentry.x || 1) * 125, -165);
        }
      }
    }

    this.updateEndSentinel(playerX, playerY, dt, player);
  }

  updateEndSentinel(playerX, playerY, dt, player) {
    const enemy = this.endSentinel;
    if (!enemy) return;

    enemy.animTime += dt;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
    if (enemy.dead) return;

    const dx = playerX - enemy.x;
    const closeVertically = Math.abs(playerY - enemy.y) < 48;
    const canPlayerHit = player?.isAttacking
      && !enemy.playerAttackWasActive
      && Math.abs(dx) < 58
      && closeVertically
      && (dx === 0 || (dx < 0 && player.facing === 'left') || (dx > 0 && player.facing !== 'left'));

    if (canPlayerHit) {
      enemy.hp = Math.max(0, enemy.hp - (player.swordDamage || 4));
      enemy.hitFlash = 0.22;
      enemy.hurtTimer = 0.3;
      if (enemy.hp === 0) {
        enemy.dead = true;
        enemy.attacking = false;
        enemy.isMoving = false;
        return;
      }
    }
    enemy.playerAttackWasActive = Boolean(player?.isAttacking);

    if (enemy.attacking) {
      enemy.attackAnimTimer += dt;
      if (!enemy.attackHitApplied && enemy.attackAnimTimer >= enemy.attackHitAt) {
        enemy.attackHitApplied = true;
        if (player && Math.abs(dx) <= enemy.attackRange + 12 && closeVertically && player.invulnerableTimer <= 0) {
          player.takeDamage(3, playerX < enemy.x ? -160 : 160, -110);
          this.cameraShake = Math.max(this.cameraShake, 0.22);
        }
      }
      if (enemy.attackAnimTimer >= enemy.attackAnimDuration) {
        enemy.attacking = false;
        enemy.attackAnimTimer = 0;
      }
      return;
    }

    enemy.isMoving = false;
    if (!player || !closeVertically || Math.abs(dx) > enemy.noticeRange) return;

    enemy.facing = dx < 0 ? 'left' : 'right';
    if (Math.abs(dx) > enemy.attackRange) {
      const travel = Math.min(Math.abs(dx) - enemy.attackRange, enemy.moveSpeed * dt);
      enemy.x += Math.sign(dx) * travel;
      enemy.isMoving = travel > 0;
      return;
    }

    if (enemy.attackCooldown <= 0) {
      enemy.attacking = true;
      enemy.attackAnimTimer = 0;
      enemy.attackHitApplied = false;
      enemy.attackCooldown = 1.5;
    }
  }

  renderEndSentinel(ctx) {
    const enemy = this.endSentinel;
    if (!enemy) return;

    const spriteDrawn = this.enemySprites.render(ctx, enemy, { width: 66, height: 82 });
    if (!spriteDrawn) {
      ctx.save();
      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1bd' : '#514957';
      ctx.fillRect(enemy.x - 12, enemy.y - 48, 24, 45);
      ctx.fillStyle = '#b9afb9';
      ctx.fillRect(enemy.x - 9, enemy.y - 63, 18, 17);
      ctx.restore();
    }

    if (!enemy.dead) {
      const barX = Math.round(enemy.x - 23);
      const barY = Math.round(enemy.y - 91);
      ctx.fillStyle = 'rgba(13, 10, 16, 0.86)';
      ctx.fillRect(barX, barY, 46, 6);
      ctx.fillStyle = '#472833';
      ctx.fillRect(barX + 1, barY + 1, 44, 4);
      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1bd' : '#b54b55';
      ctx.fillRect(barX + 1, barY + 1, 44 * (enemy.hp / enemy.maxHp), 4);
    }
  }

  spawnPillarSplash() {
    for (let i = 0; i < 4; i++) {
      const side = Math.random() > 0.5 ? this.pillar.x1 : this.pillar.x2;
      this.pillarWaterSplashes.push({
        x: side + (Math.random() - 0.5) * 12,
        y: Math.min(368, Math.round(this.pillar.y) + 16) + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 60,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? '#caa375' : (Math.random() > 0.3 ? '#8f643e' : '#f0d3ae')
      });
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderBackground(ctx, isDivine = false) {
    ctx.save();

    // 1. Draw Base Map (Mortal ruins with open chasm)
    if (this.baseMapLoaded) {
      ctx.drawImage(this.baseMapImg, 0, 0, this.width, this.height);
    } else if (this.fullMapImg.complete) {
      ctx.drawImage(this.fullMapImg, 0, 0, this.width, this.height);
    }

    // 2. Render Widened Fall Space if using legacy base map
    if (!this.baseMapLoaded || !this.baseMapImg.src.includes('generated')) {
      this.renderFallSpace(ctx);
    }

    // 3. Render Rising Ancient Pillar (Inside the fall space)
    this.renderRisingPillar(ctx);

    // 4. Render Left Stepping Platform (Only left step at y=270, right step removed!)
    this.renderSteppingPlatforms(ctx);

    // 5. Render Ancient Lever on the RIGHT TOP Balcony (x=785, y=172)
    this.renderLever(ctx);

    // 6. Render God-Rays
    this.renderGodRays(ctx);

    // 7. Render Golden Constellation Bridge (ONLY visible when Divine Form [X] is active)
    this.renderGoldenBridge(ctx, isDivine);

    // Bridge guardians add motion and a readable danger cue to the crossing
    this.renderBridgeSentries(ctx, isDivine);

    // 8. Render Sanctum Black Space Doorway Glow & Embers
    this.renderSanctumExit(ctx);

    // 9. Render Blue Lotus Auras
    this.renderLotusAuras(ctx);

    // End-of-level melee sentinel, using the supplied walk / strike / hurt sheet.
    this.renderEndSentinel(ctx);

    ctx.restore();
  }

  /**
   * Renders the widened fall space (x=430 to 690, y=368 to 434) as a
   * dry subterranean stone chasm pit with weathered cliff drop-offs and deep shadowy void.
   */
  renderFallSpace(ctx) {
    ctx.save();

    const fx1 = 430;
    const fx2 = 690;
    const fw = fx2 - fx1;
    const fy = 368;
    const fh = 434 - fy;

    // 1. Deep subterranean chasm abyss gradient (pitch black / dark void depth)
    const chasmGrad = ctx.createLinearGradient(fx1, fy, fx1, fy + fh);
    chasmGrad.addColorStop(0, '#100b17');
    chasmGrad.addColorStop(0.35, '#09060d');
    chasmGrad.addColorStop(0.75, '#040206');
    chasmGrad.addColorStop(1, '#000000');
    ctx.fillStyle = chasmGrad;
    ctx.fillRect(fx1, fy, fw, fh);

    // 2. Subterranean ancient collapsed ruin blocks in the dark depth
    ctx.fillStyle = '#1c140e';
    ctx.fillRect(fx1 + 18, fy + 26, 68, fh - 26);
    ctx.fillStyle = '#261b13';
    ctx.fillRect(fx1 + 22, fy + 28, 60, 4);

    ctx.fillStyle = '#18100a';
    ctx.fillRect(fx2 - 82, fy + 20, 65, fh - 20);
    ctx.fillStyle = '#241810';
    ctx.fillRect(fx2 - 78, fy + 22, 58, 4);

    // 3. Left & Right cliff walls descending into the chasm abyss
    const leftWallGrad = ctx.createLinearGradient(fx1 - 4, fy, fx1 + 12, fy);
    leftWallGrad.addColorStop(0, '#4a3725');
    leftWallGrad.addColorStop(0.4, '#302216');
    leftWallGrad.addColorStop(1, 'rgba(8, 5, 12, 0.95)');
    ctx.fillStyle = leftWallGrad;
    ctx.fillRect(fx1 - 2, fy, 14, fh);

    // Left cliff edge stone highlight & weathered shelf
    ctx.fillStyle = '#caa375';
    ctx.fillRect(fx1 - 3, fy, 4, 2);
    ctx.fillStyle = '#22140a';
    ctx.fillRect(fx1 + 1, fy, 1, fh);

    const rightWallGrad = ctx.createLinearGradient(fx2 - 12, fy, fx2 + 4, fy);
    rightWallGrad.addColorStop(0, 'rgba(8, 5, 12, 0.95)');
    rightWallGrad.addColorStop(0.6, '#302216');
    rightWallGrad.addColorStop(1, '#4a3725');
    ctx.fillStyle = rightWallGrad;
    ctx.fillRect(fx2 - 12, fy, 14, fh);

    // Right cliff edge stone highlight & weathered shelf
    ctx.fillStyle = '#caa375';
    ctx.fillRect(fx2 - 1, fy, 4, 2);
    ctx.fillStyle = '#22140a';
    ctx.fillRect(fx2 - 2, fy, 1, fh);

    ctx.restore();
  }

  /**
   * Renders the Ancient Stone Pillar in the center of the fall space.
   * Starts submerged below water (y=445) and rises to y=360 when the lever is pulled.
   * Styled after classical Indian temple pillar architecture (Image 2 reference):
   * flared bracket capital with sculpted relief frieze, stepped cornices with dentil mouldings,
   * multi-faceted shaft with carved guardian/dancer figurine niches, intricate jali lattice work,
   * central floral chakra medallion, bulbous blooming lotus cushion (kalasha), and stepped plinth base.
   */
  renderRisingPillar(ctx) {
    if (this.pillar.y > 440) return; // Completely submerged

    ctx.save();
    const px = this.pillar.x1;
    const py = Math.round(this.pillar.y);
    const pw = this.pillar.width;
    const bottomY = 434;

    // ------------------------------------------------------------------------
    // 0. Ambient Drop Shadow Behind Pillar Structure
    // ------------------------------------------------------------------------
    ctx.fillStyle = 'rgba(8, 6, 14, 0.75)';
    ctx.fillRect(px - 3, py + 4, pw + 6, Math.max(0, bottomY - py));

    // ------------------------------------------------------------------------
    // 1. Plinth Base & Submerged Footing (py + 64 to bottomY)
    // ------------------------------------------------------------------------
    if (py + 64 < bottomY) {
      const baseTopY = py + 64;
      const baseH = bottomY - baseTopY;

      // Heavy foundational sandstone plinth block (adhisthana)
      const plinthGrad = ctx.createLinearGradient(px - 4, baseTopY, px + pw + 4, baseTopY);
      plinthGrad.addColorStop(0, '#2d1c10');
      plinthGrad.addColorStop(0.2, '#5a3d24');
      plinthGrad.addColorStop(0.5, '#7a5433');
      plinthGrad.addColorStop(0.8, '#523720');
      plinthGrad.addColorStop(1, '#22140a');
      ctx.fillStyle = plinthGrad;
      ctx.fillRect(px - 4, baseTopY, pw + 8, baseH);

      // Stepped plinth moulding bands
      ctx.fillStyle = '#22140b';
      ctx.fillRect(px - 4, baseTopY, pw + 8, 2);
      ctx.fillStyle = '#9e7349';
      ctx.fillRect(px - 3, baseTopY + 2, pw + 6, 1.5);
      ctx.fillStyle = '#22140b';
      ctx.fillRect(px - 2, baseTopY + 5, pw + 4, 1.5);

      // Horizontal relief cross-frieze along the base
      for (let bx = px; bx <= px + pw - 6; bx += 8) {
        ctx.fillStyle = '#1c1007';
        ctx.fillRect(bx, baseTopY + 7, 5, 4);
        ctx.fillStyle = '#b38656';
        ctx.fillRect(bx + 1, baseTopY + 8, 3, 2);
        ctx.fillStyle = '#edd1aa';
        ctx.fillRect(bx + 1, baseTopY + 8, 1, 1);
      }
    }

    // ------------------------------------------------------------------------
    // 2. Bulbous Inverted Lotus Cushion (Kalasha / Kumbha, py + 52 to py + 64)
    // ------------------------------------------------------------------------
    if (py + 52 < bottomY) {
      const lotusY = py + 52;
      const lotusH = Math.min(12, bottomY - lotusY);

      // Flared rounded lotus bulb body
      const lotusGrad = ctx.createLinearGradient(px - 2, lotusY, px + pw + 2, lotusY);
      lotusGrad.addColorStop(0, '#362113');
      lotusGrad.addColorStop(0.25, '#7e5635');
      lotusGrad.addColorStop(0.5, '#aa7e52');
      lotusGrad.addColorStop(0.75, '#7e5635');
      lotusGrad.addColorStop(1, '#28170c');
      ctx.fillStyle = lotusGrad;
      ctx.fillRect(px - 2, lotusY, pw + 4, lotusH);

      // Upper & lower constriction rings
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(px, lotusY, pw, 1.5);
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(px - 2, lotusY + lotusH - 1.5, pw + 4, 1.5);

      // Distinct carved outward-flaring lotus petals (7 sculpted petals across)
      const numPetals = 7;
      const petalW = (pw + 2) / numPetals;
      for (let i = 0; i < numPetals; i++) {
        const ptx = px - 1 + i * petalW;
        // Deep carved shadow channel between petals
        ctx.fillStyle = '#1a0e06';
        ctx.fillRect(ptx, lotusY + 1.5, 1.2, lotusH - 3);

        // Petal contour
        ctx.fillStyle = '#8f643e';
        ctx.fillRect(ptx + 1.2, lotusY + 1.5, petalW - 1.2, lotusH - 3);

        // Sunlit convex central petal ridge
        ctx.fillStyle = '#dfba8e';
        ctx.fillRect(ptx + petalW * 0.4, lotusY + 2, 1.5, lotusH - 4);
        ctx.fillStyle = '#f8e4cb';
        ctx.fillRect(ptx + petalW * 0.4, lotusY + 2, 0.8, 1.5);
      }

      // Central hanging floral garland / tassel relief
      ctx.fillStyle = '#1e1107';
      ctx.fillRect(px + pw / 2 - 2, lotusY + 2, 4, lotusH - 3);
      ctx.fillStyle = '#edd1aa';
      ctx.fillRect(px + pw / 2 - 1, lotusY + 3, 2, 2);
      ctx.fillRect(px + pw / 2 - 0.5, lotusY + 6, 1, 3);
    }

    // ------------------------------------------------------------------------
    // 3. Main Pillar Shaft (py + 18 to py + 52)
    // ------------------------------------------------------------------------
    if (py + 18 < bottomY) {
      const shaftY = py + 18;
      const shaftH = Math.min(34, bottomY - shaftY);
      const shaftX = px + 2;
      const shaftW = pw - 4;

      // Base sandstone shaft background
      const shaftGrad = ctx.createLinearGradient(shaftX, shaftY, shaftX + shaftW, shaftY);
      shaftGrad.addColorStop(0, '#2c190d');
      shaftGrad.addColorStop(0.15, '#6a4729');
      shaftGrad.addColorStop(0.5, '#996f45');
      shaftGrad.addColorStop(0.85, '#6a4729');
      shaftGrad.addColorStop(1, '#22140a');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(shaftX, shaftY, shaftW, shaftH);

      // --- Left & Right Side Pilasters with Carved Niche Figures (Mithuna / Dancers) ---
      // Left Pilaster Niche (shaftX to shaftX + 8)
      ctx.fillStyle = '#1e1007';
      ctx.fillRect(shaftX, shaftY, 8, shaftH);
      ctx.fillStyle = '#7a5332';
      ctx.fillRect(shaftX + 1, shaftY, 6, shaftH);
      // Outer vertical stone border
      ctx.fillStyle = '#c59a68';
      ctx.fillRect(shaftX, shaftY, 1, shaftH);

      // Left sculpted figurine relief silhouette
      if (shaftH > 10) {
        ctx.fillStyle = '#deb789';
        ctx.fillRect(shaftX + 3, shaftY + 4, 2.5, 2.5);  // Head
        ctx.fillRect(shaftX + 2.5, shaftY + 7, 3.5, 5);  // Torso / S-curve posture
        ctx.fillRect(shaftX + 2, shaftY + 12, 2, 7);     // Legs
        ctx.fillRect(shaftX + 4.5, shaftY + 12, 1.5, 6);
        ctx.fillStyle = '#f5dfbd';
        ctx.fillRect(shaftX + 3.5, shaftY + 4, 1, 1);    // Crown highlight
      }

      // Right Pilaster Niche (shaftX + shaftW - 8 to shaftX + shaftW)
      ctx.fillStyle = '#1e1007';
      ctx.fillRect(shaftX + shaftW - 8, shaftY, 8, shaftH);
      ctx.fillStyle = '#7a5332';
      ctx.fillRect(shaftX + shaftW - 7, shaftY, 6, shaftH);
      // Right vertical stone border
      ctx.fillStyle = '#c59a68';
      ctx.fillRect(shaftX + shaftW - 1, shaftY, 1, shaftH);

      // Right sculpted figurine relief silhouette
      if (shaftH > 10) {
        ctx.fillStyle = '#deb789';
        ctx.fillRect(shaftX + shaftW - 6, shaftY + 4, 2.5, 2.5); // Head
        ctx.fillRect(shaftX + shaftW - 6.5, shaftY + 7, 3.5, 5); // Torso
        ctx.fillRect(shaftX + shaftW - 6.5, shaftY + 12, 2, 7);  // Legs
        ctx.fillRect(shaftX + shaftW - 4, shaftY + 12, 1.5, 6);
        ctx.fillStyle = '#f5dfbd';
        ctx.fillRect(shaftX + shaftW - 5.5, shaftY + 4, 1, 1);   // Crown highlight
      }

      // --- Central Shaft Panel (intricate carved stone relief) ---
      const midX = shaftX + 8;
      const midW = shaftW - 16; // width 36

      // Deep recessed fluted borders flanking the center
      ctx.fillStyle = '#1b0e06';
      ctx.fillRect(midX, shaftY, 1.5, shaftH);
      ctx.fillRect(midX + midW - 1.5, shaftY, 1.5, shaftH);

      // Section A: Carved Stone Lattice (Jali / Reticulated Diamond Relief, shaftY to shaftY + 14)
      if (shaftH > 2) {
        const jaliH = Math.min(14, shaftH - 2);
        ctx.fillStyle = '#26150b';
        ctx.fillRect(midX + 2, shaftY + 1, midW - 4, jaliH);

        // Diamond lattice pattern
        for (let jx = midX + 4; jx < midX + midW - 4; jx += 5) {
          for (let jy = shaftY + 2; jy < shaftY + jaliH; jy += 4) {
            // Dark perforated holes
            ctx.fillStyle = '#140b04';
            ctx.fillRect(jx, jy, 2, 2);
            // Raised chiseled stone borders
            ctx.fillStyle = '#b88957';
            ctx.fillRect(jx - 1, jy + 1, 1, 1);
            ctx.fillRect(jx + 2, jy + 1, 1, 1);
            // Top highlight fleck
            ctx.fillStyle = '#edd1aa';
            ctx.fillRect(jx, jy - 0.5, 1.5, 0.8);
          }
        }
      }

      // Section B: Central Horizontal Frieze & Carved Chakra Medallion (shaftY + 14 to shaftY + 22)
      if (shaftH > 16) {
        const friezeY = shaftY + 14;
        // Horizontal shadow grooves
        ctx.fillStyle = '#1b0e06';
        ctx.fillRect(midX + 1, friezeY, midW - 2, 1.5);
        ctx.fillStyle = '#1b0e06';
        ctx.fillRect(midX + 1, friezeY + 7, midW - 2, 1.5);

        // Frieze stone body
        ctx.fillStyle = '#8f643d';
        ctx.fillRect(midX + 1, friezeY + 1.5, midW - 2, 5.5);

        // Central Carved Floral Chakra Rosette
        const chakraX = midX + midW / 2;
        const chakraY = friezeY + 4.2;

        // Outer circular carved groove
        ctx.fillStyle = '#1a0d06';
        ctx.beginPath();
        ctx.arc(chakraX, chakraY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Chiseled stone ring
        ctx.fillStyle = '#b98c5c';
        ctx.beginPath();
        ctx.arc(chakraX, chakraY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Dark center pit
        ctx.fillStyle = '#221309';
        ctx.beginPath();
        ctx.arc(chakraX, chakraY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Raised sunlit stone stud
        ctx.fillStyle = '#f5dfbd';
        ctx.fillRect(chakraX - 0.8, chakraY - 0.8, 1.6, 1.6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(chakraX - 0.5, chakraY - 0.5, 0.8, 0.8);

        // Flanking floral scroll curls (patralata)
        ctx.strokeStyle = '#dfba8e';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(chakraX - 4, chakraY);
        ctx.quadraticCurveTo(chakraX - 8, chakraY - 2, chakraX - 12, chakraY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(chakraX + 4, chakraY);
        ctx.quadraticCurveTo(chakraX + 8, chakraY - 2, chakraX + 12, chakraY);
        ctx.stroke();
      }

      // Section C: Lower Fluted Vertical Relief Pilasters (shaftY + 23 to shaftY + 34)
      if (shaftH > 23) {
        const lowY = shaftY + 23;
        const lowH = shaftH - 23;
        for (let fx = midX + 3; fx <= midX + midW - 5; fx += 5) {
          // Flute channel shadow
          ctx.fillStyle = '#1d0f06';
          ctx.fillRect(fx, lowY, 1.5, lowH);
          // Flute ridge highlight
          ctx.fillStyle = '#aa7e50';
          ctx.fillRect(fx + 1.5, lowY, 2.5, lowH);
          ctx.fillStyle = '#e4be93';
          ctx.fillRect(fx + 1.5, lowY, 1, lowH);
        }
      }
    }

    // ------------------------------------------------------------------------
    // 4. Stepped Neck & Downward Lotus Petal Moulding (py + 10 to py + 18)
    // ------------------------------------------------------------------------
    const neckY = py + 10;
    // Stepped tier 1
    ctx.fillStyle = '#201207';
    ctx.fillRect(px, neckY, pw, 1.5);
    ctx.fillStyle = '#9e7247';
    ctx.fillRect(px, neckY + 1.5, pw, 2.5);

    // Carved downward-pointing lotus petals (padma)
    for (let lx = px + 2; lx < px + pw - 2; lx += 6) {
      ctx.fillStyle = '#1c0f06';
      ctx.fillRect(lx, neckY + 4, 1, 4);
      ctx.fillStyle = '#b78959';
      ctx.fillRect(lx + 1, neckY + 4, 4, 3);
      // Petal tip
      ctx.fillStyle = '#f0d2ab';
      ctx.fillRect(lx + 2.5, neckY + 7, 1.5, 1);
    }
    // Neck lower rim
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(px + 1, neckY + 7.5, pw - 2, 1);

    // ------------------------------------------------------------------------
    // 5. Flared Bracket Capital with Sculpted Relief Frieze (py to py + 10)
    // ------------------------------------------------------------------------
    // Under-capital corbel brackets spreading outward (px - 3 to px + pw + 3)
    ctx.fillStyle = '#22140b';
    ctx.fillRect(px - 3, py + 5, pw + 6, 5);
    const bracketGrad = ctx.createLinearGradient(px - 3, py + 5, px + pw + 3, py + 5);
    bracketGrad.addColorStop(0, '#754f2f');
    bracketGrad.addColorStop(0.25, '#a67b50');
    bracketGrad.addColorStop(0.5, '#c79c6d');
    bracketGrad.addColorStop(0.75, '#a67b50');
    bracketGrad.addColorStop(1, '#654225');
    ctx.fillStyle = bracketGrad;
    ctx.fillRect(px - 2, py + 5, pw + 4, 4.5);

    // Sculpted narrative frieze along the capital face (warriors, procession, figures)
    for (let fx = px; fx <= px + pw - 6; fx += 7) {
      // Carved recess
      ctx.fillStyle = '#1d1007';
      ctx.fillRect(fx, py + 5.5, 5.5, 4);
      // Carved figurine silhouette
      ctx.fillStyle = '#e5be92';
      ctx.fillRect(fx + 1.5, py + 5.5, 2, 2);   // Head / Helmet
      ctx.fillRect(fx + 1, py + 7.5, 3.5, 2);   // Torso / Steed
      ctx.fillStyle = '#fff0d6';
      ctx.fillRect(fx + 2, py + 5.5, 1, 1);     // Sunlit highlight
    }

    // Carved dentil / bead chain underneath the top cornice lip (py + 3.5)
    ctx.fillStyle = '#1b0e06';
    ctx.fillRect(px - 2, py + 3.5, pw + 4, 1.5);
    for (let dx = px - 1; dx <= px + pw; dx += 3.5) {
      ctx.fillStyle = '#deb789';
      ctx.fillRect(dx, py + 3.8, 1.8, 1.2);
      ctx.fillStyle = '#1a0e06';
      ctx.fillRect(dx + 1.8, py + 3.8, 0.8, 1.2);
    }

    // ------------------------------------------------------------------------
    // 6. Top Walking Surface & Weathered Cornice (py to py + 3.5)
    // ------------------------------------------------------------------------
    // Platform top slab
    const topGrad = ctx.createLinearGradient(px - 2, py, px - 2, py + 3.5);
    topGrad.addColorStop(0, '#caa274');
    topGrad.addColorStop(0.4, '#e0b889');
    topGrad.addColorStop(1, '#8f643e');
    ctx.fillStyle = topGrad;
    ctx.fillRect(px - 2, py, pw + 4, 3.5);

    // Weathered sunlit stone highlights along top edge
    ctx.fillStyle = '#f5dfbd';
    ctx.fillRect(px - 1, py, pw + 2, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 6, py, 16, 1);
    ctx.fillRect(px + 28, py, 14, 1);
    ctx.fillRect(px + 46, py, 12, 1);

    // Chiseled weathering chips on the top edge
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(px + 14, py, 2, 1);
    ctx.fillRect(px + 38, py, 1.5, 1);

    // Subtle ancient temple lichen in micro-crevices (replaces plain green!)
    ctx.fillStyle = 'rgba(100, 112, 65, 0.55)';
    ctx.fillRect(px + 2, py + 1, 6, 1);
    ctx.fillRect(px + 22, py + 1, 5, 1);
    ctx.fillRect(px + 44, py + 1, 7, 1);

    // ------------------------------------------------------------------------
    // 7. Ancient Surya Sun Rune Carving (Capital Face Center)
    // ------------------------------------------------------------------------
    const runeX = px + pw / 2;
    const runeY = py + 7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const runePulse = this.pillar.isRaised ? (0.65 + 0.35 * Math.sin(this.animTime * 3.5)) : 0.3;

    // Outer divine golden sun aura
    const sunGlow = ctx.createRadialGradient(runeX, runeY, 1, runeX, runeY, 9);
    sunGlow.addColorStop(0, `rgba(255, 220, 110, ${runePulse * 0.7})`);
    sunGlow.addColorStop(0.5, `rgba(255, 180, 40, ${runePulse * 0.3})`);
    sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(runeX, runeY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Central Surya Sun Disc
    ctx.fillStyle = `rgba(255, 235, 150, ${runePulse})`;
    ctx.beginPath();
    ctx.arc(runeX, runeY, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Radiating chiseled sun rays
    ctx.strokeStyle = `rgba(255, 225, 120, ${runePulse * 0.85})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (this.animTime * 0.4);
      ctx.beginPath();
      ctx.moveTo(runeX + Math.cos(a) * 3.2, runeY + Math.sin(a) * 3.2);
      ctx.lineTo(runeX + Math.cos(a) * 5.8, runeY + Math.sin(a) * 5.8);
      ctx.stroke();
    }
    ctx.restore();

    // ------------------------------------------------------------------------
    // 8. Crumbling Stone Dust & Sandstone Debris When Rising
    // ------------------------------------------------------------------------
    if (this.pillar.isRaising || this.pillar.waterFoamTimer > 0) {
      for (const sp of this.pillarWaterSplashes) {
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Renders the visual carved sandstone stepping platform at y=270 on the LEFT ONLY.
   * Styled after ancient Indian temple stone relief carvings (Image 2 reference):
   * weathered multi-tiered cornices, supporting stone corbels, deep chiseled grooves,
   * carved floral rosettes (patralata/chakras), central ornamental relief bracket,
   * guardian niche pilasters, and authentic warm sandstone patina.
   */
  renderSteppingPlatforms(ctx) {
    ctx.save();

    // Stepping Platform Bounds: x1=172, x2=248, y=270 (w=76, h=16)
    const lx = 172;
    const ly = 270;
    const lw = 76;
    const lh = 16;

    // ------------------------------------------------------------------------
    // 1. Ambient Drop Shadow underneath the entire ledge structure
    // ------------------------------------------------------------------------
    ctx.fillStyle = 'rgba(10, 7, 16, 0.72)';
    ctx.fillRect(lx - 2, ly + lh + 1, lw + 4, 8);
    ctx.fillStyle = 'rgba(6, 4, 10, 0.45)';
    ctx.fillRect(lx + 4, ly + lh + 9, lw - 8, 4);

    // ------------------------------------------------------------------------
    // 2. Supporting Carved Stone Corbels (Left & Right brackets anchoring into ruined pillars)
    // ------------------------------------------------------------------------
    // Left Corbel (x=172 to 183)
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(lx, ly + lh, 11, 4);
    ctx.fillRect(lx, ly + lh + 4, 7, 4);
    ctx.fillRect(lx, ly + lh + 8, 4, 3);

    // Left Corbel Highlights & Chisel Relief
    ctx.fillStyle = '#7a5435';
    ctx.fillRect(lx + 1, ly + lh, 9, 1);
    ctx.fillStyle = '#9e7149';
    ctx.fillRect(lx + 10, ly + lh, 1, 3);
    ctx.fillRect(lx + 6, ly + lh + 4, 1, 3);
    ctx.fillRect(lx + 3, ly + lh + 8, 1, 2);
    ctx.fillStyle = '#22140a';
    ctx.fillRect(lx + 4, ly + lh + 1, 1, 6);

    // Right Corbel (x=237 to 248)
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(lx + lw - 11, ly + lh, 11, 4);
    ctx.fillRect(lx + lw - 7, ly + lh + 4, 7, 4);
    ctx.fillRect(lx + lw - 4, ly + lh + 8, 4, 3);

    // Right Corbel Highlights & Chisel Relief
    ctx.fillStyle = '#7a5435';
    ctx.fillRect(lx + lw - 10, ly + lh, 9, 1);
    ctx.fillStyle = '#9e7149';
    ctx.fillRect(lx + lw - 11, ly + lh, 1, 3);
    ctx.fillRect(lx + lw - 7, ly + lh + 4, 1, 3);
    ctx.fillRect(lx + lw - 4, ly + lh + 8, 1, 2);
    ctx.fillStyle = '#22140a';
    ctx.fillRect(lx + lw - 5, ly + lh + 1, 1, 6);

    // ------------------------------------------------------------------------
    // 3. Sandstone Main Body Base Gradient (Rich warm weathered stone)
    // ------------------------------------------------------------------------
    const stoneGrad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
    stoneGrad.addColorStop(0, '#caa375');    // Weathered warm sandstone top
    stoneGrad.addColorStop(0.18, '#ab8054'); // Upper shelf midtone
    stoneGrad.addColorStop(0.35, '#4a2f1b'); // Deep carved shadow groove
    stoneGrad.addColorStop(0.45, '#996f45'); // Carved frieze face
    stoneGrad.addColorStop(0.72, '#7a5434'); // Lower relief band
    stoneGrad.addColorStop(0.88, '#442a17'); // Lower shadow groove
    stoneGrad.addColorStop(1, '#2c190d');    // Under-ledge base shadow
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(lx, ly, lw, lh);

    // Subtle stone block variation (slight vertical tonal variance)
    ctx.fillStyle = 'rgba(235, 195, 150, 0.08)';
    ctx.fillRect(lx + 18, ly + 2, 22, lh - 3);
    ctx.fillStyle = 'rgba(30, 16, 8, 0.12)';
    ctx.fillRect(lx + 48, ly + 2, 18, lh - 3);

    // ------------------------------------------------------------------------
    // 4. Lower Carved Moulding (Padmapitha / Lotus Bead Frieze, y=281..285)
    // ------------------------------------------------------------------------
    // Deep horizontal shadow line above lower moulding
    ctx.fillStyle = '#22140a';
    ctx.fillRect(lx, ly + 11, lw, 1.5);

    // Lower shelf highlight rim
    ctx.fillStyle = '#b5895b';
    ctx.fillRect(lx, ly + 12.5, lw, 1);

    // Carved bead / rosette chain (manimala) along lower moulding
    for (let bx = lx + 5; bx <= lx + lw - 6; bx += 6) {
      // Carved dark recess hollow
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(bx - 1.5, ly + 13, 3, 2.5);
      // Raised carved stone bead
      ctx.fillStyle = '#a67b4e';
      ctx.fillRect(bx - 1, ly + 13.5, 2, 1.5);
      // Sunlit stone highlight dot
      ctx.fillStyle = '#edd1aa';
      ctx.fillRect(bx - 1, ly + 13.5, 1, 1);
    }

    // ------------------------------------------------------------------------
    // 5. Deep Horizontal Chisel Flute Groove (separating tiers, y=277..278)
    // ------------------------------------------------------------------------
    ctx.fillStyle = '#1b0e06';
    ctx.fillRect(lx, ly + 7, lw, 2);
    ctx.fillStyle = '#c79968';
    ctx.fillRect(lx, ly + 9, lw, 0.8);

    // ------------------------------------------------------------------------
    // 6. Central Frieze: Floral Rosettes & Scrollwork (Image 2 Motifs, y=272..277)
    // ------------------------------------------------------------------------
    // Helper to draw an ancient carved temple rosette / medallion
    const drawTempleRosette = (cx, cy) => {
      // Outer circular carved stone groove
      ctx.fillStyle = '#201208';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Outer stone rim highlight
      ctx.fillStyle = '#8f653d';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Inner hollow
      ctx.fillStyle = '#2c190d';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Center raised stone floral stud
      ctx.fillStyle = '#dfb88a';
      ctx.fillRect(cx - 0.7, cy - 0.7, 1.4, 1.4);

      // Micro sunlit highlight dot
      ctx.fillStyle = '#fff0d6';
      ctx.fillRect(cx - 0.7, cy - 0.7, 0.8, 0.8);
    };

    // Flowing carved scrollwork vine (patralata) connecting rosettes
    ctx.strokeStyle = '#6d482b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx + 8, ly + 5);
    ctx.bezierCurveTo(lx + 18, ly + 3.5, lx + 22, ly + 6.5, lx + 32, ly + 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lx + 44, ly + 5);
    ctx.bezierCurveTo(lx + 54, ly + 3.5, lx + 58, ly + 6.5, lx + 68, ly + 5);
    ctx.stroke();

    // Carved rosettes across the frieze
    drawTempleRosette(lx + 14, ly + 5);
    drawTempleRosette(lx + 25, ly + 5);
    drawTempleRosette(lx + 51, ly + 5);
    drawTempleRosette(lx + 62, ly + 5);

    // ------------------------------------------------------------------------
    // 7. Left & Right Architectural Guardian/Figurine Niches (End pilasters)
    // ------------------------------------------------------------------------
    // Left Niche (lx + 2 to lx + 7)
    ctx.fillStyle = '#24140b';
    ctx.fillRect(lx + 2, ly + 3, 5, 8);
    ctx.fillStyle = '#8b613a';
    ctx.fillRect(lx + 3, ly + 3.5, 3, 7);
    // Weathered figurine silhouette relief
    ctx.fillStyle = '#d2a878';
    ctx.fillRect(lx + 4, ly + 4.5, 1.5, 1.5); // Head
    ctx.fillRect(lx + 3.5, ly + 6.5, 2, 3);    // Torso/Drape
    ctx.fillStyle = '#edd2ae';
    ctx.fillRect(lx + 2, ly + 3, 1, 8);      // Left stone frame rim

    // Right Niche (lx + lw - 7 to lx + lw - 2)
    ctx.fillStyle = '#24140b';
    ctx.fillRect(lx + lw - 7, ly + 3, 5, 8);
    ctx.fillStyle = '#8b613a';
    ctx.fillRect(lx + lw - 6, ly + 3.5, 3, 7);
    // Weathered figurine silhouette relief
    ctx.fillStyle = '#d2a878';
    ctx.fillRect(lx + lw - 5.5, ly + 4.5, 1.5, 1.5); // Head
    ctx.fillRect(lx + lw - 5.5, ly + 6.5, 2, 3);      // Torso
    ctx.fillStyle = '#edd2ae';
    ctx.fillRect(lx + lw - 3, ly + 3, 1, 8);        // Right stone frame rim

    // ------------------------------------------------------------------------
    // 8. Central Ornate Carved Relief Bracket (The prominent T-bracket from Image 2)
    // ------------------------------------------------------------------------
    const cx = lx + lw / 2; // Center at x=210
    const bw = 9;
    const bx = cx - bw / 2;

    // Projecting stone relief bracket base
    ctx.fillStyle = '#201208';
    ctx.fillRect(bx - 1, ly + 2, bw + 2, 10);
    const bracketGrad = ctx.createLinearGradient(bx, ly + 2, bx, ly + 12);
    bracketGrad.addColorStop(0, '#d8b082');
    bracketGrad.addColorStop(0.5, '#9e7146');
    bracketGrad.addColorStop(1, '#4e331e');
    ctx.fillStyle = bracketGrad;
    ctx.fillRect(bx, ly + 2, bw, 10);

    // Stepped side mouldings on bracket
    ctx.fillStyle = '#b78959';
    ctx.fillRect(bx, ly + 2, 1.5, 10);
    ctx.fillRect(bx + bw - 1.5, ly + 2, 1.5, 10);

    // Intricate vertical floral vine relief inside the bracket
    ctx.fillStyle = '#28170c';
    ctx.fillRect(cx - 0.7, ly + 3, 1.4, 8);
    // Alternating chiseled stone leaf curls
    ctx.fillStyle = '#f0d1aa';
    ctx.fillRect(cx - 2, ly + 3.5, 1.5, 1);
    ctx.fillRect(cx + 0.8, ly + 5, 1.5, 1);
    ctx.fillRect(cx - 2, ly + 6.5, 1.5, 1);
    ctx.fillRect(cx + 0.8, ly + 8, 1.5, 1);
    ctx.fillRect(cx - 1, ly + 9.5, 2, 1.2);

    // ------------------------------------------------------------------------
    // 9. Top Cornice & Weathered Cap (Walking surface at ly=270)
    // ------------------------------------------------------------------------
    // Weathered sandstone cap surface with aged natural variation
    ctx.fillStyle = '#9e7349';
    ctx.fillRect(lx, ly, lw, 2);

    // Sunlit chiseled stone highlights along top edge
    ctx.fillStyle = '#edd1aa';
    ctx.fillRect(lx + 1, ly, lw - 2, 1);
    ctx.fillStyle = '#fbf0dc';
    ctx.fillRect(lx + 8, ly, 18, 1);
    ctx.fillRect(lx + 32, ly, 14, 1);
    ctx.fillRect(lx + 52, ly, 16, 1);

    // Authentic stone weathering chips & fissures along edge
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(lx + 17, ly, 1.5, 1);
    ctx.fillRect(lx + 36, ly, 2, 1);
    ctx.fillRect(lx + 59, ly, 1.5, 1);

    // Micro-dentils underneath the top cornice lip (y=272)
    ctx.fillStyle = '#24140b';
    ctx.fillRect(lx, ly + 2, lw, 1);
    for (let dx = lx + 3; dx < lx + lw - 3; dx += 3) {
      ctx.fillStyle = '#c59a6b';
      ctx.fillRect(dx, ly + 2, 1.2, 1);
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(dx + 1.2, ly + 2, 0.8, 1);
    }

    // Subtle ancient temple lichen/moss in microscopic crevices (NOT modern flat green!)
    ctx.fillStyle = 'rgba(105, 115, 68, 0.55)';
    ctx.fillRect(lx + 4, ly + 1, 6, 1);
    ctx.fillRect(lx + 27, ly + 1, 4, 1);
    ctx.fillRect(lx + 46, ly + 1, 5, 1);
    ctx.fillRect(lx + 67, ly + 1, 4, 1);

    // Hairline ancient stone cracks cutting diagonally across the slab
    ctx.strokeStyle = '#23140a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx + 22, ly + 1);
    ctx.lineTo(lx + 24, ly + 6);
    ctx.lineTo(lx + 23, ly + 11);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(238, 210, 174, 0.4)';
    ctx.beginPath();
    ctx.moveTo(lx + 23, ly + 1);
    ctx.lineTo(lx + 25, ly + 6);
    ctx.stroke();

    ctx.strokeStyle = '#23140a';
    ctx.beginPath();
    ctx.moveTo(lx + 56, ly + 2);
    ctx.lineTo(lx + 58, ly + 8);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders the Ancient Lever on the RIGHT TOP balcony (x=785, y=172).
   * Styled after the ancient Indian ceremonial implement / stylus (Image 3 reference):
   * stepped carved sandstone and bronze gear pedestal with lotus mouldings,
   * tapering faceted bronze shank, raised collar ring, stamped floral rosette cluster,
   * broad curved blade finial with embossed bead dots along the outer spine,
   * engraved ancient Brahmi/Grantha inscriptions that glow upon activation,
   * and a polished beaked curved tip.
   */
  renderLever(ctx) {
    ctx.save();

    const lx = this.lever.x;
    const ly = this.lever.y;

    // ------------------------------------------------------------------------
    // 1. Ancient Temple Pedestal Base (Stepped Sandstone & Bronze Housing)
    // ------------------------------------------------------------------------
    const baseW = 22;
    const baseH = 14;
    const pivotY = ly - baseH + 1; // Pivot at y=159

    // Ambient drop shadow beneath pedestal
    ctx.fillStyle = 'rgba(8, 6, 14, 0.7)';
    ctx.fillRect(lx - baseW / 2 - 2, ly - 2, baseW + 4, 5);

    // Stepped Sandstone Plinth (Adhisthana)
    // Tier 1 (Lower step)
    const plinthGrad = ctx.createLinearGradient(lx - baseW / 2, ly - 4, lx + baseW / 2, ly);
    plinthGrad.addColorStop(0, '#563d26');
    plinthGrad.addColorStop(0.5, '#8c6440');
    plinthGrad.addColorStop(1, '#442d1a');
    ctx.fillStyle = plinthGrad;
    ctx.fillRect(lx - baseW / 2, ly - 4, baseW, 4);
    ctx.fillStyle = '#caa375';
    ctx.fillRect(lx - baseW / 2 + 1, ly - 4, baseW - 2, 1); // Sunlit rim

    // Tier 2 (Carved Lotus Moulding / Padmapitha, ly - 8 to ly - 4)
    ctx.fillStyle = '#22140a';
    ctx.fillRect(lx - baseW / 2 + 2, ly - 8, baseW - 4, 4);
    for (let px = lx - baseW / 2 + 3; px <= lx + baseW / 2 - 5; px += 4) {
      // Carved upward lotus petal
      ctx.fillStyle = '#aa7e52';
      ctx.fillRect(px, ly - 7.5, 3, 3.5);
      ctx.fillStyle = '#edd1aa';
      ctx.fillRect(px + 1, ly - 7.5, 1, 1); // Petal tip highlight
      ctx.fillStyle = '#1c1007';
      ctx.fillRect(px + 3, ly - 8, 1, 4);   // Shadow slit
    }

    // Heavy Antique Cast-Bronze Gear Housing (ly - 14 to ly - 8)
    const housingW = 14;
    const housingGrad = ctx.createLinearGradient(lx - housingW / 2, ly - 14, lx + housingW / 2, ly - 8);
    housingGrad.addColorStop(0, '#42371e');
    housingGrad.addColorStop(0.3, '#7d6a3b');
    housingGrad.addColorStop(0.7, '#a89358');
    housingGrad.addColorStop(1, '#3b311a');
    ctx.fillStyle = housingGrad;
    ctx.fillRect(lx - housingW / 2, ly - 14, housingW, 6);

    // Weathered bronze rivets & border moulding
    ctx.fillStyle = '#dfcb91';
    ctx.fillRect(lx - housingW / 2 + 1, ly - 14, housingW - 2, 1);
    ctx.fillStyle = '#1f1a0e';
    ctx.fillRect(lx - housingW / 2, ly - 9, housingW, 1);
    ctx.fillStyle = '#e8d9a4';
    ctx.fillRect(lx - housingW / 2 + 1, ly - 12.5, 1.2, 1.2); // Left rivet
    ctx.fillRect(lx + housingW / 2 - 2.2, ly - 12.5, 1.2, 1.2); // Right rivet

    // Verdigris patina touches on bronze base
    ctx.fillStyle = 'rgba(74, 115, 95, 0.45)';
    ctx.fillRect(lx - 5, ly - 11, 2, 2);
    ctx.fillRect(lx + 3, ly - 10, 2, 1.5);

    // Central Circular Pivot Gear Hub (Radius 4.5px around pivotY)
    ctx.fillStyle = '#1c160b';
    ctx.beginPath();
    ctx.arc(lx, pivotY, 4.6, 0, Math.PI * 2);
    ctx.fill();

    const gearGrad = ctx.createRadialGradient(lx, pivotY, 1, lx, pivotY, 4.5);
    gearGrad.addColorStop(0, '#d1bf82');
    gearGrad.addColorStop(0.7, '#8f7e4a');
    gearGrad.addColorStop(1, '#3d341b');
    ctx.fillStyle = gearGrad;
    ctx.beginPath();
    ctx.arc(lx, pivotY, 4.0, 0, Math.PI * 2);
    ctx.fill();

    // Radiating chiseled gear notches
    ctx.strokeStyle = '#221b0e';
    ctx.lineWidth = 0.8;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(lx + Math.cos(a) * 2.5, pivotY + Math.sin(a) * 2.5);
      ctx.lineTo(lx + Math.cos(a) * 4.2, pivotY + Math.sin(a) * 4.2);
      ctx.stroke();
    }

    // Central Gemstone / Sacred Pivot Core
    ctx.save();
    if (this.lever.activated) {
      ctx.globalCompositeOperation = 'lighter';
      const gemPulse = 0.7 + 0.3 * Math.sin(this.animTime * 4.0);
      ctx.fillStyle = `rgba(255, 215, 0, ${gemPulse})`;
      ctx.beginPath();
      ctx.arc(lx, pivotY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx - 0.7, pivotY - 0.7, 1.4, 1.4);
    } else {
      // Deep sacred ruby / amber core when inactive
      ctx.fillStyle = '#8f2334';
      ctx.beginPath();
      ctx.arc(lx, pivotY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7b92';
      ctx.fillRect(lx - 0.6, pivotY - 0.6, 1.2, 1.2);
    }
    ctx.restore();

    // ------------------------------------------------------------------------
    // 2. Ancient Indian Curved Stylus / Blade Lever Arm (Image 3)
    // ------------------------------------------------------------------------
    ctx.save();
    ctx.translate(lx, pivotY);
    ctx.rotate(this.lever.handleAngle);

    // --- A. Tapering Faceted Bronze Shank (y = 0 to y = -17) ---
    // Shaft shadow facet (right side)
    ctx.fillStyle = '#4a3f23';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1.3, 0);
    ctx.lineTo(2.0, -17);
    ctx.lineTo(0, -17);
    ctx.closePath();
    ctx.fill();

    // Shaft sunlit facet (left side)
    const shankGrad = ctx.createLinearGradient(-1.8, 0, 0, 0);
    shankGrad.addColorStop(0, '#a5925a');
    shankGrad.addColorStop(0.5, '#d8c48a');
    shankGrad.addColorStop(1, '#f5e9bd');
    ctx.fillStyle = shankGrad;
    ctx.beginPath();
    ctx.moveTo(-1.3, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, -17);
    ctx.lineTo(-2.0, -17);
    ctx.closePath();
    ctx.fill();

    // Sharp central ridge highlight along shank
    ctx.strokeStyle = '#fff5cf';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, -16.5);
    ctx.stroke();

    // --- B. Raised Collar Moulding Ring (y = -17 to y = -18.5) ---
    ctx.fillStyle = '#2b2311';
    ctx.fillRect(-2.5, -18.5, 5.0, 1.5);
    ctx.fillStyle = '#ecdba2';
    ctx.fillRect(-2.3, -18.5, 4.6, 0.8);
    ctx.fillStyle = '#8f7e4a';
    ctx.fillRect(-2.3, -17.7, 4.6, 0.7);

    // --- C. Stamped Floral Rosette / Star Cluster (y = -19.5) ---
    // Cluster of 6 embossed dots seen at the base of the blade in Image 3
    ctx.fillStyle = '#2b2311';
    ctx.fillRect(-1.5, -20.5, 3.0, 2.0); // Recessed background
    ctx.fillStyle = '#f7ebc2';
    // Center dot
    ctx.fillRect(-0.4, -19.6, 0.8, 0.8);
    // Surrounding petal dots
    ctx.fillRect(-1.2, -19.6, 0.6, 0.6);
    ctx.fillRect(0.6, -19.6, 0.6, 0.6);
    ctx.fillRect(-0.4, -20.4, 0.6, 0.6);
    ctx.fillRect(-0.4, -18.8, 0.6, 0.6);

    // --- D. Broad Curved Blade Finial (y = -18.5 to y = -31) ---
    // The iconic forward-curving broad blade with pointed beak tip from Image 3
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-2.4, -18.5);                          // Base left
    ctx.bezierCurveTo(-4.2, -22, -4.8, -26, -3.2, -29); // Outer curved spine sweep
    ctx.quadraticCurveTo(-1.5, -31.5, 2.5, -31.0);    // Curved top crest rounding to beak tip
    ctx.lineTo(2.8, -30.2);                           // Sharp beaked hook point
    ctx.quadraticCurveTo(0.6, -26, 1.2, -21.5);       // Inner concave sweep
    ctx.lineTo(2.2, -18.5);                           // Base right
    ctx.closePath();

    // Blade metallic gradient
    const bladeGrad = ctx.createLinearGradient(-4.5, -25, 2.5, -25);
    bladeGrad.addColorStop(0, '#594a28');  // Outer spine shadow
    bladeGrad.addColorStop(0.2, '#9a8752');
    bladeGrad.addColorStop(0.5, '#cebc83'); // Mid-blade body
    bladeGrad.addColorStop(0.85, '#faedc3'); // Inner cutting edge highlight
    bladeGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // Blade border stroke
    ctx.strokeStyle = '#2b2311';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // --- E. Embossed Bead Dots along the Outer Curved Spine ---
    // Tiny decorative beads following the outer curve from Image 3
    const spineDots = [
      { x: -2.3, y: -19.2 },
      { x: -2.9, y: -20.8 },
      { x: -3.5, y: -22.5 },
      { x: -4.0, y: -24.4 },
      { x: -4.1, y: -26.3 },
      { x: -3.7, y: -28.0 },
      { x: -2.6, y: -29.6 },
      { x: -1.0, y: -30.7 },
      { x: 0.8,  y: -31.1 }
    ];
    for (const d of spineDots) {
      // Dark bead socket
      ctx.fillStyle = '#221b0b';
      ctx.fillRect(d.x - 0.6, d.y - 0.6, 1.2, 1.2);
      // Sunlit raised metallic bead
      ctx.fillStyle = '#fff4ce';
      ctx.fillRect(d.x - 0.4, d.y - 0.4, 0.8, 0.8);
    }

    // --- F. Ancient Sacred Glyphs / Inscriptions (Image 3) ---
    // 3 Brahmi / Grantha characters engraved down the blade face
    const glyphGlow = this.lever.activated;
    ctx.save();
    if (glyphGlow) {
      ctx.globalCompositeOperation = 'lighter';
      const gPulse = 0.6 + 0.4 * Math.sin(this.animTime * 4.5);
      ctx.strokeStyle = `rgba(255, 225, 100, ${gPulse})`;
      ctx.fillStyle = `rgba(255, 240, 160, ${gPulse})`;
      ctx.lineWidth = 0.9;
    } else {
      ctx.strokeStyle = '#29210e'; // Dark etched engraving
      ctx.lineWidth = 0.8;
    }

    // Glyph 1 (Top hook/bow glyph, y ≈ -27.5)
    ctx.beginPath();
    ctx.arc(-0.8, -27.2, 1.1, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();

    // Glyph 2 (Middle stepped glyph / swastika-key variant, y ≈ -24.5)
    ctx.beginPath();
    ctx.moveTo(-1.6, -25.2);
    ctx.lineTo(-0.2, -25.2);
    ctx.lineTo(-0.2, -23.6);
    ctx.lineTo(-1.4, -23.6);
    ctx.stroke();

    // Glyph 3 (Lower spiral/omega Grantha glyph, y ≈ -21.8)
    ctx.beginPath();
    ctx.arc(-0.8, -21.8, 1.0, 0, Math.PI * 1.6);
    ctx.stroke();

    ctx.restore();

    // Polished beaked tip glint
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2.0, -30.6, 0.8, 0.8);

    ctx.restore(); // End blade clipping / rotation

    ctx.restore(); // End lever arm translation

    // ------------------------------------------------------------------------
    // 3. Divine Celestial Aura & Sparks When Activated
    // ------------------------------------------------------------------------
    if (this.lever.activated) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const auraPulse = 0.5 + 0.5 * Math.sin(this.animTime * 3.2);

      // Warm radial golden light illuminating the balcony stones
      const glowGrad = ctx.createRadialGradient(lx, pivotY - 10, 2, lx, pivotY - 10, 26);
      glowGrad.addColorStop(0, `rgba(255, 215, 80, ${0.45 * auraPulse})`);
      glowGrad.addColorStop(0.5, `rgba(255, 170, 30, ${0.2 * auraPulse})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lx, pivotY - 10, 26, 0, Math.PI * 2);
      ctx.fill();

      // Delicate floating mystic sparks around the lever head
      for (let i = 0; i < 3; i++) {
        const sa = this.animTime * 2.0 + (i * Math.PI * 2 / 3);
        const sx = lx + Math.cos(sa) * (8 + i * 4);
        const sy = (pivotY - 20) + Math.sin(sa * 1.5) * 6;
        ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#4eedff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Renders the Sanctum Black Space Doorway (x=898, y=368).
   * Displays soft celestial embers and entrance glow once the lever is activated.
   */
  renderSanctumExit(ctx) {
    ctx.save();
    const sx = 898;
    const sy = 368;

    if (this.lever.activated) {
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 2.8);

      const archGrad = ctx.createRadialGradient(sx, sy - 35, 4, sx, sy - 35, 46);
      archGrad.addColorStop(0, `rgba(255, 225, 100, ${0.4 * pulse})`);
      archGrad.addColorStop(0.5, `rgba(78, 237, 255, ${0.25 * pulse})`);
      archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = archGrad;
      ctx.beginPath();
      ctx.arc(sx, sy - 35, 46, 0, Math.PI * 2);
      ctx.fill();

      // Floating golden embers at the doorway entrance
      for (let i = 0; i < 6; i++) {
        const emberX = sx - 16 + (i * 7);
        const emberY = sy - 10 - ((this.animTime * 20 + i * 15) % 45);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillRect(emberX, emberY, 2, 2);
      }
    }

    ctx.restore();
  }

  /**
   * Renders the Golden Constellation Bridge ONLY when Divine Form (X ability) is used.
   */
  renderGoldenBridge(ctx, isDivine) {
    if (this.bridgeOpacity <= 0.01) {
      // Faint dormant celestial whisper (subtle star trace)
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(388, 172);
      ctx.lineTo(635, 172);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, this.bridgeOpacity);

    // 1. Draw high-res Golden Bridge Overlay
    if (this.bridgeLoaded) {
      ctx.drawImage(this.bridgeImg, 0, 0, this.width, this.height);
    }

    // 2. Add dynamic celestial glow and animated stars
    ctx.globalCompositeOperation = 'lighter';

    const bridgeGrad = ctx.createLinearGradient(388, 172, 635, 172);
    bridgeGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    bridgeGrad.addColorStop(0.5, 'rgba(255, 245, 180, 0.8)');
    bridgeGrad.addColorStop(1, 'rgba(255, 215, 0, 0.3)');

    ctx.fillStyle = bridgeGrad;
    ctx.fillRect(388, 169, 247, 5);

    // Animated shimmering constellation stars
    for (const star of this.bridgeStars) {
      const alpha = this.bridgeOpacity * (0.4 + 0.6 * Math.abs(Math.sin(this.animTime * star.twinkleSpeed + star.phase)));
      ctx.fillStyle = `rgba(255, 248, 190, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderBridgeSentries(ctx, isDivine) {
    if (!isDivine || this.bridgeOpacity <= 0.35 || !this.bridgeSentries) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sentry of this.bridgeSentries) {
      const y = sentry.y + Math.sin(sentry.phase) * 5;
      const pulse = 0.72 + Math.sin(sentry.phase * 1.7) * 0.18;

      const glow = ctx.createRadialGradient(sentry.x, y, 2, sentry.x, y, 20);
      glow.addColorStop(0, `rgba(255, 247, 202, ${0.9 * pulse})`);
      glow.addColorStop(0.32, `rgba(255, 190, 61, ${0.65 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 122, 34, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sentry.x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 230, 145, ${0.72 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sentry.x, y, 9, sentry.phase, sentry.phase + Math.PI * 1.55);
      ctx.stroke();

      ctx.fillStyle = '#fff5d1';
      ctx.beginPath();
      ctx.arc(sentry.x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderGodRays(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const rayTime = this.animTime * 0.4;
    const rays = [
      { x: 260, w: 80, drift: Math.sin(rayTime) * 20 },
      { x: 480, w: 120, drift: Math.sin(rayTime + 1.5) * 30 },
      { x: 620, w: 90, drift: Math.sin(rayTime + 3.0) * 25 },
      { x: 800, w: 110, drift: Math.sin(rayTime + 4.5) * 25 }
    ];

    rays.forEach(r => {
      const startX = r.x + r.drift;
      const grad = ctx.createLinearGradient(startX, 0, startX + 60, this.height);
      grad.addColorStop(0, 'rgba(180, 220, 255, 0.22)');
      grad.addColorStop(0.5, 'rgba(120, 180, 255, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX - r.w * 0.4, 0);
      ctx.lineTo(startX + r.w * 0.4, 0);
      ctx.lineTo(startX + r.w * 0.8 + 80, this.height);
      ctx.lineTo(startX - r.w * 0.8 + 80, this.height);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  renderLotusAuras(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const lotusPositions = [
      { x: 100, y: 368 },
      { x: 355, y: 172 },
      { x: 725, y: 172 },
      { x: 890, y: 368 }
    ];

    const time = this.animTime * 2.5;
    for (const pos of lotusPositions) {
      const pulse = Math.sin(time + pos.x) * 3;
      const rad = 28 + pulse;

      const grad = ctx.createRadialGradient(pos.x, pos.y - 12, 2, pos.x, pos.y - 12, rad);
      grad.addColorStop(0, 'rgba(56, 225, 255, 0.55)');
      grad.addColorStop(0.5, 'rgba(28, 120, 200, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 12, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sacred Lotus Blossom of Awakening on Western Balcony (x: 355, y: 172)
    const lx = 355;
    const ly = 172 - 12 + Math.sin(time * 1.8) * 3;

    ctx.fillStyle = 'rgba(60, 232, 245, 0.92)';
    ctx.shadowColor = '#3ce8f5';
    ctx.shadowBlur = 10;

    // Center petal
    ctx.beginPath();
    ctx.ellipse(lx, ly - 4, 3, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left petal
    ctx.beginPath();
    ctx.ellipse(lx - 4, ly - 2, 3, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Right petal
    ctx.beginPath();
    ctx.ellipse(lx + 4, ly - 2, 3, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Golden Stamen
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderSpores(ctx) {
    // Bubbles removed entirely per user request
  }
}

