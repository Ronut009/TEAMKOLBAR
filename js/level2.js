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
import { EnemySpriteSheet } from './enemySprites.js';

export class Level2 {
  constructor() {
    this.width = 1024;
    this.height = 571;
    this.levelIndex = 2;
    this.enemySprites = new EnemySpriteSheet();

    // User-provided Level 2 art states: untouched, upper boulder moved,
    // and lower causeway formed. The image itself carries each large rock change.
    this.stageMaps = {
      base: new Image(),
      archerCrushed: new Image(),
      causeway: new Image()
    };
    this.stageMaps.base.src = 'assets/level2_base.jpg';
    this.stageMaps.archerCrushed.src = 'assets/level2_archer_crushed.jpg';
    this.stageMaps.causeway.src = 'assets/level2_causeway.jpg';

    // Legacy map fallback in case a supplied stage image cannot be loaded.
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

      // The first ladder drops from the upper-left ledge onto the lower shelf.
      { id: 'lower_left_shelf', x1: 0, x2: 240, y: 295, oneWay: true },

      // 2. Main left terrace (x=0..460, y=325)
      { id: 'middle_left', x1: 0, x2: 460, y: 325, oneWay: false },

      // 3. Golden Celestial Bridge (x=460..675, y=325, only active in Divine Form [X])
      { id: 'bridge_lvl2', x1: 460, x2: 675, y: 325, oneWay: true, divineOnly: true },

      // 4. Middle Right Platform (x=675..1024, y=325)
      { id: 'middle_right', x1: 675, x2: 1024, y: 325, oneWay: false },

      // Upper archer gallery has no collision; the archer is unreachable without crushing.

      // The lower pit is deliberately wider than a normal or divine jump.
      { id: 'cave_floor', x1: 40, x2: 350, y: 535, oneWay: false },

      // A raised dais on either side would let the player bypass the puzzle,
      // so the lower-right route is reachable only after the causeway appears.
      { id: 'floor_lower_right', x1: 730, x2: 1024, y: 535, oneWay: false, requiresCauseway: true }
    ];

    // Ladders (x position, top y, bottom y)
    this.ladders = [
      // Ladder 1: Upper-left starting ledge down to the lower shelf
      { id: 'ladder_left', x: 205, y1: 145, y2: 295, width: 26 },
      // Ladder 2: Main terrace down to the chest level
      { id: 'ladder_cave', x: 350, y1: 325, y2: 535, width: 26 }
    ];

    // Scorpions removed per user request
    this.scorpions = [];

    // Modular Asura Archer & Attached Homing Arrow Objects (Level 2)
    this.archers = [new Archer(855, 175, 'archer_primary')];
    this.archers[0].crushOnly = true;
    this.archers[0].engageRange = 250;
    this.archerKilled = false;
    this.kills = 0;
    this.killToastTimer = 0;
    this.killToastText = '';

    // The large overhead stone is part of the base artwork. [Q] shrinks it into
    // a rolling boulder that strikes the unreachable archer and settles in the pit.
    this.morphBox = {
      x: 650,
      y: 50,
      initialX: 650,
      initialY: 50,
      size: 32,
      isMorphed: false,
      isFalling: false,
      hasCrushed: false,
      hasLanded: false,
      vx: 0,
      vy: 0,
      rotation: 0,
      morphAuraTimer: 0
    };

    // Stones beside the chest become a round keystone and lower causeway.
    this.lowerBoulder = {
      x: 390,
      y: 518,
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
      x: 145,
      y: 505,
      radius: 48,
      opened: false,
      unlocked: false,
      glowPulse: 0
    };

    // Locked Door on Lower Right (Requires Key & Guards defeated)
    this.lockedDoor = {
      x: 920,
      y: 500,
      radius: 54,
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
    newArcher.crushOnly = true;
    newArcher.engageRange = 250;
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
    this.archerKilled = true;
    this.chest.unlocked = true;
    this.cameraShake = 1.0;
    this.killToastTimer = 3.2;
    this.killToastText = '⚜ SENTINEL ARCHER ELIMINATED — CACHE SEAL BROKEN! ⚜';
  }

