/**
 * ==========================================================================
 * GLITCHVERSE - LEVEL 2: SUNKEN DESERT CATACOMBS (js/level2.js)
 * Full Integration: TEAMKOLBAR Level 2 Puzzle Progression + Sands of Time UI & Asura Archer
 * Features:
 * 1. Climbing Ladders (Top-left and Cave)
 * 2. Celestial Golden Bridge: Manifested with golden celestial glow & solid platform
 *    ONLY during Divine Form [X]!
 * 3. Upper Balcony Seal & Transmutation [Q]: Suspended boulder falls down shaft
 *    to crush the sentinel Asura Archer!
 * 4. Living Cache Seal: Defeating archer releases the seal on the sunken cave chest.
 * 5. Cave Chest [E]: Grants the [SANCTUM KEY].
 * 6. Lower Chasm Transmutation [Q]: Morphs second stone into a solid causeway bridge.
 * 7. Lower Guards Awakening: 2 melee sentinels spawn to guard the sanctum gate.
 * 8. Locked Sanctum Door [E]: Unlocked with the Sanctum Key once guards are defeated.
 * 9. Black Doorway: Step into eternal darkness to conquer Level 2!
 * ==========================================================================
 */

import { Archer, Arrow } from './archer.js';

export class Level2 {
  constructor() {
    this.width = 1024;
    this.height = 571;
    this.levelIndex = 2;

    // Base Map without bridge (mortal view)
    this.baseMapImg = new Image();
    this.baseMapLoaded = false;
    this.baseMapImg.onload = () => { this.baseMapLoaded = true; };
    this.baseMapImg.src = 'assets/temple_map_lvl2_base.png';
    if (this.baseMapImg.complete && this.baseMapImg.naturalWidth > 0) {
      this.baseMapLoaded = true;
    }

    // Isolated Golden Constellation Bridge overlay (manifested in Divine Form [X])
    this.bridgeImg = new Image();
    this.bridgeLoaded = false;
    this.bridgeImg.onload = () => { this.bridgeLoaded = true; };
    this.bridgeImg.src = 'assets/golden_bridge_lvl2.png';
    if (this.bridgeImg.complete && this.bridgeImg.naturalWidth > 0) {
      this.bridgeLoaded = true;
    }

    // Fallback Background Map Artwork
    this.bgImg = new Image();
    this.bgLoaded = false;
    this.bgImg.onload = () => { this.bgLoaded = true; };
    this.bgImg.src = 'assets/temple_map_lvl2.jpg';
    if (this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      this.bgLoaded = true;
    }

    // Asura / Rakshasa Archer Animation Sprites (6-frame aim, 6-frame aim-up, 4-frame hurt/die)
    this.archerIdleFrames = [];
    this.archerAimFrames = [];
    this.archerAimUpFrames = [];
    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/archer_idle_${i}.png`;
      this.archerIdleFrames.push(img);

      const a = new Image();
      a.src = `assets/anims/archer_aim_${i}.png`;
      this.archerAimFrames.push(a);

      const u = new Image();
      u.src = `assets/anims/archer_aim_up_${i}.png`;
      this.archerAimUpFrames.push(u);
    }

    this.archerHurtFrames = [];
    this.archerDieFrames = [];
    for (let i = 0; i < 4; i++) {
      const h = new Image();
      h.src = `assets/anims/archer_hurt_${i}.png`;
      this.archerHurtFrames.push(h);

      const d = new Image();
      d.src = `assets/anims/archer_die_${i}.png`;
      this.archerDieFrames.push(d);
    }

    this.archerIdleImg = new Image();
    this.archerIdleImg.src = 'assets/anims/archer_idle.png';
    this.archerDefeatedImg = new Image();
    this.archerDefeatedImg.src = 'assets/anims/archer_defeated.png';
    this.archerArrowImg = new Image();
    this.archerArrowImg.src = 'assets/anims/archer_arrow.png';

    // Bundled Archer Sprite Collection for Archer Entity Rendering
    this.archerSprites = {
      idle: this.archerIdleImg,
      defeated: this.archerDefeatedImg,
      arrow: this.archerArrowImg,
      idleFrames: this.archerIdleFrames,
      aimFrames: this.archerAimFrames,
      aimUpFrames: this.archerAimUpFrames,
      hurtFrames: this.archerHurtFrames,
      dieFrames: this.archerDieFrames
    };

    // Platforms
    this.platforms = [
      // 1. Upper Left Balcony (x=40..245, y=145)
      { id: 'top_left', x1: 40, x2: 245, y: 145, oneWay: true },

      // 1b. Sand Dune Ledge below Upper Left Ladder (x=150..245, y=255)
      { id: 'sand_dune', x1: 150, x2: 245, y: 255, oneWay: true },

      // 2. Sand Dune & Middle Left Platform (x=40..460, y=325)
      { id: 'middle_left', x1: 40, x2: 460, y: 325, oneWay: false },

      // 3. Golden Celestial Bridge (x=460..675, y=325, only active in Divine Form [X])
      { id: 'bridge_lvl2', x1: 460, x2: 675, y: 325, oneWay: true, divineOnly: true },

      // 4. Middle Right Platform (x=675..1024, y=325)
      { id: 'middle_right', x1: 675, x2: 1024, y: 325, oneWay: false },

      // Upper archer gallery has no collision; the archer is unreachable without crushing.

      // 6. Bottom Left Cave Floor (x=40..440, y=535)
      { id: 'cave_floor', x1: 40, x2: 440, y: 535, oneWay: false },

      // 7. Bottom Right Floor (x=630..1024, y=515)
      { id: 'floor_lower_right', x1: 630, x2: 1024, y: 515, oneWay: false },

      // 8. Elephant Statue Back (x=730..810, y=415)
      { id: 'elephant_back', x1: 730, x2: 810, y: 415, oneWay: true },

      // 9. Water Dais Platform in Pit (x=495..545, y=440)
      { id: 'water_dais', x1: 495, x2: 545, y: 440, oneWay: true }
    ];

    // Ladders (x position, top y, bottom y)
    this.ladders = [
      // Ladder 1: Top Left down towards Sand Dune
      { id: 'ladder_left', x: 205, y1: 145, y2: 255, width: 26 },
      // Ladder 2: Middle platform down into Cave
      { id: 'ladder_cave', x: 360, y1: 325, y2: 535, width: 26 }
    ];

    // Scorpions removed per user request
    this.scorpions = [];

    // Modular Asura Archer & Attached Homing Arrow Objects (Level 2)
    this.archers = [new Archer(855, 175, 'archer_primary')];
    this.archerKilled = false;
    this.kills = 0;
    this.killToastTimer = 0;
    this.killToastText = '';

    // Morphable Object 1 (Square Stone Crate suspended above the Archer)
    // When [Q] is pressed near seal, morphs into rolling boulder that plunges down shaft
    this.morphBox = {
      x: 855,
      y: 96,
      initialX: 855,
      initialY: 96,
      size: 38,
      isMorphed: false,       // false = square box, true = round boulder
      isFalling: false,
      hasCrushed: false,
      hasLanded: false,
      vx: 0,
      vy: 0,
      rotation: 0,
      morphAuraTimer: 0
    };

    // Morphable Object 2 (Lower Chasm Cube)
    // When [Q] is pressed near lower gap, morphs into solid stone causeway bridge
    this.lowerBoulder = {
      x: 535,
      y: 514,
      size: 34,
      isMorphed: false,
      isBridge: false,
      rotation: 0,
      morphAuraTimer: 0
    };
    this.lowerCausewayActive = false;

    // Lower Guard Melee Sentinels
    this.meleeEnemies = [];
    this.enemyWaveStarted = false;

    // Bottom-Left Cave Chest (Contains Sanctum Key)
    this.chest = {
      x: 125,
      y: 535,
      radius: 45,
      opened: false,
      unlocked: false,
      glowPulse: 0
    };

    // Locked Door on Lower Right (Requires Key & Guards defeated)
    this.lockedDoor = {
      x: 898,
      y: 515,
      radius: 46,
      unlocked: false,
      shatterParticles: [],
      openAnimProgress: 0
    };

    // Sands of Time Guidance Landmarks
    this.interactables = [
      {
        x: 400, y: 325, radius: 45,
        speaker: 'stele',
        title: '⚜ ANCIENT STELE OF SURYA ⚜',
        text: "The Desert Catacombs of Surya. The celestial bridge spans east, but only Maa Kali's divine sight [X] can reveal its sacred path across the abyss."
      },
      {
        x: 740, y: 460, radius: 50,
        speaker: 'stele',
        title: '⚜ SACRED AIRAVATA ⚜',
        text: "A colossal stone effigy of the solar elephant Airavata, weathered by millennia of subterranean shifting sands and phosphorescent cavern moss."
      },
      {
        x: 550, y: 325, radius: 55,
        speaker: 'kali',
        title: '⚜ MAA KALI: CELESTIAL SIGHT ⚜',
        text: "The Bridge of Constellations stretches across the chasm, invisible to mortal eyes. Unleash your Divine Form [X] to solidify the golden path beneath your feet!"
      }
    ];

    this.spores = [];

    this.bridgeStars = [];
    this.initBridgeStars(24);
    this.bridgeOpacity = 0.0;

    this.cameraShake = 0;
    this.isCompleted = false;
    this.animTime = 0;
    this.lastMorphMessage = null;
  }

  initSpores(count) {
    this.spores = [];
  }

  initBridgeStars(count) {
    this.bridgeStars = [];
    const xMin = 462;
    const xMax = 673;
    const yCenter = 325;

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

  get archer() {
    return this.archers[0] || null;
  }

  addArcher(x, y, id = null) {
    const newArcher = new Archer(x, y, id || `archer_${this.archers.length + 1}`);
    this.archers.push(newArcher);
    return newArcher;
  }

  removeArcher(archerOrId) {
    const id = (typeof archerOrId === 'string') ? archerOrId : archerOrId.id;
    const index = this.archers.findIndex(a => a.id === id);
    if (index !== -1) {
      this.archers.splice(index, 1);
      return true;
    }
    return false;
  }

  useAnotherArcher(x = 760, y = 175) {
    const newArcher = this.addArcher(x, y, `archer_reinforcement_${this.kills}`);
    return newArcher;
  }

  registerKill(archer) {
    this.kills++;
    this.cameraShake = 1.0;
    this.killToastTimer = 2.8;
    this.killToastText = `⚔ SENTINEL ARCHER ELIMINATED!`;
  }

  reset() {
    this.scorpions = [];

    // Reset archers to initial setup (Asura Archer at upper gallery)
    this.archers = [new Archer(855, 175, 'archer_primary')];
    this.archerKilled = false;
    this.kills = 0;
    this.killToastTimer = 0;
    this.killToastText = '';

    this.morphBox.x = this.morphBox.initialX;
    this.morphBox.y = this.morphBox.initialY;
    this.morphBox.isMorphed = false;
    this.morphBox.isFalling = false;
    this.morphBox.hasCrushed = false;
    this.morphBox.hasLanded = false;
    this.morphBox.morphAuraTimer = 0;
    this.morphBox.vx = 0;
    this.morphBox.vy = 0;
    this.morphBox.rotation = 0;

    Object.assign(this.lowerBoulder, {
      x: 535, y: 514, size: 34,
      isMorphed: false, isBridge: false,
      rotation: 0, morphAuraTimer: 0
    });
    this.lowerCausewayActive = false;
    this.meleeEnemies = [];
    this.enemyWaveStarted = false;

    this.chest.opened = false;
    this.chest.unlocked = false;
    this.lockedDoor.unlocked = false;
    this.lockedDoor.shatterParticles = [];
    this.lockedDoor.openAnimProgress = 0;
    this.cameraShake = 0;
    this.isCompleted = false;
    this.bridgeOpacity = 0.0;
    this.lastMorphMessage = null;
  }

  /**
   * Transmutation [Q] Trigger:
   * 1. Upper Seal (x=720, y=325): Drops suspended boulder to crush the unreachable archer
   * 2. Lower Chasm (x=440..630, y=515): Morphs cubic stone into a solid causeway
   */
  triggerMorph(playerX, playerY) {
    // 1. Upper Boulder Drop
    if (!this.morphBox.isMorphed) {
      if (Math.hypot(playerX - 720, playerY - 325) > 105) return false;
      this.morphBox.isMorphed = true;
      this.morphBox.morphAuraTimer = 1.2;
      this.morphBox.isFalling = true;
      this.morphBox.vx = 0;
      this.morphBox.vy = 0;
      this.cameraShake = 0.55;
      this.lastMorphMessage = "Transmutation unleashed! The celestial stone transforms into an unstoppable rolling sphere, plunging down the shaft to eliminate the sentinel archer!";
      return true;
    }

    // 2. Lower Causeway Formation
    const atLowerGap = (playerX >= 385 && playerX <= 475) || (playerX >= 595 && playerX <= 690);
    if (this.morphBox.hasLanded && this.chest.opened && !this.lowerBoulder.isMorphed &&
        atLowerGap && playerY >= 515) {
      this.lowerBoulder.isMorphed = true;
      this.lowerBoulder.isBridge = true;
      this.lowerBoulder.morphAuraTimer = 1.2;
      this.lowerCausewayActive = true;
      if (!this.platforms.some(plat => plat.id === 'morphed_causeway')) {
        this.platforms.push({ id: 'morphed_causeway', x1: 440, x2: 630, y: 515, oneWay: true });
      }
      this.startMeleeWave();
      this.cameraShake = 0.8;
      this.lastMorphMessage = "The second stone locks into the lower gap, forming a solid celestial causeway across the chasm! The Lower Guards awaken!";
      return true;
    }
    return false;
  }

  startMeleeWave() {
    if (this.enemyWaveStarted) return;
    this.enemyWaveStarted = true;
    this.meleeEnemies = [
      { x: 735, y: 515, hp: 4, attackTimer: 0.8, hitFlash: 0, dead: false, phase: 0 },
      { x: 970, y: 515, hp: 4, attackTimer: 1.5, hitFlash: 0, dead: false, phase: 1 }
    ];
    this.killToastText = '⚔ THE LOWER GUARD WAKES';
    this.killToastTimer = 2.4;
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.platforms) {
      if (plat.id === 'morphed_causeway' && !this.lowerCausewayActive) continue;
      if (plat.divineOnly && !isDivine) {
        continue; // Golden bridge only exists in Divine Form [X]!
      }
      if (x >= plat.x1 && x <= plat.x2) {
        if (plat.oneWay && droppingThrough) continue;
        if (prevY <= plat.y + 6 && currY >= plat.y - 2) {
          return plat;
        }
      }
    }
    return null;
  }

  isOnPlatform(x, y, isDivine = false) {
    for (const plat of this.platforms) {
      if (plat.id === 'morphed_causeway' && !this.lowerCausewayActive) continue;
      if (plat.divineOnly && !isDivine) {
        continue; // Golden bridge non-solid in mortal form!
      }
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) {
        return plat;
      }
    }
    return null;
  }

  resolvePitWallCollision(x, y) {
    return x;
  }

  getNearbyInteractable(px, py) {
    // 1. Upper Seal (Drop the boulder)
    if (!this.morphBox.isMorphed && Math.hypot(px - 720, py - 325) <= 105) {
      return {
        type: 'morph_box',
        speaker: 'kali',
        title: '⚜ MAA KALI: TRANSMUTATION ⚜',
        x: 855,
        y: 96,
        prompt: '[Q] TRANSMUTE BOULDER',
        text: "The upper archer gallery is sealed by ancient masonry. Channel your transmutation magic [Q] to drop the suspended boulder and crush the sentinel!"
      };
    }

    // 2. Lower Gap (Form a causeway)
    const nearLowerGap = Math.hypot(px - 440, py - 535) <= 115 || Math.hypot(px - 630, py - 515) <= 115;
    if (this.morphBox.hasLanded && this.chest.opened && !this.lowerBoulder.isMorphed && nearLowerGap) {
      return {
        type: 'morph_box',
        speaker: 'kali',
        title: '⚜ MAA KALI: CAUSEWAY ⚜',
        x: 535,
        y: 514,
        prompt: '[Q] CREATE CAUSEWAY',
        text: "A suspended cubic monolith hangs above the lower abyss. Unleash transmutation [Q] to reshape the stone into a celestial causeway!"
      };
    }

    // 3. Bottom-Left Cave Chest (Sanctum Key)
    const distToChest = Math.hypot(px - this.chest.x, py - this.chest.y);
    if (distToChest <= this.chest.radius) {
      return {
        type: 'chest',
        x: this.chest.x,
        y: this.chest.y,
        opened: this.chest.opened,
        speaker: this.chest.opened ? 'stele' : (this.chest.unlocked ? 'kali' : 'stele'),
        title: this.chest.unlocked ? '⚜ SANCTUM KEY ACQUIRED ⚜' : '⚜ SEALED CACHE ⚜',
        prompt: this.chest.opened ? '[E] CHEST (EMPTY)' : (this.chest.unlocked ? '[E] CLAIM SANCTUM KEY' : '[E] SEALED CACHE'),
        text: this.chest.opened
          ? "The ancient cache lies open. The Sanctum Key rests in your possession."
          : (this.chest.unlocked
              ? "The sentinel's destruction has shattered the cache seal! Open the chest [E] to claim the Sanctum Key."
              : "The ancient reliquary is sealed by a living guardian ward. Crush the sentinel archer above to dissolve the protective ward.")
      };
    }

    // 4. Locked Cyan Padlock Door
    const distToDoor = Math.hypot(px - this.lockedDoor.x, py - this.lockedDoor.y);
    if (distToDoor <= this.lockedDoor.radius) {
      return {
        type: 'locked_door',
        x: this.lockedDoor.x,
        y: this.lockedDoor.y,
        unlocked: this.lockedDoor.unlocked,
        speaker: 'kali',
        title: this.lockedDoor.unlocked ? '⚜ SANCTUM OPEN ⚜' : '⚜ SEALED GATEWAY ⚜',
        prompt: this.lockedDoor.unlocked ? '[E] ENTER SANCTUM' : '[E] UNLOCK GATE',
        text: this.lockedDoor.unlocked
          ? "The sanctum gate stands unsealed. Step boldly into the dark passage to conquer the catacombs."
          : (this.canUnlockDoor()
              ? "The Sanctum Key fits into the glowing cyan padlock! Press [E] to break the lock and enter."
              : "The colossal sanctum gate is barred by an enchanted cyan padlock. Seek the Sanctum Key and defeat all guardians to open it.")
      };
    }

    // 5. Other inspection landmarks
    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.x, py - item.y);
      if (dist <= item.radius) {
        return {
          type: 'inspection',
          speaker: item.speaker || 'stele',
          title: item.title || null,
          x: item.x,
          y: item.y,
          prompt: '[E] EXAMINE',
          text: item.text
        };
      }
    }
    return null;
  }

  checkLevelComplete(px, py) {
    if (this.isCompleted) return false;
    // When the door is unlocked and player steps into the black doorway (x=885..918, y=500..530)
    if (this.lockedDoor.unlocked && px >= 885 && px <= 918 && py >= 500 && py <= 530) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  canUnlockDoor() {
    return this.lowerCausewayActive && this.meleeEnemies.length === 2 && this.meleeEnemies.every(enemy => enemy.dead);
  }

  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.2);
    }

    // Smooth bridge opacity fade in/out
    const targetBridgeOpacity = isDivine ? 1.0 : 0.0;
    this.bridgeOpacity += (targetBridgeOpacity - this.bridgeOpacity) * Math.min(1.0, dt * 6.0);

    if (this.killToastTimer > 0) {
      this.killToastTimer -= dt;
    }

    // Update active archers
    for (let i = this.archers.length - 1; i >= 0; i--) {
      const archer = this.archers[i];
      archer.update(dt, player, this);
      if (archer.canBeRemoved) this.removeArcher(archer);
    }

    // Morph aura decays
    if (this.morphBox.morphAuraTimer > 0) this.morphBox.morphAuraTimer = Math.max(0, this.morphBox.morphAuraTimer - dt);
    if (this.lowerBoulder.morphAuraTimer > 0) this.lowerBoulder.morphAuraTimer = Math.max(0, this.lowerBoulder.morphAuraTimer - dt);

    // Falling boulder physics & crushing logic
    if (this.morphBox.isMorphed && this.morphBox.isFalling) {
      const prevY = this.morphBox.y;
      this.morphBox.vy += 850 * dt;
      this.morphBox.y += this.morphBox.vy * dt;
      this.morphBox.rotation += 7.5 * dt;

      // Crushing the sentinel archer at y=175
      if (!this.morphBox.hasCrushed && this.morphBox.y >= 175 - 18) {
        this.morphBox.hasCrushed = true;
        for (const archer of this.archers) {
          if (archer.alive && Math.abs(this.morphBox.x - archer.x) < 58) {
            if (archer.die('crushed')) {
              this.archerKilled = true;
              this.registerKill(archer);
              this.chest.unlocked = true;
            }
          }
        }
      }

      // Middle floor shaft rumble
      if (prevY < 325 && this.morphBox.y >= 325 && this.morphBox.x > 810 && this.morphBox.x < 900) {
        this.cameraShake = Math.max(this.cameraShake, 0.42);
      }

      // Landing at cave floor (y=515)
      if (this.morphBox.y >= 515 - this.morphBox.size / 2) {
        this.morphBox.y = 515 - this.morphBox.size / 2;
        this.morphBox.isFalling = false;
        this.morphBox.hasLanded = true;
        this.morphBox.vx = 0;
        this.morphBox.vy = 0;
        if (this.archerKilled) {
          this.chest.unlocked = true;
          this.killToastText = '⚜ CACHE SEAL BROKEN — CLAIM THE KEY BELOW ⚜';
          this.killToastTimer = 3.2;
        }
      }
    }

    // Update melee enemies
    for (const enemy of this.meleeEnemies) {
      if (enemy.dead) continue;
      enemy.phase += dt * 7;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackTimer -= dt;
      const dx = playerX - enemy.x;

      // Player melee attack hitting enemy
      if (player?.isAttacking && Math.abs(dx) < 56 && Math.abs(playerY - enemy.y) < 42 && enemy.hitFlash <= 0) {
        const damage = player.swordDamage || 4;
        enemy.hp -= damage;
        enemy.hitFlash = 0.3;
        if (enemy.hp <= 0) {
          enemy.dead = true;
          this.kills++;
          this.killToastText = '⚔ LOWER GUARD DEFEATED';
          this.killToastTimer = 1.4;
        }
      } else if (Math.abs(dx) > 34) {
        enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) - 34, 42 * dt);
      } else if (enemy.attackTimer <= 0 && player && player.invulnerableTimer <= 0) {
        player.takeDamage(3, (playerX < enemy.x ? -180 : 180), -120);
        enemy.attackTimer = 1.25;
        this.cameraShake = 0.25;
      }
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderBackground(ctx, isDivine = false) {
    ctx.save();

    // 1. Draw Level 2 Base Map without bridge (mortal view)
    if (this.baseMapLoaded) {
      ctx.drawImage(this.baseMapImg, 0, 0, this.width, this.height);
    } else if (this.bgLoaded) {
      ctx.drawImage(this.bgImg, 0, 0, this.width, this.height);
    }

    // 2. Chasm & Wall masonry hiding old ladder
    this.renderChasmAndSeal(ctx);

    // 3. Falling-stone shaft cut into the mid-level floor
    this.renderBoulderShaft(ctx);

    // 4. Golden Constellation Bridge (ONLY visible when Divine Form [X] is active)
    this.renderGoldenBridge(ctx, isDivine);

    // 5. Asura Archer Entities & Attached/Flying Homing Arrows
    this.renderArchers(ctx);

    // 6. Puzzle stones, causeway, and melee guards
    this.renderMorphBox(ctx);
    this.renderLowerBoulder(ctx);
    this.renderMeleeEnemies(ctx);

    // 7. Sands of Time Objective Banner
    this.renderObjective(ctx);

    // 8. Chest (Living Seal / Open State)
    this.renderChest(ctx);

    // 9. Locked Cyan Padlock Door
    this.renderLockedDoor(ctx);

    // 10. Ladders
    this.renderLadders(ctx);

    ctx.restore();
  }

  renderScorpions(ctx) {
    // Scorpions removed per user request
  }

  renderChasmAndSeal(ctx) {
    ctx.save();
    const depth = ctx.createLinearGradient(0, 292, 0, 367);
    depth.addColorStop(0, '#18202e');
    depth.addColorStop(0.42, '#10243a');
    depth.addColorStop(1, '#07111d');
    ctx.fillStyle = depth;
    ctx.fillRect(456, 292, 222, 76);

    const leftFade = ctx.createLinearGradient(444, 0, 466, 0);
    leftFade.addColorStop(0, 'rgba(7,17,29,0)'); leftFade.addColorStop(1, '#10243a');
    ctx.fillStyle = leftFade; ctx.fillRect(444, 292, 22, 76);

    const rightFade = ctx.createLinearGradient(666, 0, 690, 0);
    rightFade.addColorStop(0, '#10243a'); rightFade.addColorStop(1, 'rgba(7,17,29,0)');
    ctx.fillStyle = rightFade; ctx.fillRect(666, 292, 24, 76);

    // Broken stone lips
    for (let x = 456; x < 678; x += 18) {
      const notch = Math.round(3 + 3 * Math.sin(x * 0.12));
      ctx.fillStyle = x % 3 ? '#40362f' : '#514337';
      ctx.fillRect(x, 289 + notch, 18, 6);
      ctx.fillStyle = '#342d2b';
      ctx.fillRect(x + 2, 361 - notch, 16, 7);
      ctx.fillStyle = 'rgba(190, 151, 94, 0.45)';
      ctx.fillRect(x + 2, 289 + notch, 12, 1);
    }

    // Layered ruins depth
    ctx.fillStyle = '#172437';
    ctx.fillRect(462, 303, 28, 7);
    ctx.fillRect(499, 313, 45, 6);
    ctx.fillRect(555, 301, 18, 8);
    ctx.fillRect(592, 316, 36, 6);
    ctx.fillRect(638, 305, 32, 8);
    ctx.fillStyle = '#26344a';
    ctx.fillRect(470, 310, 5, 21);
    ctx.fillRect(522, 319, 5, 24);
    ctx.fillRect(562, 309, 5, 29);
    ctx.fillRect(608, 322, 5, 19);
    ctx.fillRect(651, 313, 5, 27);

    const glow = ctx.createRadialGradient(563, 348, 2, 563, 348, 96);
    glow.addColorStop(0, 'rgba(49, 202, 223, 0.28)');
    glow.addColorStop(1, 'rgba(7, 17, 29, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(456, 292, 222, 76);

    ctx.fillStyle = '#d5c06b';
    for (const [x, y] of [[488, 331], [536, 346], [581, 327], [631, 350], [662, 337]]) {
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(this.animTime * 2.4 + x);
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    // The archer's balcony remains visible, but its ladder is sealed by masonry
    const masonry = ctx.createLinearGradient(746, 0, 784, 0);
    masonry.addColorStop(0, '#211b1d'); masonry.addColorStop(0.5, '#49382f'); masonry.addColorStop(1, '#211b1d');
    ctx.fillStyle = masonry;
    ctx.fillRect(746, 178, 38, 146);
    ctx.fillStyle = '#6b5240';
    ctx.fillRect(744, 178, 42, 7); ctx.fillRect(744, 317, 42, 7);
    ctx.fillStyle = '#382c29';
    ctx.fillRect(750, 188, 30, 124);
    ctx.strokeStyle = 'rgba(196, 151, 87, 0.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(765, 249, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(765, 229); ctx.lineTo(765, 269); ctx.moveTo(745, 249); ctx.lineTo(785, 249); ctx.stroke();
    ctx.fillStyle = '#d2ad67';
    ctx.fillRect(762, 246, 6, 6);
    ctx.restore();
  }

  renderBoulderShaft(ctx) {
    ctx.save();
    const pulse = 0.55 + 0.2 * Math.sin(this.animTime * 2.2);
    const shaft = ctx.createLinearGradient(832, 0, 880, 0);
    shaft.addColorStop(0, 'rgba(5, 12, 23, 0.05)');
    shaft.addColorStop(0.18, `rgba(5, 12, 23, ${pulse})`);
    shaft.addColorStop(0.82, `rgba(5, 12, 23, ${pulse})`);
    shaft.addColorStop(1, 'rgba(5, 12, 23, 0.05)');
    ctx.fillStyle = shaft;
    ctx.fillRect(832, 300, 48, 215);

    ctx.strokeStyle = `rgba(78, 237, 255, ${0.35 + 0.2 * Math.sin(this.animTime * 3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(834, 320); ctx.lineTo(834, 506);
    ctx.moveTo(878, 320); ctx.lineTo(878, 506);
    ctx.stroke();

    ctx.fillStyle = 'rgba(10, 17, 28, 0.9)';
    ctx.fillRect(812, 317, 86, 10);
    ctx.fillStyle = '#72edff';
    ctx.fillRect(814, 317, 82, 2);
    ctx.restore();
  }

  renderLowerBoulder(ctx) {
    const stone = this.lowerBoulder;
    ctx.save();
    if (!stone.isBridge) {
      const x = stone.x, y = stone.y, s = stone.size;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x - s / 2 + 4, 532, s, 4);

      ctx.fillStyle = '#846d52';
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      ctx.strokeStyle = '#c69f59';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4);

      ctx.strokeStyle = '#453727';
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 13); ctx.lineTo(x + 13, y + 13);
      ctx.moveTo(x + 13, y - 13); ctx.lineTo(x - 13, y + 13);
      ctx.stroke();

      ctx.fillStyle = '#55eaff';
      ctx.beginPath(); ctx.arc(x, y - 26, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      const causeway = ctx.createLinearGradient(440, 0, 630, 0);
      causeway.addColorStop(0, '#534636');
      causeway.addColorStop(0.48, '#a38a67');
      causeway.addColorStop(1, '#514434');
      ctx.fillStyle = causeway;
      ctx.fillRect(440, 505, 190, 16);

      ctx.fillStyle = '#cfb27d';
      ctx.fillRect(440, 503, 190, 4);
      ctx.strokeStyle = 'rgba(78,237,255,0.8)';
      ctx.lineWidth = 1;
      for (let x = 452; x < 625; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 508); ctx.lineTo(x + 8, 519); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(78,237,255,0.24)';
      ctx.fillRect(440, 521, 190, 5);
    }

    if (stone.morphAuraTimer > 0) {
      ctx.strokeStyle = `rgba(78,237,255,${Math.min(1, stone.morphAuraTimer)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(436, 501, 198, 24);
    }
    ctx.restore();
  }

  renderMeleeEnemies(ctx) {
    for (const enemy of this.meleeEnemies) {
      if (enemy.dead) continue;
      const x = Math.round(enemy.x), y = Math.round(enemy.y), bob = Math.sin(enemy.phase) * 1.5;
      ctx.save();
      ctx.translate(x, y + bob);

      // Body / Armour
      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1bd' : '#322d3a';
      ctx.fillRect(-10, -39, 20, 23);

      // Head / Mask
      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1bd' : '#9b765b';
      ctx.fillRect(-8, -53, 16, 15);

      // Glowing eyes
      ctx.fillStyle = '#f3b24f';
      ctx.fillRect(-5, -48, 3, 3); ctx.fillRect(3, -48, 3, 3);

      // Legs
      ctx.fillStyle = '#514532';
      ctx.fillRect(-12, -17, 9, 15); ctx.fillRect(3, -17, 9, 15);

      // Curved scimitar weapon
      ctx.strokeStyle = '#b7a17c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, -32); ctx.lineTo(19, -18);
      ctx.stroke();

      ctx.strokeStyle = '#d7d4c8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(16, -22); ctx.lineTo(27, -34); ctx.stroke();

      ctx.restore();
    }
  }

  renderObjective(ctx) {
    let objective = 'CROSS THE CELESTIAL BRIDGE  [X]';
    if (this.bridgeOpacity > 0.55 && !this.morphBox.isMorphed) objective = 'REACH THE SEAL  •  DROP THE BOULDER [Q]';
    if (this.morphBox.isMorphed && !this.archerKilled) objective = 'THE BOULDER FALLS TOWARDS THE SENTINEL';
    if (this.archerKilled && !this.chest.opened) objective = 'DESCEND TO CAVE  •  CLAIM SANCTUM KEY [E]';
    if (this.chest.opened && !this.lowerCausewayActive) objective = 'TRANSMUTE LOWER STONE  [Q]';
    if (this.lowerCausewayActive && this.meleeEnemies.some(enemy => !enemy.dead)) objective = 'VANQUISH THE LOWER GUARDS';
    if (this.lowerCausewayActive && this.meleeEnemies.every(enemy => enemy.dead)) objective = 'KEY IN HAND  •  UNSEAL THE SANCTUM GATE [E]';
    if (this.lockedDoor.unlocked) objective = 'SANCTUM OPEN  •  ENTER THE DARKNESS';

    ctx.save();
    // Sands of Time Styled Objective Bar
    const boxW = 420;
    const boxH = 26;
    const boxX = 14;
    const boxY = 14;

    ctx.fillStyle = 'rgba(16, 11, 7, 0.9)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = '#cda24e';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Corner accents
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(boxX, boxY, 3, 3);
    ctx.fillRect(boxX + boxW - 3, boxY, 3, 3);
    ctx.fillRect(boxX, boxY + boxH - 3, 3, 3);
    ctx.fillRect(boxX + boxW - 3, boxY + boxH - 3, 3, 3);

    ctx.font = '700 10px Cinzel, serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚜', boxX + 8, boxY + boxH / 2);

    ctx.fillStyle = '#f7eed8';
    ctx.fillText(objective, boxX + 24, boxY + boxH / 2);

    ctx.restore();
  }

  renderGoldenBridge(ctx, isDivine) {
    if (!isDivine && this.bridgeOpacity <= 0.01) return;

    if (!isDivine) {
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, this.bridgeOpacity * 0.4);
      if (this.bridgeLoaded) {
        ctx.drawImage(this.bridgeImg, 0, 0, this.width, this.height);
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1.0, this.bridgeOpacity);

    // High-res Golden Bridge Overlay
    if (this.bridgeLoaded) {
      ctx.drawImage(this.bridgeImg, 0, 0, this.width, this.height);
    }

    // Dynamic celestial glow and animated stars
    ctx.globalCompositeOperation = 'lighter';

    const bridgeGrad = ctx.createLinearGradient(460, 325, 675, 325);
    bridgeGrad.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
    bridgeGrad.addColorStop(0.5, 'rgba(255, 245, 180, 0.75)');
    bridgeGrad.addColorStop(1, 'rgba(255, 215, 0, 0.25)');

    ctx.fillStyle = bridgeGrad;
    ctx.fillRect(460, 323, 215, 5);

    for (const star of this.bridgeStars) {
      const alpha = this.bridgeOpacity * (0.4 + 0.6 * Math.abs(Math.sin(this.animTime * star.twinkleSpeed + star.phase)));
      ctx.fillStyle = `rgba(255, 248, 190, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderArchers(ctx) {
    for (const archer of this.archers) {
      archer.render(ctx, this.archerSprites);
    }
    this.renderKillToast(ctx);
  }

  renderKillToast(ctx) {
    if (this.killToastTimer > 0) {
      ctx.save();
      const alpha = Math.min(1.0, this.killToastTimer * 1.5);
      ctx.globalAlpha = alpha;

      const toastW = 340;
      const toastH = 32;
      const toastX = this.width / 2 - toastW / 2;
      const toastY = 55;

      ctx.fillStyle = 'rgba(16, 11, 7, 0.95)';
      ctx.fillRect(toastX, toastY, toastW, toastH);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(toastX, toastY, toastW, toastH);

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.strokeRect(toastX + 2, toastY + 2, toastW - 4, toastH - 4);

      ctx.fillStyle = '#ffd700';
      ctx.font = '700 11px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.killToastText || '⚔ SENTINEL ELIMINATED', this.width / 2, toastY + toastH / 2);

      ctx.restore();
    }
  }

  renderMorphBox(ctx) {
    ctx.save();
    const bx = this.morphBox.x;
    const by = this.morphBox.y;
    const s = this.morphBox.size;

    // Transmutation Aura
    if (this.morphBox.morphAuraTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const t = this.morphBox.morphAuraTimer;
      ctx.fillStyle = `rgba(78, 237, 255, ${Math.min(1.0, t * 1.5)})`;
      ctx.beginPath();
      ctx.arc(bx, by, s * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 215, 0, ${Math.min(1.0, t)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, s * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!this.morphBox.isMorphed) {
      // 1. SQUARE STONE CRATE
      ctx.fillStyle = 'rgba(10, 8, 20, 0.5)';
      ctx.fillRect(bx - s / 2 + 3, by + s / 2 - 2, s, 4);

      const crateGrad = ctx.createLinearGradient(bx - s / 2, by - s / 2, bx + s / 2, by + s / 2);
      crateGrad.addColorStop(0, '#756350');
      crateGrad.addColorStop(0.5, '#8c7862');
      crateGrad.addColorStop(1, '#4e3e30');
      ctx.fillStyle = crateGrad;
      ctx.fillRect(bx - s / 2, by - s / 2, s, s);

      ctx.strokeStyle = '#cda24e';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - s / 2 + 1, by - s / 2 + 1, s - 2, s - 2);

      ctx.strokeStyle = '#5a4635';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - s / 2 + 2, by - s / 2 + 2);
      ctx.lineTo(bx + s / 2 - 2, by + s / 2 - 2);
      ctx.moveTo(bx + s / 2 - 2, by - s / 2 + 2);
      ctx.lineTo(bx - s / 2 + 2, by + s / 2 - 2);
      ctx.stroke();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hintPulse = 0.6 + 0.4 * Math.sin(this.animTime * 3.0);
      ctx.fillStyle = `rgba(78, 237, 255, ${0.8 * hintPulse})`;
      ctx.beginPath();
      ctx.arc(bx, by - s / 2 - 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // 2. ROUND ROLLING STONE BOULDER
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(this.morphBox.rotation);

      const rad = s / 2;
      const bGrad = ctx.createRadialGradient(-rad * 0.3, -rad * 0.3, 2, 0, 0, rad);
      bGrad.addColorStop(0, '#ad977d');
      bGrad.addColorStop(0.5, '#73604b');
      bGrad.addColorStop(1, '#3b2f22');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#221911';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rad - 1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#cda24e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  renderChest(ctx) {
    if (!this.chest.opened) {
      ctx.save();
      const sealColor = this.chest.unlocked ? '#ffd166' : '#4eedff';
      const pulse = 0.65 + 0.35 * Math.sin(this.animTime * 3.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = sealColor;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.chest.x, this.chest.y - 25, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.chest.x - 9, this.chest.y - 25); ctx.lineTo(this.chest.x + 9, this.chest.y - 25); ctx.stroke();
      ctx.fillStyle = sealColor; ctx.fillRect(this.chest.x - 2, this.chest.y - 28, 4, 7);
      ctx.restore();
    }
    if (this.chest.opened) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowGrad = ctx.createRadialGradient(this.chest.x, this.chest.y - 10, 2, this.chest.x, this.chest.y - 10, 36);
      glowGrad.addColorStop(0, 'rgba(255, 230, 100, 0.6)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(this.chest.x, this.chest.y - 10, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderLockedDoor(ctx) {
    ctx.save();
    const dx = this.lockedDoor.x;
    const dy = this.lockedDoor.y;

    if (!this.lockedDoor.unlocked) {
      // Glowing Cyan Padlock
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const lockPulse = 0.7 + 0.3 * Math.sin(this.animTime * 3.5);

      const lockGlow = ctx.createRadialGradient(dx, dy - 20, 2, dx, dy - 20, 28);
      lockGlow.addColorStop(0, `rgba(78, 237, 255, ${0.5 * lockPulse})`);
      lockGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lockGlow;
      ctx.beginPath();
      ctx.arc(dx, dy - 20, 28, 0, Math.PI * 2);
      ctx.fill();

      // Cyan Padlock Body
      ctx.fillStyle = '#38e1ff';
      ctx.fillRect(dx - 9, dy - 20, 18, 16);

      // Shackle
      ctx.strokeStyle = '#7feaff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dx, dy - 20, 7, Math.PI, 0);
      ctx.stroke();

      // Keyhole
      ctx.fillStyle = '#0a2233';
      ctx.beginPath();
      ctx.arc(dx, dy - 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(dx - 1, dy - 14, 2, 5);

      ctx.restore();
    } else {
      // Unlocked Doorway Glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const openPulse = 0.5 + 0.5 * Math.sin(this.animTime * 2.5);
      const openGrad = ctx.createRadialGradient(dx, dy - 20, 4, dx, dy - 20, 40);
      openGrad.addColorStop(0, `rgba(255, 235, 120, ${0.45 * openPulse})`);
      openGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = openGrad;
      ctx.beginPath();
      ctx.arc(dx, dy - 20, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  renderLadders(ctx) {
    ctx.save();
    for (const ladder of this.ladders) {
      const lx = ladder.x;
      const topY = ladder.y1;
      const botY = ladder.y2;
      const rungSpacing = 16;

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
      ctx.lineWidth = 1.5;
      for (let y = topY + 8; y < botY; y += rungSpacing) {
        ctx.beginPath();
        ctx.moveTo(lx - ladder.width / 2, y);
        ctx.lineTo(lx + ladder.width / 2, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  renderSpores(ctx) {
    // Spores removed per user request
  }
}
