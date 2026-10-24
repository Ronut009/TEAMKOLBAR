/**
 * ============================================================================
 * RUINS OF SURYA - LEVEL 3: THE HEART OF HUBRIS (js/level3.js)
 * ============================================================================
 * The Scripted Defeat & The Fall of Pride:
 * - Full Combined Mob Roster:
 *   * Sword Goblins (melee combo slashes & purple magic cube projectiles)
 *   * Skeleton Archers (long-range bow draw, bi-directional aim & bone arrows)
 * - Infinite Horde Swarm System:
 *   * Pincer surround movement: Mobs flank and enclose the player from both sides
 *   * Unending continuous spawn waves (infinite mobs until player falls)
 * - The Goal Is to Fail:
 *   * Escaping through the Maw is barred by cursed ancient seals
 *   * The player can ONLY proceed by dying in this level
 *   * Scripted Defeat fades to black, displays the philosophical epilogue,
 *     and transcends into LEVEL 4: THE ASTRAL SANCTUM!
 * ============================================================================
 */

import { SwordGoblin } from './goblin.js';
import { Archer } from './archer.js';

export class Level3 {
  constructor() {
    this.width = 1024;
    this.height = 559;
    this.levelIndex = 3;

    // 1. Background artwork
    this.bgImg = new Image();
    this.bgLoaded = false;
    this.bgImg.onload = () => { this.bgLoaded = true; };
    this.bgImg.onerror = () => { this.bgLoaded = false; };
    this.bgImg.src = 'assets/level3_map.png';
    if (this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      this.bgLoaded = true;
    }

    // 2. Comprehensive 3-Tier Platform Architecture
    this.platforms = [
      // --- TIER 1: UPPER LEVEL ---
      { id: 'spawn_ledge', x1: 20, x2: 210, y: 114, oneWay: true },
      { id: 'stair_L1', x1: 190, x2: 240, y: 136, oneWay: true },
      { id: 'stair_L2', x1: 225, x2: 275, y: 162, oneWay: true },
      { id: 'stair_L3', x1: 260, x2: 310, y: 190, oneWay: true },
      { id: 'stair_L4', x1: 285, x2: 345, y: 224, oneWay: true },
      { id: 'stair_L5', x1: 315, x2: 380, y: 258, oneWay: true },
      { id: 'divine_bridge', x1: 200, x2: 480, y: 136, oneWay: true, divineOnly: true },
      { id: 'upper_canopy', x1: 480, x2: 740, y: 165, oneWay: true },
      { id: 'altar_step1', x1: 730, x2: 785, y: 195, oneWay: true },
      { id: 'altar_step2', x1: 765, x2: 820, y: 178, oneWay: true },
      { id: 'altar_step3', x1: 800, x2: 855, y: 162, oneWay: true },
      { id: 'altar_platform', x1: 840, x2: 940, y: 148, oneWay: true },

      // --- TIER 2: MIDDLE LEVEL (STABLE GROUND) ---
      { id: 'stable_terrace', x1: 100, x2: 360, y: 262, oneWay: false },
      { id: 'stable_step1', x1: 200, x2: 340, y: 296, oneWay: false },
      { id: 'stable_step2', x1: 240, x2: 380, y: 330, oneWay: false },
      { id: 'stable_step3', x1: 280, x2: 420, y: 362, oneWay: false },
      { id: 'egg_sanctuary', x1: 320, x2: 600, y: 388, oneWay: false },
      { id: 'root_stair_R1', x1: 580, x2: 640, y: 368, oneWay: true },
      { id: 'root_stair_R2', x1: 630, x2: 690, y: 348, oneWay: true },
      { id: 'root_stair_R3', x1: 680, x2: 745, y: 328, oneWay: true },
      { id: 'right_balcony', x1: 735, x2: 860, y: 310, oneWay: true },

      // --- DESCENT PATHWAYS TO LOWER LEVEL ---
      { id: 'egg_descent_step1', x1: 460, x2: 540, y: 425, oneWay: true },
      { id: 'egg_descent_step2', x1: 440, x2: 520, y: 455, oneWay: true },
      { id: 'right_descent_step1', x1: 760, x2: 850, y: 370, oneWay: true },
      { id: 'right_descent_step2', x1: 740, x2: 840, y: 425, oneWay: true },

      // --- TIER 3: LOWER LEVEL ---
      { id: 'stone_1', x1: 420, x2: 490, y: 480, oneWay: false },
      { id: 'stone_2', x1: 480, x2: 560, y: 482, oneWay: false },
      { id: 'stone_3', x1: 550, x2: 630, y: 480, oneWay: false },
      { id: 'stone_4', x1: 620, x2: 700, y: 478, oneWay: false },
      { id: 'stone_5', x1: 690, x2: 770, y: 476, oneWay: false },
      { id: 'stone_6', x1: 760, x2: 840, y: 474, oneWay: false },
      { id: 'maw_floor', x1: 830, x2: 1024, y: 472, oneWay: false }
    ];

    // 3. Preload Goblin Animation Frames & Spritesheet
    this.goblinWalkFrames = [];
    for (let i = 0; i <= 5; i++) {
      const img = new Image();
      img.src = `assets/anims/goblin/walk_${i}.png`;
      this.goblinWalkFrames.push(img);
    }
    this.goblinAttackFrames = [];
    for (let i = 0; i <= 5; i++) {
      const img = new Image();
      img.src = `assets/anims/goblin/attack_${i}.png`;
      this.goblinAttackFrames.push(img);
    }
    this.goblinMagicFrames = [];
    for (let i = 0; i <= 4; i++) {
      const img = new Image();
      img.src = `assets/anims/goblin/magic_${i}.png`;
      this.goblinMagicFrames.push(img);
    }
    this.goblinHurtFrames = [];
    for (let i = 0; i <= 3; i++) {
      const img = new Image();
      img.src = `assets/anims/goblin/hurt_${i}.png`;
      this.goblinHurtFrames.push(img);
    }
    this.goblinDefeatedImg = new Image();
    this.goblinDefeatedImg.src = 'assets/anims/goblin/defeated.png';
    this.goblinCubeImg = new Image();
    this.goblinCubeImg.src = 'assets/anims/goblin/cube.png';

    this.mobSpritesheetImg = new Image();
    this.mobSpritesheetLoaded = false;
    this.mobSpritesheetImg.onload = () => { this.mobSpritesheetLoaded = true; };
    this.mobSpritesheetImg.src = 'assets/mob_spritesheet.jpg';
    if (this.mobSpritesheetImg.complete && this.mobSpritesheetImg.naturalWidth > 0) {
      this.mobSpritesheetLoaded = true;
    }

    this.goblinSprites = {
      walk: this.goblinWalkFrames,
      attack: this.goblinAttackFrames,
      magic: this.goblinMagicFrames,
      hurt: this.goblinHurtFrames,
      defeated: this.goblinDefeatedImg,
      cube: this.goblinCubeImg,
      spritesheet: this.mobSpritesheetImg
    };

    // 4. Preload Skeleton Archer Animation Frames (From Previous Levels)
    this.archerIdleFrames = [];
    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/archer_idle_${i}.png`;
      this.archerIdleFrames.push(img);
    }
    this.archerPullFrames = [];
    this.archerShootFrames = [];
    for (let i = 0; i < 4; i++) {
      const p = new Image();
      p.src = `assets/anims/archer_pull_${i}.png`;
      this.archerPullFrames.push(p);

      const s = new Image();
      s.src = `assets/anims/archer_shoot_${i}.png`;
      this.archerShootFrames.push(s);
    }
    this.archerDieFrames = [];
    for (let i = 0; i < 4; i++) {
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

    this.archerSprites = {
      idle: this.archerIdleImg,
      defeated: this.archerDefeatedImg,
      arrow: this.archerArrowImg,
      idleFrames: this.archerIdleFrames,
      pullFrames: this.archerPullFrames,
      shootFrames: this.archerShootFrames,
      dieFrames: this.archerDieFrames
    };

    // 5. Active Entities Collections
    this.goblins = [];
    this.archers = [];
    this.projectiles = []; // Magic Cubes
    this.levelTime = 0.0;
    this.archerSpawnTimer = 0.0;
    this.goblinSpawnTimer = 0.0;
    this.floodSpawnCount = 0;
    this.infiniteHordeActive = false;

    // Objectives State
    this.hasKey = false;
    this.hasEgg = false;
    this.hubrisStage = 1;       // 1 = Confidence, 2 = Escalation, 3 = Flood, 4 = Fall
    this.isDefeated = false;
    this.defeatFade = 0.0;
    this.epilogueAlpha = 0.0;
    this.level4ReadyTimer = 0.0;
    this.proceedToLevel4 = false;

    // Interactive Landmarks
    this.keyAltar = { x: 880, y: 148, radius: 45, collected: false };
    this.ancientEgg = { x: 480, y: 388, radius: 50, harvested: false, pulse: 0.0 };
    this.mawDoor = { x: 940, y: 472, radius: 55, unlocked: false };

    this.kills = 0;
    this.killToastTimer = 0;
    this.killToastText = '';
    this.cameraShake = 0;

    // Ambient Twilight Spores
    this.spores = [];
    for (let i = 0; i < 40; i++) {
      this.spores.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 14,
        vy: -10 - Math.random() * 20,
        radius: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.6,
        color: Math.random() > 0.5 ? '#4eedff' : '#fef08a'
      });
    }

    // Dialogue State
    this.dialogueQueue = [];
    this.dialogueTimer = 0;
    this.activeDialogue = null;

    // Initial Stage 1 Mob Setup
    this.spawnInitialMobs();

    this.queueDialogue([
      "I can take them on.",
      "Nothing in these cursed ruins can stand against my blade."
    ]);
  }

  getPlatform(id) {
    return this.platforms.find(p => p.id === id) || null;
  }

  spawnGoblin(x, y, platformId = null, flank = 0) {
    const plat = platformId ? this.getPlatform(platformId) : null;
    const g = new SwordGoblin(x, y, `goblin_${Date.now()}_${Math.random().toFixed(4)}`, plat);
    g.flank = flank || (Math.random() > 0.5 ? 1 : -1);
    g.isSurrounding = this.infiniteHordeActive;
    this.goblins.push(g);
    return g;
  }

  spawnArcher(x, y, platformId = null) {
    const archer = new Archer(x, y, `archer_${Date.now()}_${Math.random().toFixed(4)}`);
    this.archers.push(archer);
    return archer;
  }

  spawnInitialMobs() {
    this.goblins = [];
    this.archers = [];
    this.projectiles = [];

    // Stage 1: Manageable confidence-building encounters
    this.spawnGoblin(620, 165, 'upper_canopy', 1);
    this.spawnGoblin(230, 262, 'stable_terrace', -1);
    this.spawnArcher(880, 148, 'altar_platform');
  }

  addProjectile(proj) {
    this.projectiles.push(proj);
  }

  registerKill(mob) {
    this.kills++;
    this.killToastTimer = 2.0;
    this.killToastText = '+1 KILL — ENEMY SLAIN!';
    this.cameraShake = 0.35;

    // Narrative Hubris Reactions
    if (this.kills === 1 && this.hubrisStage === 1) {
      this.queueDialogue([
        "Too easy! They crumble before my divine steel.",
        "I can get rid of all of them."
      ]);
    } else if (this.kills === 5 && this.hubrisStage <= 2) {
      this.queueDialogue([
        "A few weak goblins and archers cannot stop my destiny."
      ]);
    }
  }

  reset() {
    this.hasKey = false;
    this.hasEgg = false;
    this.hubrisStage = 1;
    this.isDefeated = false;
    this.defeatFade = 0.0;
    this.epilogueAlpha = 0.0;
    this.level4ReadyTimer = 0.0;
    this.proceedToLevel4 = false;
    this.cameraShake = 0;

    this.kills = 0;
    this.killToastTimer = 0;
    this.killToastText = '';
    this.levelTime = 0.0;
    this.archerSpawnTimer = 0.0;
    this.goblinSpawnTimer = 0.0;
    this.floodSpawnCount = 0;
    this.infiniteHordeActive = false;

    this.keyAltar.collected = false;
    this.ancientEgg.harvested = false;

    this.spawnInitialMobs();

    this.queueDialogue([
      "I can take them on.",
      "Nothing in these ruins can stand against my blade."
    ]);
  }

  queueDialogue(lines) {
    this.dialogueQueue = [...lines];
    this.showNextDialogue();
  }

  showNextDialogue() {
    if (this.dialogueQueue.length > 0) {
      this.activeDialogue = this.dialogueQueue.shift();
      this.dialogueTimer = 3.2;
    } else {
      this.activeDialogue = null;
    }
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) continue;
      if (plat.oneWay && droppingThrough) continue;

      if (x >= plat.x1 - 4 && x <= plat.x2 + 4) {
        if (prevY <= plat.y + 24 && currY >= plat.y - 6) {
          return plat;
        }
      }
    }
    return null;
  }

  isOnPlatform(x, y, isDivine = false) {
    for (const plat of this.platforms) {
      if (plat.divineOnly && !isDivine) continue;

      if (x >= plat.x1 - 4 && x <= plat.x2 + 4) {
        if (Math.abs(y - plat.y) <= 8) {
          return plat;
        }
      }
    }
    return null;
  }

  resolvePitWallCollision(x, y) {
    return Math.max(16, Math.min(x, this.width - 16));
  }

  getNearbyInteractable(px, py) {
    // 1. Sanctum Key at Top-Right Shrine Altar
    if (!this.keyAltar.collected) {
      const dKey = Math.hypot(px - this.keyAltar.x, py - this.keyAltar.y);
      if (dKey <= this.keyAltar.radius) {
        return {
          type: 'key',
          x: this.keyAltar.x,
          y: this.keyAltar.y,
          prompt: '[E] TAKE SANCTUM KEY',
          text: "* You grasp the glowing Sanctum Key from the shrine altar!\n* Golden runes shimmer across the canopy bridge.\n* Descend into the center hollow to harvest the Ancient Egg!"
        };
      }
    }

    // 2. Ancient Egg in Center Root Hollow
    if (this.hasKey && !this.ancientEgg.harvested) {
      const dEgg = Math.hypot(px - this.ancientEgg.x, py - this.ancientEgg.y);
      if (dEgg <= this.ancientEgg.radius) {
        return {
          type: 'egg',
          x: this.ancientEgg.x,
          y: this.ancientEgg.y,
          prompt: '[E] HARVEST ANCIENT EGG',
          text: "* You pry the Ancient Golden Egg from its root sanctuary!\n* The earth trembles violently!\n* An endless horde of mobs emerges to surround and trap you!"
        };
      }
    }

    // 3. Monstrous Maw Doorway (THE TRAP - FALSE GOAL)
    const dDoor = Math.hypot(px - this.mawDoor.x, py - this.mawDoor.y);
    if (dDoor <= this.mawDoor.radius) {
      return {
        type: 'maw_door',
        x: this.mawDoor.x,
        y: this.mawDoor.y,
        prompt: '[E] ESCAPE THROUGH MAW',
        text: "* The fanged stone maw is barred by ancient cursed runes!\n* In your arrogance, you sought an exit where none exists!\n* The infinite swarm cuts off every retreat!"
      };
    }

    return null;
  }

  // The goal in Level 3 is to FAIL; player cannot win by reaching an exit!
  checkLevelComplete(px, py) {
    return false;
  }

  // ==========================================================================
  // HIGH-INTENSITY & SKELETON ARCHER SPAWNER SYSTEM
  // ==========================================================================

  spawnTacticalArcher(player = null) {
    const px = player ? player.x : 512;
    const py = player ? player.y : 300;
    const vantageSpots = [
      { x: 880, y: 148, plat: 'altar_platform' },
      { x: 790, y: 310, plat: 'right_balcony' },
      { x: 620, y: 165, plat: 'upper_canopy' },
      { x: 90,  y: 114, plat: 'spawn_ledge' },
      { x: 230, y: 262, plat: 'stable_terrace' },
      { x: 380, y: 388, plat: 'egg_sanctuary' },
      { x: 550, y: 388, plat: 'egg_sanctuary' },
      { x: 880, y: 472, plat: 'maw_floor' },
      { x: 960, y: 472, plat: 'maw_floor' },
      { x: 460, y: 480, plat: 'stone_1' },
      { x: 660, y: 478, plat: 'stone_4' },
      { x: 790, y: 474, plat: 'stone_6' }
    ];

    // Favor vantage points that provide good line of sight and flank the player
    const goodSpots = vantageSpots.filter(s => Math.hypot(s.x - px, s.y - py) > 80);
    const chosen = (goodSpots.length > 0)
      ? goodSpots[Math.floor(Math.random() * goodSpots.length)]
      : vantageSpots[Math.floor(Math.random() * vantageSpots.length)];

    const archer = this.spawnArcher(chosen.x, chosen.y, chosen.plat);
    if (player) {
      archer.facing = (player.x > archer.x) ? 'right' : 'left';
    }
    return archer;
  }

  spawnTacticalGoblin(player = null, flank = 0) {
    const px = player ? player.x : 512;
    const py = player ? player.y : 300;
    const dir = flank || (Math.random() > 0.5 ? 1 : -1);

    // Pick spawn offset flanking player
    let sx = px + dir * (130 + Math.random() * 90);
    sx = Math.max(30, Math.min(this.width - 30, sx));

    // Choose appropriate tier height based on player location
    let sy = 388;
    let platId = 'egg_sanctuary';
    if (py < 210) {
      sy = (sx > 480) ? 165 : 114;
      platId = (sx > 480) ? 'upper_canopy' : 'spawn_ledge';
    } else if (py < 360) {
      sy = (sx > 650) ? 310 : 262;
      platId = (sx > 650) ? 'right_balcony' : 'stable_terrace';
    } else {
      sy = (sx > 740) ? 472 : 388;
      platId = (sx > 740) ? 'maw_floor' : 'egg_sanctuary';
    }

    const g = this.spawnGoblin(sx, sy, platId, dir);
    g.isSurrounding = true;
    return g;
  }

  updateSpawning(dt, player = null) {
    this.levelTime += dt;

    // Give the player time to reach the key and egg before the scripted horde begins.
    if (!this.hasEgg) return;

    // 1. Archer Spawning Rule:
    // Archers spawn every second after the first 7 seconds!
    if (this.levelTime >= 7.0) {
      this.archerSpawnTimer -= dt;
      if (this.archerSpawnTimer <= 0) {
        this.archerSpawnTimer = 1.0; // Spawns an archer every 1.0 second!
        this.spawnTacticalArcher(player);

        if (!this.infiniteHordeActive) {
          this.infiniteHordeActive = true;
          this.hubrisStage = 3;
          this.cameraShake = 0.5;
          this.queueDialogue([
            "Wait... where are all these archers coming from?!",
            "Arrows raining from every vantage point!"
          ]);
        }
      }
    }

    // 2. High-Spawn Rate Melee Goblins:
    // Melee goblins aggressively spawn and hunt the player!
    this.goblinSpawnTimer -= dt;

    if (this.levelTime < 7.0) {
      // First 7 seconds: Continuous spawn every 1.4 seconds
      if (this.goblinSpawnTimer <= 0) {
        this.goblinSpawnTimer = 1.4;
        const flank = (Math.random() > 0.5) ? 1 : -1;
        this.spawnTacticalGoblin(player, flank);
      }
    } else {
      // After 7 seconds: Non-stop horde swarm every 0.7s - 1.0s
      if (this.goblinSpawnTimer <= 0) {
        this.floodSpawnCount++;
        const interval = Math.max(0.65, 1.0 - (this.floodSpawnCount * 0.02));
        this.goblinSpawnTimer = interval;

        const flank = (this.floodSpawnCount % 2 === 0) ? -1 : 1;
        this.spawnTacticalGoblin(player, flank);

        if (this.floodSpawnCount % 4 === 0) {
          this.cameraShake = 0.4;
        }
      }
    }
  }

  // ==========================================================================
  // UPDATE LOOP & SMOOTH STAIR STEPPING ASSIST
  // ==========================================================================

  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.ancientEgg.pulse += dt * 3.0;

    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        this.showNextDialogue();
      }
    }

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
    }

    if (this.killToastTimer > 0) {
      this.killToastTimer -= dt;
    }

    // 0. Update Ambient Spores
    for (const sp of this.spores) {
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      if (sp.y < -10) {
        sp.y = this.height + 10;
        sp.x = Math.random() * this.width;
      }
      if (sp.x < 0) sp.x = this.width;
      if (sp.x > this.width) sp.x = 0;
    }

    // 1. Smooth Stair-Stepping Helper
    if (player && player.isGrounded && Math.abs(player.vx) > 10) {
      const dir = Math.sign(player.vx);
      const checkX = player.x + dir * 14;

      for (const plat of this.platforms) {
        if (plat.divineOnly && !isDivine) continue;
        if (checkX >= plat.x1 && checkX <= plat.x2) {
          const dy = player.y - plat.y;
          if (dy >= 6 && dy <= 28) {
            player.y = plat.y;
            player.currentPlatform = plat;
            break;
          }
        }
      }
    }

    // 2. Spike Pit Hazard (x: 180..415, y >= 475)
    if (player && player.x >= 180 && player.x <= 415 && player.y >= 475) {
      player.takeDamage(10, 0, -280);
      this.cameraShake = 0.6;
    }

    // 3. Check Player Defeat (Stage 4 Scripted Defeat -> LEVEL 4 TRANSCENDENCE)
    if (player && player.hp <= 0 && !this.isDefeated) {
      this.isDefeated = true;
      this.hubrisStage = 4;
      this.level4ReadyTimer = 0.0;
      this.proceedToLevel4 = false;
    }

    if (this.isDefeated) {
      this.defeatFade = Math.min(1.0, this.defeatFade + dt * 0.45);
      if (this.defeatFade >= 0.8) {
        this.epilogueAlpha = Math.min(1.0, this.epilogueAlpha + dt * 0.6);
      }
      if (this.defeatFade >= 1.0) {
        this.level4ReadyTimer += dt;
        // After reading philosophical text, ready to ascend into Level 4!
        if (this.level4ReadyTimer >= 3.5) {
          this.proceedToLevel4 = true;
        }
      }
      return; // Freeze entity updates during scripted defeat
    }

    // 4. Update Spawning (Infinite Mobs Surrounding Player)
    this.updateSpawning(dt, player);

    // 5. Update Sword Goblins
    for (let i = this.goblins.length - 1; i >= 0; i--) {
      const g = this.goblins[i];
      g.update(dt, player, this);
      if (g.canBeRemoved) {
        this.goblins.splice(i, 1);
      }
    }

    // 6. Update Skeleton Archers (Previous level mobs)
    for (let i = this.archers.length - 1; i >= 0; i--) {
      const a = this.archers[i];
      a.update(dt, player, this);
      if (a.canBeRemoved) {
        this.archers.splice(i, 1);
      }
    }

    // 7. Update Magic Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.update(dt, player, this)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ==========================================================================
  // RENDERING (CANVAS 2D)
  // ==========================================================================

  renderBackground(ctx, isDivine = false) {
    ctx.save();

    // 1. Level 3 Artwork (level3_map.png / temple_map_lvl3.png / level3_map.jpg)
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#06101e';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Ambient Twilight Spores
    for (const sp of this.spores) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Divine Celestial Bridge (Visible only when [X] Divine Form is active)
    if (isDivine) {
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(200, 136);
      ctx.quadraticCurveTo(340, 126, 480, 165);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Sanctum Key on Altar (Top-Right: 880, 148)
    if (!this.keyAltar.collected) {
      ctx.save();
      const floatY = this.keyAltar.y - 18 + Math.sin(this.ancientEgg.pulse) * 4;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(this.keyAltar.x, floatY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔑', this.keyAltar.x, floatY);
      ctx.restore();
    }

    // 5. Ancient Egg (Center: 480, 388)
    if (!this.ancientEgg.harvested) {
      ctx.save();
      const scale = 1.0 + Math.sin(this.ancientEgg.pulse) * 0.12;
      ctx.fillStyle = 'rgba(255, 234, 136, 0.25)';
      ctx.beginPath();
      ctx.arc(this.ancientEgg.x, this.ancientEgg.y - 16, 28 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Monstrous Maw Void Seal (Bottom-Right: 940, 472)
    ctx.save();
    ctx.fillStyle = 'rgba(78, 237, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(this.mawDoor.x, this.mawDoor.y - 10, 22 + Math.sin(this.ancientEgg.pulse * 1.5) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Render Skeleton Archers (From previous level)
    for (const archer of this.archers) {
      archer.render(ctx, this.archerSprites);
    }

    // 8. Render Sword Goblin Entities
    for (const goblin of this.goblins) {
      goblin.render(ctx, this.goblinSprites);
    }

    // 9. Render Magic Cube Projectiles
    for (const proj of this.projectiles) {
      proj.render(ctx, this.goblinSprites.cube, this.goblinSprites.spritesheet);
    }

    // 10. Kill Toast Notification
    if (this.killToastTimer > 0) {
      ctx.save();
      const alpha = Math.min(1.0, this.killToastTimer * 1.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      const tw = 290;
      const th = 32;
      const tx = (this.width - tw) / 2;
      const ty = 70;
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeRect(tx, ty, tw, th);

      ctx.fillStyle = '#fca5a5';
      ctx.font = '13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.killToastText, this.width / 2, ty + th / 2);
      ctx.restore();
    }

    // 11. Protagonist Thought Bubble / Speech Caption
    if (this.activeDialogue && !this.isDefeated) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;

      const dw = 360;
      const dh = 36;
      const dx = (this.width - dw) / 2;
      const dy = 25;

      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeRect(dx, dy, dw, dh);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`* "${this.activeDialogue}"`, this.width / 2, dy + dh / 2);
      ctx.restore();
    }

    // 12. Stage 4 Scripted Defeat & Philosophical Transition to Level 4
    if (this.defeatFade > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${this.defeatFade})`;
      ctx.fillRect(0, 0, this.width, this.height);

      if (this.epilogueAlpha > 0) {
        ctx.globalAlpha = this.epilogueAlpha;

        ctx.fillStyle = '#ffd700';
        ctx.font = 'italic 20px serif';
        ctx.textAlign = 'center';
        ctx.fillText('“Pride goeth before destruction, and an haughty spirit before a fall.”', this.width / 2, 120);

        ctx.fillStyle = '#caa375';
        ctx.font = '13px sans-serif';
        ctx.fillText('— Ancient Inscription (Proverbs 16:18)', this.width / 2, 155);

        ctx.fillStyle = '#d4d4d4';
        ctx.font = '14px sans-serif';
        const lines = [
          "In your arrogance, you believed yourself invincible against the ancient horde.",
          "You fought bravely, but mortal vanity could not conquer the infinite forest.",
          "Yet the shattering of the mortal ego is the beginning of enlightenment...",
          "",
          "Your mortal shell has fallen in battle.",
          "Now, your divine soul awakens in the celestial realm!"
        ];
        lines.forEach((line, i) => {
          ctx.fillText(line, this.width / 2, 210 + i * 22);
        });

        // Level 4 Transition Pill
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 15px "Press Start 2P", monospace';
        ctx.fillText('✦ TRANSCENDING TO LEVEL 4: THE ASTRAL SANCTUM ✦', this.width / 2, 420);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.fillText('[ Press SPACE / ENTER or wait to awaken ]', this.width / 2, 460);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