  reset() {
    this.scorpions = [];

    // Reset the unreachable Asura Archer to the upper gallery.
    this.archers = [new Archer(855, 175, 'archer_primary')];
    this.archers[0].crushOnly = true;
    this.archers[0].engageRange = 250;
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
      x: 390, y: 518, size: 34,
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
   * 1. Upper Seal: transforms the overhead boulder and crushes the unreachable archer.
   * 2. Lower Chasm: reshapes the second stone into a bridge across the wide pit.
   */
  triggerMorph(playerX, playerY) {
    // 1. Upper Boulder Drop
    if (!this.morphBox.isMorphed) {
      if (Math.hypot(playerX - 720, playerY - 325) > 105) return false;
      this.morphBox.isMorphed = true;
      this.morphBox.morphAuraTimer = 1.2;
      this.morphBox.isFalling = true;
      this.morphBox.vx = 340;
      this.morphBox.vy = 0;
      this.cameraShake = 0.55;
      this.lastMorphMessage = "The overhanging boulder shrinks into a rolling stone and crashes into the unreachable archer!";
      return true;
    }

    // 2. Lower Causeway Formation
    const atLowerGap = (playerX >= 315 && playerX <= 445) || (playerX >= 640 && playerX <= 770);
    if (this.morphBox.hasLanded && this.chest.opened && !this.lowerBoulder.isMorphed &&
        atLowerGap && playerY >= 515) {
      this.lowerBoulder.isMorphed = true;
      this.lowerBoulder.isBridge = true;
      this.lowerBoulder.morphAuraTimer = 1.2;
      this.lowerCausewayActive = true;
      if (!this.platforms.some(plat => plat.id === 'morphed_causeway')) {
        this.platforms.push({ id: 'morphed_causeway', x1: 350, x2: 730, y: 535, oneWay: true });
      }
      this.startMeleeWave();
      this.cameraShake = 0.8;
      this.lastMorphMessage = "The second stone becomes a round keystone and forms a bridge across the lower chasm. The guards awaken!";
      return true;
    }
    return false;
  }

  startMeleeWave() {
    if (this.enemyWaveStarted) return;
    this.enemyWaveStarted = true;
    this.meleeEnemies = [
      { x: 760, y: 535, hp: 4, attackTimer: 0.8, hitFlash: 0, dead: false, phase: 0, facing: 'left', isMoving: false, isAttacking: false, attackAnimTimer: 0, attackAnimDuration: 0.72, hurtTimer: 0, animTime: 0 },
      { x: 970, y: 535, hp: 4, attackTimer: 1.5, hitFlash: 0, dead: false, phase: 1, facing: 'left', isMoving: false, isAttacking: false, attackAnimTimer: 0, attackAnimDuration: 0.72, hurtTimer: 0, animTime: 0 }
    ];
    this.killToastText = '⚔ THE LOWER GUARD WAKES';
    this.killToastTimer = 2.4;
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.platforms) {
      if ((plat.id === 'morphed_causeway' || plat.requiresCauseway) && !this.lowerCausewayActive) continue;
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
      if ((plat.id === 'morphed_causeway' || plat.requiresCauseway) && !this.lowerCausewayActive) continue;
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
        x: this.morphBox.x,
        y: this.morphBox.y,
        prompt: '[Q] TRANSMUTE BOULDER',
        text: "The upper gallery is unreachable. Use transmutation [Q] to roll the overhead boulder into the archer."
      };
    }

    // 2. Lower Gap (Form a causeway)
    const nearLowerGap = Math.hypot(px - 350, py - 535) <= 120 || Math.hypot(px - 730, py - 535) <= 120;
    if (this.morphBox.hasLanded && this.chest.opened && !this.lowerBoulder.isMorphed && nearLowerGap) {
      return {
        type: 'morph_box',
        speaker: 'kali',
        title: '⚜ MAA KALI: CAUSEWAY ⚜',
        x: this.lowerBoulder.x,
        y: this.lowerBoulder.y,
        prompt: '[Q] CREATE CAUSEWAY',
        text: "The stones beside the chest can become a round keystone. Use transmutation [Q] to form a causeway across the lower abyss."
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
        prompt: this.lockedDoor.unlocked
          ? '[E] ENTER SANCTUM'
          : (this.canUnlockDoor() ? '[E] UNLOCK GATE' : '[E] SEALED GATE'),
        text: this.lockedDoor.unlocked
          ? "The sanctum gate stands unsealed. Step boldly into the dark passage to conquer the catacombs."
          : (this.canUnlockDoor()
              ? "The key is yours and the lower guards are defeated. Press [E] to open the sanctum gate, then walk through it."
              : (!this.chest.opened
                  ? "The gate needs the Sanctum Key. Break the archer's ward, climb down to the cave chest, and claim it."
                  : (!this.lowerCausewayActive
                      ? "The key fits, but two guards block the sanctum. Shape the lower boulder into a causeway to reach them."
                      : "Two sentinels still guard the gate. Defeat them, then return here with the key.")))
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
    // Unlocking the padlock is separate from crossing through the doorway.
    if (this.lockedDoor.unlocked && px >= 940 && px <= 1010 && py >= 485 && py <= 550) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  canUnlockDoor() {
    return Boolean(
      this.chest.opened &&
      this.enemyWaveStarted &&
      this.meleeEnemies.length > 0 &&
      this.meleeEnemies.every(enemy => enemy.dead)
    );
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
      const canSeePlayer = player && archer.alive && !this.morphBox.isFalling &&
        Math.hypot(player.x - archer.x, player.y - archer.y) <= (archer.engageRange ?? Infinity);
      if (!canSeePlayer && archer.alive) {
        // Keep the unreachable gallery archer from sniping the entrance from across the map.
        archer.cooldownTimer = archer.shootCooldown;
        if (archer.state === 'aim') {
          archer.state = 'idle';
          archer.frame = 0;
          archer.animTimer = 0;
        }
      }
      archer.update(dt, canSeePlayer ? player : null, this);
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
      this.morphBox.x += this.morphBox.vx * dt;
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
              this.morphBox.vx = -700;
            }
          }
        }
      }

      // Middle floor shaft rumble
      if (prevY < 325 && this.morphBox.y >= 325) {
        this.cameraShake = Math.max(this.cameraShake, 0.42);
      }

      // The first boulder settles in the widened lower pit.
      if (this.morphBox.y >= 535 - this.morphBox.size / 2) {
        this.morphBox.y = 535 - this.morphBox.size / 2;
        this.morphBox.isFalling = false;
        this.morphBox.hasLanded = true;
        this.morphBox.vx = 0;
        this.morphBox.vy = 0;
        if (this.archerKilled) {
          this.chest.unlocked = true;
          this.killToastText = '⚜ BOULDER LANDED — CLAIM THE SANCTUM KEY ⚜';
          this.killToastTimer = 3.2;
        }
      }
    }

    // Update melee enemies
    for (const enemy of this.meleeEnemies) {
      if (enemy.dead) continue;
      enemy.phase += dt * 7;
      enemy.animTime += dt;
      if (enemy.isAttacking) {
        enemy.attackAnimTimer += dt;
        if (enemy.attackAnimTimer >= enemy.attackAnimDuration) {
          enemy.attackAnimTimer = 0;
          enemy.isAttacking = false;
        }
      }
      enemy.isMoving = false;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
      enemy.attackTimer -= dt;
      const dx = playerX - enemy.x;

      // Player melee attack hitting enemy
      if (player?.isAttacking && Math.abs(dx) < 56 && Math.abs(playerY - enemy.y) < 42 && player.claimSwingHit(enemy)) {
        enemy.hp -= player.swordDamage;
        enemy.hitFlash = 0.3;
        enemy.hurtTimer = 0.3;
        if (enemy.hp <= 0) {
          enemy.dead = true;
          this.kills++;
          this.killToastText = '⚔ LOWER GUARD DEFEATED';
          this.killToastTimer = 1.4;
        }
      } else if (Math.abs(dx) > 34) {
        enemy.facing = dx < 0 ? 'left' : 'right';
        enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) - 34, 42 * dt);
        enemy.isMoving = true;
        enemy.isAttacking = false;
        enemy.attackAnimTimer = 0;
      } else if (enemy.attackTimer <= 0 && player && player.invulnerableTimer <= 0) {
        enemy.facing = dx < 0 ? 'left' : 'right';
        player.takeDamage(3, (playerX < enemy.x ? -180 : 180), -120);
        enemy.attackTimer = 1.25;
        enemy.attackAnimTimer = 0;
        enemy.isAttacking = true;
        this.cameraShake = 0.25;
      }
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderBackground(ctx, isDivine = false) {
    ctx.save();

    const stageMap = this.lowerCausewayActive
      ? this.stageMaps.causeway
      : this.morphBox.isMorphed
        ? this.stageMaps.archerCrushed
        : this.stageMaps.base;
    if (stageMap.complete && stageMap.naturalWidth > 0) {
      ctx.drawImage(stageMap, 0, 0, this.width, this.height);
    } else if (this.baseMapLoaded) {
      ctx.drawImage(this.baseMapImg, 0, 0, this.width, this.height);
    } else if (this.bgLoaded) {
      ctx.drawImage(this.bgImg, 0, 0, this.width, this.height);
    }

    this.renderLowerChasm(ctx);

    // The upper crossing still uses the existing Divine Form [X] mechanic.
    this.renderGoldenBridge(ctx, isDivine);

    this.renderArchers(ctx);

    this.renderMorphBox(ctx);
    this.renderLowerBoulder(ctx);
    this.renderMeleeEnemies(ctx);

    this.renderObjective(ctx);
    this.renderChest(ctx);
    this.renderLockedDoor(ctx);
    this.renderLadders(ctx);

    ctx.restore();
  }

  renderScorpions(ctx) {
    // Scorpions removed per user request
  }

  renderLowerChasm(ctx) {
    ctx.save();
    const depth = ctx.createLinearGradient(0, 480, 0, this.height);
    depth.addColorStop(0, 'rgba(5, 13, 23, 0.12)');
    depth.addColorStop(0.18, 'rgba(8, 17, 29, 0.88)');
    depth.addColorStop(0.7, '#091522');
    depth.addColorStop(1, '#050b13');
    ctx.fillStyle = depth;
    ctx.fillRect(350, 498, 380, this.height - 498);

    // Broken stone lips make the lower jump read as a real chasm.
    ctx.fillStyle = '#47392f';
    ctx.beginPath();
    ctx.moveTo(350, 515); ctx.lineTo(358, 512); ctx.lineTo(366, 518);
    ctx.lineTo(374, 514); ctx.lineTo(382, 519); ctx.lineTo(382, 535);
    ctx.lineTo(350, 535); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(730, 515); ctx.lineTo(722, 512); ctx.lineTo(714, 518);
    ctx.lineTo(706, 514); ctx.lineTo(698, 519); ctx.lineTo(698, 535);
    ctx.lineTo(730, 535); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(193, 147, 87, 0.5)';
    ctx.fillRect(352, 515, 25, 2);
    ctx.fillRect(703, 515, 25, 2);

    const glow = ctx.createRadialGradient(540, 541, 5, 540, 541, 142);
    glow.addColorStop(0, 'rgba(32, 164, 190, 0.28)');
    glow.addColorStop(1, 'rgba(4, 12, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(350, 498, 380, this.height - 498);
    ctx.restore();
  }

  renderLowerBoulder(ctx) {
    const stone = this.lowerBoulder;
    if (!stone.isBridge) return;

    ctx.save();
    const causeway = ctx.createLinearGradient(350, 0, 730, 0);
    causeway.addColorStop(0, '#534636');
    causeway.addColorStop(0.48, '#a38a67');
    causeway.addColorStop(1, '#514434');
    ctx.fillStyle = causeway;
    ctx.fillRect(350, 537, 380, 15);

    ctx.fillStyle = '#cfb27d';
    ctx.fillRect(350, 533, 380, 4);
    ctx.strokeStyle = 'rgba(78,237,255,0.8)';
    ctx.lineWidth = 1;
    for (let x = 362; x < 724; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 538); ctx.lineTo(x + 8, 550); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(78,237,255,0.24)';
    ctx.fillRect(350, 552, 380, 5);

    // The transformed round stone remains visible as the causeway's keystone.
    const x = stone.x;
    const core = ctx.createRadialGradient(x - 4, 526, 2, x, 535, 17);
    core.addColorStop(0, '#c5ad86');
    core.addColorStop(0.65, '#78634b');
    core.addColorStop(1, '#3c3024');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, 535, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cda24e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, 535, 8, 0, Math.PI * 2);
    ctx.stroke();

    if (stone.morphAuraTimer > 0) {
      ctx.strokeStyle = `rgba(78,237,255,${Math.min(1, stone.morphAuraTimer)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(347, 530, 386, 26);
    }
    ctx.restore();
  }

  renderMeleeEnemies(ctx) {
    for (const enemy of this.meleeEnemies) {
      if (!this.enemySprites.render(ctx, enemy, { width: 66, height: 82 })) {
        const x = Math.round(enemy.x), y = Math.round(enemy.y);
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = enemy.hitFlash > 0 ? '#fff1bd' : '#322d3a';
        ctx.fillRect(-10, -39, 20, 23);
        ctx.fillStyle = '#9b765b';
        ctx.fillRect(-8, -53, 16, 15);
        ctx.restore();
      }
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
    // Keep this HUD in the viewport while the camera follows Rakti through the level.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Sands of Time Styled Objective Bar
    const boxW = Math.min(420, ctx.canvas.width - 28);
    const boxH = 26;
    const boxX = ctx.canvas.width - boxW - 14;
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
    // The starting artwork already shows the overhanging boulder. Draw only
    // its transformed rolling form after the player uses [Q].
    if (!this.morphBox.isMorphed) return;

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

    // Small round stone transformed from the large overhead boulder.
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
