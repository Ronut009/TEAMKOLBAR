/**
 * ==========================================================================
 * GLITCHVERSE - PLAYER ENTITY (js/player.js)
 * Full Sprite Animation Engine (Run, Jump, 6-Frame Attack Combo on Left Click),
 * Authentic Pit Falling Physics, Double Jump, Pit Wall Collisions, & Zero Floating.
 * ==========================================================================
 */

import { Input } from './input.js';

// ---------------------------------------------------------------------------
// Rakti sprite skins. Each skin is a folder of frames with the same file names
// (run_0.png ... kali_revert_5.png). To go back to the previous art, set
// DEFAULT_RAKTI_SKIN to 'v1', or open the game with ?skin=v1 to compare.
// metrics: every frame of a set shares one canvas; (anchorX, anchorY) is the
// point between her feet in that canvas. scale converts frame pixels to world pixels.
// ---------------------------------------------------------------------------
const V1_MAIN = { frameW: 290, frameH: 260, anchorX: 152, anchorY: 258 };
// Ladder transitions and jump frames used by v1 and v2 (6-frame mantle sheets)
const SIX_FRAME_LADDER = {
  mantleUp: { frames: [0, 1, 2, 3, 4, 5], duration: 0.4, fromOffset: 18 },   // over the top ledge
  mountDown: { frames: [5, 4, 3, 2], duration: 0.26, fromOffset: -10 },      // lower onto the ladder from the top
  jumpFrames: { rise: 1, riseLate: 1, apex: 2, fall: 3, land: 4 }
};
export const RAKTI_SKINS = {
  // 30 Oct, first green-and-gold design (chibi proportions)
  v1: {
    folder: 'assets/anims/rakti',
    scale: 0.24,
    descendLoop: [0, 1, 2, 1],                      // descend 0-2 climb down
    stepOff: { anim: 'descend', frames: [3, 4, 5] }, // descend 3-5 step off at the bottom
    ...SIX_FRAME_LADDER,
    metrics: {
      run: V1_MAIN, runBack: V1_MAIN, attack: V1_MAIN, jump: V1_MAIN,
      climb: V1_MAIN, mantle: V1_MAIN, descend: V1_MAIN,
      idle:          { frameW: 136, frameH: 258, anchorX: 76, anchorY: 256 },
      kaliTrans:     { frameW: 194, frameH: 228, anchorX: 90, anchorY: 226 },
      kaliHoverIdle: { frameW: 182, frameH: 227, anchorX: 88, anchorY: 225 },
      kaliHoverMove: { frameW: 178, frameH: 203, anchorX: 80, anchorY: 201 },
      kaliRevert:    { frameW: 181, frameH: 175, anchorX: 91, anchorY: 172 }
    }
  },
  // 30 Oct evening, taller and more detailed design
  v2: {
    folder: 'assets/anims/rakti_v2',
    scale: 0.23,
    descendLoop: [0, 1, 2, 3, 4, 5],                // all six frames climb down
    stepOff: { anim: 'mantle', frames: [4, 5] },    // crouch -> stand at the bottom
    ...SIX_FRAME_LADDER,
    metrics: {
      run: { frameW: 223, frameH: 201, anchorX: 160, anchorY: 199 },
      runBack: { frameW: 168, frameH: 244, anchorX: 79, anchorY: 242 },
      attack: { frameW: 271, frameH: 196, anchorX: 126, anchorY: 194 },
      jump: { frameW: 175, frameH: 178, anchorX: 101, anchorY: 158 },
      climb: { frameW: 157, frameH: 306, anchorX: 76, anchorY: 304 },
      mantle: { frameW: 228, frameH: 283, anchorX: 126, anchorY: 281 },
      descend: { frameW: 150, frameH: 263, anchorX: 84, anchorY: 261 },
      idle: { frameW: 144, frameH: 283, anchorX: 89, anchorY: 281 },
      kaliTrans: { frameW: 184, frameH: 288, anchorX: 91, anchorY: 285 },
      kaliHoverMove: { frameW: 226, frameH: 286, anchorX: 104, anchorY: 284 },
      kaliRevert: { frameW: 158, frameH: 296, anchorX: 79, anchorY: 290 },
      kaliHoverIdle: { frameW: 191, frameH: 285, anchorX: 87, anchorY: 283 }
    }
  },
  // 30 Oct night, aligned sheets: sheathed-talwar run, 12-frame ledge climb, Kali stands then hovers
  v3: {
    folder: 'assets/anims/rakti_v3',
    scale: 0.23,
    frameCounts: { mantle: 12 },
    descendLoop: [0, 1, 2, 1],                      // descend 0-2 climb down
    stepOff: { anim: 'descend', frames: [3, 4, 5] }, // descend 3-5 crouch -> stand at the bottom
    mantleUp: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], duration: 0.6, fromOffset: 18 },
    mountDown: { frames: [11, 10, 9, 8, 7, 6], duration: 0.32, fromOffset: -10 },
    jumpFrames: { rise: 1, riseLate: 2, apex: 3, fall: 4, land: 5 },
    metrics: {
      run: { frameW: 150, frameH: 273, anchorX: 84, anchorY: 271 },
      runBack: { frameW: 129, frameH: 284, anchorX: 66, anchorY: 282 },
      attack: { frameW: 218, frameH: 289, anchorX: 81, anchorY: 287 },
      jump: { frameW: 171, frameH: 253, anchorX: 92, anchorY: 222 },
      climb: { frameW: 127, frameH: 319, anchorX: 70, anchorY: 317 },
      mantle: { frameW: 175, frameH: 319, anchorX: 107, anchorY: 317 },
      descend: { frameW: 139, frameH: 288, anchorX: 74, anchorY: 286 },
      idle: { frameW: 144, frameH: 283, anchorX: 89, anchorY: 281 },
      kaliTrans: { frameW: 160, frameH: 290, anchorX: 82, anchorY: 287 },
      kaliRevert: { frameW: 157, frameH: 294, anchorX: 81, anchorY: 288 },
      kaliHoverIdle: { frameW: 143, frameH: 280, anchorX: 70, anchorY: 278 },
      kaliHoverMove: { frameW: 179, frameH: 258, anchorX: 85, anchorY: 256 }
    }
  }
};
export const DEFAULT_RAKTI_SKIN = 'v3';

// Level 1 prologue frames: Rakti in her everyday sari, before Maa Kali's blessing.
// They are the same for every skin and end in the v3 battle outfit.
const PROLOGUE_SPRITES = {
  folder: 'assets/anims/rakti_prologue',
  scale: 0.23,
  metrics: {
    wake: { frameW: 207, frameH: 282, anchorX: 101, anchorY: 280 },     // 0 unconscious ... 3 dazed ... 5 standing
    walk: { frameW: 151, frameH: 272, anchorX: 76, anchorY: 270 },     // 6-frame walk
    outfit: { frameW: 146, frameH: 284, anchorX: 86, anchorY: 281 }  // sari -> golden aura -> battle outfit with talwar
  }
};
// Seconds each frame is held
const WAKE_FRAME_TIMES = [1.7, 0.45, 0.45, 0.8, 0.4, 0.45];
const OUTFIT_FRAME_TIMES = [0.35, 0.32, 0.32, 0.32, 0.32, 0.45];
function timedFrame(times, t) {
  let acc = 0;
  for (let i = 0; i < times.length; i++) {
    acc += times[i];
    if (t < acc) return i;
  }
  return times.length - 1;
}
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function pickRaktiSkin() {
  try {
    const requested = new URLSearchParams(window.location.search).get('skin');
    if (requested && RAKTI_SKINS[requested]) return requested;
  } catch (e) { /* not in a browser */ }
  return DEFAULT_RAKTI_SKIN;
}

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

    // Sprite Display Dimensions (Kali divine frames are drawn into this 46x80 box)
    this.spriteWidth = 46;
    this.spriteHeight = 80;
    this.footOffsetY = 274 / 280;

    // Active sprite skin (see RAKTI_SKINS at the top of this file)
    this.skinName = pickRaktiSkin();
    this.skin = RAKTI_SKINS[this.skinName];
    // Maa Kali floats this many world pixels above the ground.
    this.kaliHoverLift = 5;

    // Idle breathing loop
    this.idleFrame = 0;
    this.idleTimer = 0;
    this.idleFrameDuration = 0.16;

    // Level 1 prologue: sari outfit (walk only, no jump / attack / abilities)
    this.isCivilian = false;
    this.isWaking = false;
    this.wakeTimer = 0;
    this.isChangingOutfit = false;
    this.outfitTimer = 0;
    this.walkSpeed = 125;
    this.walkFrameDuration = 0.13;

    // Kali -> Rakti return animation (6 frames)
    this.isReverting = false;
    this.revertFrame = 0;
    this.revertTimer = 0;
    this.revertFrameDuration = 0.09;

    // Short locked animations when stepping on/off a ladder (mantle over the top, land at the bottom).
    this.climbTransition = null;

    // Keep Rakti's hitbox presentation consistent across mortal and divine forms.
    this.divineWidth = this.spriteWidth;
    this.divineHeight = this.spriteHeight;

    // Divine Transformation State & Animation (6-Frame Fiery Transition)
    this.isTransforming = false;
    this.transFrame = 0;
    this.transTimer = 0;
    this.transFrameDuration = 0.10; // ~0.60s total transition

    // Hover Animation State (Hovering Idle & Hover Move)
    this.hoverFrame = 0;
    this.hoverTimer = 0;
    this.hoverFrameDuration = 0.11;

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
    // Every swing gets a new id; an enemy can only be damaged once per swing id.
    this.attackId = 0;
    // A click during the first half of a swing is queued instead of restarting it.
    this.attackQueued = false;

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

    this.name = 'RAKTI';
    this.swordDamage = 5; // Every sword hit deals 5 damage to every enemy (one hit per swing)
    this.hp = 20;
    this.maxHp = 20;
    this.hasKey = false;
    this.hasDivineUnlocked = false; // Unlocked after interacting with Sacred Lotus in Level 1
    this.invulnerableTimer = 0.0;
    this.isDead = false;

    // Climbing Mechanics (Level 2 Ladders)
    this.isClimbing = false;
    this.currentLadder = null;
    this.climbFrame = 0;
    this.climbTimer = 0;
    this.climbFrameDuration = 0.11;
    this.climbDir = 'up';
    this.ladderCooldown = 0; // Cooldown timer after dismounting or jumping off a ladder
  }

  loadAnimations() {
    const frames = (name, count = this.skin.frameCounts?.[name] ?? 6) => Array.from({ length: count }, (_, i) => {
      const img = new Image();
      img.src = `${this.skin.folder}/${name}_${i}.png`;
      return img;
    });

    this.anims = {
      run: frames('run'),            // side run, sword in hand
      runBack: frames('runback'),    // running away from camera (used when walking into an exit)
      attack: frames('attack'),      // 6-frame talwar combo
      jump: frames('jump'),          // 0 crouch, 1 rise, 2 tuck, 3 fall, 4-5 landing crouch
      climb: frames('climb'),        // ladder climb up (back view)
      descend: frames('descend'),    // ladder climb down (frames per skin.descendLoop)
      mantle: frames('mantle'),      // hang -> pull up -> over the top ledge -> stand (6 or 12 frames)
      idle: frames('idle'),          // 6-frame standing breath, sword sheathed
      kaliTrans: frames('kali_transform'), // Rakti -> golden aura -> Maa Kali
      kaliHoverIdle: frames('kali_hover'), // Maa Kali hovering in place
      kaliHoverMove: frames('kali_move'),  // Maa Kali gliding
      kaliRevert: frames('kali_revert')    // Maa Kali -> aura -> Rakti
    };
    const prologueFrames = (name) => Array.from({ length: 6 }, (_, i) => {
      const img = new Image();
      img.src = `${PROLOGUE_SPRITES.folder}/${name}_${i}.png`;
      return img;
    });
    this.anims.wake = prologueFrames('wake');
    this.anims.walk = prologueFrames('walk');
    this.anims.outfit = prologueFrames('outfit');
  }

  /**
   * Returns true the first time the current swing touches `target`, false afterwards.
   * Enemies call this after their own range checks so one swing = one hit = swordDamage.
   */
  claimSwingHit(target) {
    if (!this.isAttacking || !target) return false;
    if (target.lastSwingHitId === this.attackId) return false;
    target.lastSwingHitId = this.attackId;
    return true;
  }

  /** Back to the normal battle-outfit state (used on every level load). */
  resetPrologueState() {
    this.isCivilian = false;
    this.isWaking = false;
    this.isChangingOutfit = false;
    this.wakeTimer = 0;
    this.outfitTimer = 0;
  }

  /** Level 1 start: unconscious in her sari, then she gets up. Input is locked until she stands. */
  beginWakeUp() {
    this.isCivilian = true;
    this.isWaking = true;
    this.wakeTimer = 0;
    this.facing = 'right';
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.particles = [];
  }

  /** At Maa Kali's idol: sari -> golden aura -> battle outfit. */
  startOutfitChange() {
    if (!this.isCivilian || this.isWaking || this.isChangingOutfit) return;
    this.isChangingOutfit = true;
    this.outfitTimer = 0;
    this.vx = 0;
    this.isMoving = false;
  }

  startClimbTransition(anim, frames, duration, fromOffset = 0, toOffset = 0) {
    this.climbTransition = { anim, frames, duration, time: 0, fromOffset, toOffset };
  }

  takeDamage(amount, knockbackX = 0, knockbackY = 0) {
    if (this.invulnerableTimer > 0 || this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = 0.85;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;
      this.spawnDeathBurst();
      return;
    }

    if (this.isClimbing) {
      this.isClimbing = false;
      this.currentLadder = null;
    }
    this.climbTransition = null;

    this.vx = knockbackX;
    this.vy = knockbackY;
    this.isGrounded = false;
    this.currentPlatform = null;

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.particles.push({
        x: this.x,
        y: this.y - 20,
        vx: Math.cos(a) * (40 + Math.random() * 40),
        vy: Math.sin(a) * (40 + Math.random() * 40),
        life: 0.35,
        maxLife: 0.35,
        size: 2.5,
        color: '#ff2244'
      });
    }
  }

  spawnDeathBurst() {
    this.isDead = true;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const speed = 70 + Math.random() * 110;
      this.particles.push({
        x: this.x,
        y: this.y - 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 30,
        life: 0.85,
        maxLife: 0.85,
        size: 3.5 + Math.random() * 2.5,
        color: (i % 3 === 0) ? '#ff2244' : (i % 3 === 1 ? '#ffffff' : '#ffd700')
      });
    }
  }

  triggerAttack() {
    // Mashing used to restart the swing every click, so enemies took a hit per click.
    // Clicks during the first half of a swing now queue the next swing instead.
    if (this.isAttacking && this.attackFrame < 3) {
      this.attackQueued = true;
      return;
    }
    this.attackQueued = false;
    this.isAttacking = true;
    this.attackFrame = 0;
    this.attackTimer = 0;
    this.attackId++;

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
    if (this.isTransforming || this.isDivine || this.isReverting) return;
    this.isTransforming = true;
    this.transFrame = 0;
    this.transTimer = 0;
    this.vx = 0;
    this.vy = this.isGrounded ? 0 : -30;
    this.speed = this.divineSpeed;
    this.canDoubleJump = false;

    const flash = document.getElementById('divineFlash');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 250);
    }

    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const speed = 70 + Math.random() * 90;
      this.particles.push({
        x: this.x,
        y: this.y - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? '#ffd700' : '#ff0055'
      });
    }
  }

  /** Instantly back to mortal form (level loads). Use startRevert() for the animated return. */
  revertToMortal() {
    this.isDivine = false;
    this.isTransforming = false;
    this.isReverting = false;
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

  /** Plays the 6-frame Kali -> Rakti return; she hangs in place briefly, then normal physics resumes. */
  startRevert() {
    this.revertToMortal();
    this.isReverting = true;
    this.revertFrame = 0;
    this.revertTimer = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;
    this.divinePulse += dt * 4.0;

    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;
    if (this.landingTimer > 0) this.landingTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.ladderCooldown > 0) this.ladderCooldown -= dt;

    // Level 1 prologue cutscene animations lock all input.
    if (this.isWaking || this.isChangingOutfit) {
      this.vx = 0;
      this.isMoving = false;
      if (this.isWaking) {
        this.wakeTimer += dt;
        if (this.wakeTimer >= sum(WAKE_FRAME_TIMES)) this.isWaking = false;
      } else {
        const before = timedFrame(OUTFIT_FRAME_TIMES, this.outfitTimer);
        this.outfitTimer += dt;
        const after = timedFrame(OUTFIT_FRAME_TIMES, this.outfitTimer);
        if (before < 2 && after >= 2) {
          // the sari dissolves into gold: flash + burst
          const flash = document.getElementById('divineFlash');
          if (flash) {
            flash.classList.add('active');
            setTimeout(() => flash.classList.remove('active'), 250);
          }
          for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2;
            this.particles.push({
              x: this.x, y: this.y - 34,
              vx: Math.cos(a) * (60 + Math.random() * 70), vy: Math.sin(a) * (60 + Math.random() * 70),
              life: 0.7, maxLife: 0.7, size: 2.5 + Math.random() * 2, color: i % 2 ? '#ffd700' : '#ffffff'
            });
          }
        }
        if (Math.random() < 0.6) {
          this.particles.push({
            x: this.x + (Math.random() - 0.5) * 30, y: this.y - 10 - Math.random() * 60,
            vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 40,
            life: 0.5, maxLife: 0.5, size: 2 + Math.random() * 2, color: Math.random() > 0.3 ? '#ffd700' : '#7ff0c8'
          });
        }
        if (this.outfitTimer >= sum(OUTFIT_FRAME_TIMES)) {
          this.isChangingOutfit = false;
          this.isCivilian = false;   // battle outfit from here on
          this.idleFrame = 0;
        }
      }
      this.updateParticles(dt);
      return;
    }

    // Ladder mantle / step-off animations briefly lock movement.
    if (this.climbTransition) {
      this.climbTransition.time += dt;
      this.vx = 0;
      this.isMoving = false;
      if (this.climbTransition.time < this.climbTransition.duration) {
        if (!this.isClimbing) this.vy = 0;
        this.updateParticles(dt);
        this.updateSlashes(dt);
        return;
      }
      this.climbTransition = null;
    }

    // Movement Inputs
    let moveDir = 0;
    if (Input.isDown('left') || Input.isDown('KeyA') || Input.isDown('ArrowLeft')) moveDir -= 1;
    if (Input.isDown('right') || Input.isDown('KeyD') || Input.isDown('ArrowRight')) moveDir += 1;

    // Check Ladder Climbing (Level 2 Ladders)
    if (level && level.ladders && !this.isCivilian) {
      const isUp = Input.isDown('up') || Input.isDown('KeyW') || Input.isDown('ArrowUp');
      const isDown = Input.isDown('down') || Input.isDown('KeyS') || Input.isDown('ArrowDown');
      const spacePressed = Input.isPressed('jump') || Input.isPressed('Space');

      let overlappingLadder = null;
      for (const lad of level.ladders) {
        if (Math.abs(this.x - lad.x) <= 22 && this.y >= lad.y1 - 6 && this.y <= lad.y2 + 10) {
          overlappingLadder = lad;
          break;
        }
      }

      // 1. Ladder Mount / Attachment
      if (!this.isClimbing && overlappingLadder && this.ladderCooldown <= 0) {
        const atTopLedge = (this.y <= overlappingLadder.y1 + 8);
        const atBottomLedge = (this.y >= overlappingLadder.y2 - 6);

        if (atTopLedge) {
          // Standing on top platform: only mount ladder if pressing Down (S)
          if (isDown) {
            this.isClimbing = true;
            this.currentLadder = overlappingLadder;
            this.x = overlappingLadder.x;
            this.y = overlappingLadder.y1 + 10;
            this.vx = 0;
            this.vy = 0;
            this.isGrounded = false;
            this.currentPlatform = null;
            this.climbDir = 'down';
            this.climbFrame = 0;
            const md = this.skin.mountDown;
            this.startClimbTransition('mantle', md.frames, md.duration, md.fromOffset, 0);
          }
        } else if (atBottomLedge) {
          // Standing at bottom: mount ladder if pressing Up (W)
          if (isUp) {
            this.isClimbing = true;
            this.currentLadder = overlappingLadder;
            this.x = overlappingLadder.x;
            this.vx = 0;
            this.vy = 0;
            this.isGrounded = false;
            this.currentPlatform = null;
          }
        } else {
          // Airborne or mid-ladder: mount on Up, Down, or midair touch
          if (isUp || isDown || !this.isGrounded) {
            this.isClimbing = true;
            this.currentLadder = overlappingLadder;
            this.x = overlappingLadder.x;
            this.vx = 0;
            this.vy = 0;
            this.isGrounded = false;
            this.currentPlatform = null;
          }
        }
      } else if (this.isClimbing && !overlappingLadder) {
        this.isClimbing = false;
        this.currentLadder = null;
      }

      // 2. Ladder Active State
      if (this.isClimbing && this.currentLadder) {
        // A. Jump-off Dismount (Space bar)
        if (spacePressed) {
          this.isClimbing = false;
          this.currentLadder = null;
          this.ladderCooldown = 0.32;
          this.vy = this.jumpImpulse * 0.85;
          this.vx = (moveDir !== 0 ? moveDir * 170 : (this.facing === 'left' ? -140 : 140));
          this.isGrounded = false;
          this.spawnPoof(6);
        }
        // B. Horizontal Sideways Dismount (Pushing A or D without vertical input)
        else if (moveDir !== 0 && !isUp && !isDown) {
          this.isClimbing = false;
          this.currentLadder = null;
          this.ladderCooldown = 0.28;
          this.vx = moveDir * 160;
          this.facing = (moveDir < 0) ? 'left' : 'right';
          this.isGrounded = false;
          // Continues down to standard platform movement and collision this frame!
        }
        // C. Vertical Ladder Movement
        else {
          let climbMove = 0;
          if (isUp) climbMove -= 1;
          if (isDown) climbMove += 1;

          if (climbMove < 0) {
            this.climbDir = 'up';
            this.vy = -140;
            this.climbTimer += dt;
            if (this.climbTimer >= this.climbFrameDuration) {
              this.climbTimer = 0;
              this.climbFrame = (this.climbFrame + 1) % 6;
            }

            // Top of ladder reached: step cleanly onto top platform
            if (this.y <= this.currentLadder.y1 + 4) {
              this.y = this.currentLadder.y1;
              this.isClimbing = false;
              this.currentLadder = null;
              this.isGrounded = true;
              this.vy = 0;
              this.ladderCooldown = 0.35; // Prevents infinite re-grab loop
              const mu = this.skin.mantleUp;
              this.startClimbTransition('mantle', mu.frames, mu.duration, mu.fromOffset, 0);
            }
          } else if (climbMove > 0) {
            this.climbDir = 'down';
            this.vy = 140;
            this.climbTimer += dt;
            if (this.climbTimer >= this.climbFrameDuration) {
              this.climbTimer = 0;
              this.climbFrame = (this.climbFrame + 1) % 6;
            }

            // Bottom of ladder reached: step cleanly onto bottom platform
            if (this.y >= this.currentLadder.y2 - 2) {
              this.y = this.currentLadder.y2;
              this.isClimbing = false;
              this.currentLadder = null;
              this.isGrounded = true;
              this.vy = 0;
              this.ladderCooldown = 0.3;
              this.startClimbTransition(this.skin.stepOff.anim, this.skin.stepOff.frames, 0.24, 0, 0);
            }
          } else {
            this.vy = 0;
          }

          if (this.isClimbing) {
            this.vx = 0;
            this.y += this.vy * dt;
            this.x = this.currentLadder.x;

            this.updateParticles(dt);
            return;
          }
        }
      }
    }

    if (dialogueActive) {
      this.vx = 0;
      this.isMoving = false;
      this.updateParticles(dt);
      return;
    }

    // 0. Divine Transformation Sequence Playback
    if (this.isTransforming) {
      this.vx = 0;
      this.isMoving = false;
      this.transTimer += dt;
      // Gentle bob in mid-air only; on the ground she stays planted (the drift used to leave her floating)
      this.vy = Math.sin(this.transTimer * 9.0) * -12;
      if (!this.isGrounded) this.y += this.vy * dt;

      if (this.transTimer >= this.transFrameDuration) {
        this.transTimer = 0;
        this.transFrame++;
        if (this.transFrame >= 6) {
          // Finished transformation: Manifest Divine Kali!
          this.isTransforming = false;
          this.isDivine = true;
          if (this.isGrounded) this.vy = 0;
          this.divineTimer = this.divineDuration;
          this.hoverFrame = 0;
          this.hoverTimer = 0;
        }
      }

      // Fiery cosmic transformation aura particles
      if (Math.random() < 0.6) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 32,
          y: this.y - 30 + (Math.random() - 0.5) * 32,
          vx: (Math.random() - 0.5) * 45,
          vy: -35 - Math.random() * 55,
          life: 0.45,
          maxLife: 0.45,
          size: 2.5 + Math.random() * 2.5,
          color: Math.random() > 0.4 ? '#ffd700' : '#ff2244'
        });
      }

      this.updateParticles(dt);
      return; // Locked in place during transformation sequence
    }

    // 0b. Kali -> Rakti return playback (brief hang in the air, then normal physics)
    if (this.isReverting) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;
      this.revertTimer += dt;
      if (this.revertTimer >= this.revertFrameDuration) {
        this.revertTimer = 0;
        this.revertFrame++;
        if (this.revertFrame >= 6) {
          this.isReverting = false;
          this.revertFrame = 0;
        }
      }
      if (Math.random() < 0.4) {
        this.particles.push({
          x: this.x + (Math.random() - 0.5) * 28,
          y: this.y - 28 + (Math.random() - 0.5) * 28,
          vx: (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 30,
          life: 0.4,
          maxLife: 0.4,
          size: 2 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#ffd700' : '#ffea79'
        });
      }
      this.updateParticles(dt);
      return;
    }

    // 1. Attack on Left Click or Right Click Parry / Deflection Strike
    if (!this.isCivilian && (Input.isPressed('attack') || Input.isPressed('parry'))) {
      if (typeof window !== 'undefined' && (Input.isPressed('MouseLeft') || Input.isPressed('MouseRight'))) {
        // engine.js sets screenX each frame; near map edges the camera stops following,
        // so the screen centre is not where Rakti is.
        const raktiScreenX = Number.isFinite(this.screenX) ? this.screenX : window.innerWidth / 2;
        if (Input.mouseX > raktiScreenX + 6) {
          this.facing = 'right';
        } else if (Input.mouseX < raktiScreenX - 6) {
          this.facing = 'left';
        }
      }
      this.triggerAttack();
    }

    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackFrameDuration) {
        this.attackTimer = 0;
        this.attackFrame++;
        if (this.attackQueued && this.attackFrame >= 3) {
          this.triggerAttack();
        } else if (this.attackFrame >= 6) {
          this.isAttacking = false;
          this.attackFrame = 0;
        }
      }
    }

    // 2. Divine Transformation: [X] only. (E used to transform too, so closing a dialogue with E
    //    could accidentally trigger Kali form.)
    if ((Input.isPressed('KeyX') || Input.isPressed('x')) && !dialogueActive) {
      if (!this.isDivine && !this.isTransforming && this.hasDivineUnlocked && !this.isCivilian) {
        this.triggerDivineTransformation();
      }
    }

    if (this.isDivine) {
      this.divineTimer -= dt;

      // Cycle Hovering Idle / Hover Move animation frames
      this.hoverTimer += dt;
      if (this.hoverTimer >= this.hoverFrameDuration) {
        this.hoverTimer = 0;
        this.hoverFrame = (this.hoverFrame + 1) % 6;
      }

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
        this.startRevert();

        // If standing on the divine golden bridge when power expires, fall!
        if (this.currentPlatform && this.currentPlatform.divineOnly) {
          this.isGrounded = false;
          this.currentPlatform = null;
        }
      }
    }

    // 3. Horizontal Movement
    moveDir = 0;
    if (Input.isDown('left') || Input.isDown('KeyA') || Input.isDown('ArrowLeft')) moveDir -= 1;
    if (Input.isDown('right') || Input.isDown('KeyD') || Input.isDown('ArrowRight')) moveDir += 1;

    this.isMoving = (moveDir !== 0);
    if (moveDir < 0) this.facing = 'left';
    else if (moveDir > 0) this.facing = 'right';

    // Running is Rakti's default pace. Keep the Divine form's existing speed bonus.
    const formSpeed = this.isCivilian ? this.walkSpeed : (this.isDivine ? this.divineSpeed : this.baseSpeed);
    this.speed = formSpeed;

    const targetVx = moveDir * this.speed;
    if (this.isMoving) {
      this.vx = this.approach(this.vx, targetVx, this.acceleration * dt);
      this.runTimer += dt;
      if (this.runTimer >= (this.isCivilian ? this.walkFrameDuration : this.runFrameDuration)) {
        this.runTimer = 0;
        this.runFrame = (this.runFrame + 1) % 6;
      }
    } else {
      this.vx = this.approach(this.vx, 0, this.friction * dt);
      this.runFrame = 0;
      this.runTimer = 0;
    }
    this.idleTimer += dt;
    if (this.idleTimer >= this.idleFrameDuration) {
      this.idleTimer = 0;
      this.idleFrame = (this.idleFrame + 1) % 6;
    }

    // 4. Jump & Drop-Through Handling
    const jumpPressed = Input.isPressed('jump') || Input.isPressed('Space') || Input.isPressed('KeyW') || Input.isPressed('ArrowUp');
    const isDownHeld = Input.isDown('down') || Input.isDown('KeyS') || Input.isDown('ArrowDown');

    if (jumpPressed && !this.isCivilian) {   // no jumping in the sari
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
          this.spawnPoof(8);
        }
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

    // Levels can extend left of x=0 (Level 1 prologue uses negative x)
    this.x = Math.max((level.minX || 0) + 16, Math.min(this.x, level.width - 16));
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
        this.coyoteTimer = 0;
      } else if (this.isGrounded) {
        if (!level.isOnPlatform(this.x, this.y, this.isDivine)) {
          this.isGrounded = false;
          this.currentPlatform = null;
          this.coyoteTimer = this.coyoteMax;
        }
      }
    }

    // 7. Pit Fall & Respawn. The added chapters use taller maps than Levels 1–2.
    const deathY = level?.deathY ?? (level?.levelIndex === 2 ? 585
      : level?.levelIndex === 3 ? 550
      : level?.levelIndex === 4 ? 670
      : 434);
    if (this.y > deathY) {
      this.respawnFromPit(level);
    }

    // 8. Reset Key (R)
    if (Input.isPressed('KeyR') || Input.isPressed('reset')) {
      const spawn = this.getLevelSpawn(level);
      this.x = spawn.x;
      this.y = spawn.y;
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

  respawnFromPit(level = null) {
    // Levels with checkpoints (Level 1) decide where Rakti comes back; falling also costs HP there.
    const spawn = level?.getRespawnPoint?.() || this.getLevelSpawn(level);
    if (level?.pitDamage) {
      this.hp = Math.max(0, this.hp - level.pitDamage);
      this.invulnerableTimer = 1.0;
    }
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.isDead = false;
    this.currentPlatform = null;
    this.isClimbing = false;
    this.currentLadder = null;
    this.climbTransition = null;
    this.spawnPoof(12);

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

  getLevelSpawn(level = null) {
    switch (level?.levelIndex) {
      case 2: return { x: 90, y: 145 };
      case 3: return { x: 90, y: 108 };
      case 4: return { x: 320, y: 480 };
      default: return { x: 180, y: 368 };
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
    if (this.isDead) return;

    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);
    const isFacingLeft = (this.facing === 'left');

    ctx.save();
    if (this.doorwayFade !== undefined) {
      ctx.globalAlpha = Math.max(0, Math.min(1.0, this.doorwayFade));
    }
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 14) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // 1. Divine Aura (Maa Kali form only; the transformation frames carry their own golden aura)
    if (this.isDivine) {
      this.drawDivineAura(ctx, cx, cy - 35 - this.kaliHoverLift);
    }

    // 2. Render Sprite
    ctx.save();
    ctx.translate(cx, cy);
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }

    const lift = this.kaliHoverLift;
    if (this.isTransforming) {
      const progress = Math.min(1, (this.transFrame + this.transTimer / this.transFrameDuration) / 6);
      this.drawFrame(ctx, 'kaliTrans', this.transFrame, -lift * progress);
    } else if (this.isReverting) {
      const progress = Math.min(1, (this.revertFrame + this.revertTimer / this.revertFrameDuration) / 6);
      this.drawFrame(ctx, 'kaliRevert', this.revertFrame, -lift * (1 - progress));
    } else if (this.isDivine) {
      const bob = this.isMoving ? 0 : Math.sin(this.animTime * 3.5) * 2.5;
      if (this.isMoving) {
        this.drawFrame(ctx, 'kaliHoverMove', this.hoverFrame, -lift);
      } else {
        this.drawFrame(ctx, 'kaliHoverIdle', this.hoverFrame, -lift + bob);
      }
    } else {
      const frame = this.getMortalFrame();
      this.drawFrame(ctx, frame.set, frame.index, frame.offsetY || 0);
    }

    ctx.restore();

    // 3. Render Sword Slash Arc
    this.renderSlashes(ctx);

    ctx.restore();
  }

  /** Which frame set + index to draw for the mortal form this frame. */
  getMortalFrame() {
    if (this.isWaking) return { set: 'wake', index: timedFrame(WAKE_FRAME_TIMES, this.wakeTimer) };
    if (this.isChangingOutfit) return { set: 'outfit', index: timedFrame(OUTFIT_FRAME_TIMES, this.outfitTimer) };
    if (this.isCivilian) {
      if (this.isMoving) return { set: 'walk', index: this.runFrame % 6 };
      return { set: 'wake', index: 5 };   // standing in the sari
    }
    const t = this.climbTransition;
    if (t) {
      const progress = Math.min(1, t.time / t.duration);
      const i = Math.min(t.frames.length - 1, Math.floor(progress * t.frames.length));
      return { set: t.anim, index: t.frames[i], offsetY: t.fromOffset + (t.toOffset - t.fromOffset) * progress };
    }
    if (this.isClimbing) {
      if (this.climbDir === 'down') {
        const loop = this.skin.descendLoop;
        return { set: 'descend', index: loop[this.climbFrame % loop.length] };
      }
      return { set: 'climb', index: this.climbFrame % 6 };
    }
    // Level exits fade the player out; show her running into the doorway.
    if (this.doorwayFade < 1) return { set: 'runBack', index: Math.floor(this.animTime / 0.09) % 6 };
    if (this.isAttacking) return { set: 'attack', index: Math.min(5, this.attackFrame) };
    if (!this.isGrounded) {
      const j = this.skin.jumpFrames;
      if (this.vy < -250) return { set: 'jump', index: j.rise };
      if (this.vy < -120) return { set: 'jump', index: j.riseLate };
      if (this.vy <= 120) return { set: 'jump', index: j.apex };
      return { set: 'jump', index: j.fall };
    }
    if (this.landingTimer > 0) return { set: 'jump', index: this.skin.jumpFrames.land };
    if (this.isMoving) return { set: 'run', index: this.runFrame };
    return { set: 'idle', index: this.idleFrame };
  }

  /** Draws frame `index` of `setName` with its foot anchor at the current origin (already translated/flipped). */
  drawFrame(ctx, setName, index, offsetY = 0) {
    const img = this.anims[setName]?.[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const prologueMetrics = PROLOGUE_SPRITES.metrics[setName];
    const m = prologueMetrics || this.skin.metrics[setName];
    const s = prologueMetrics ? PROLOGUE_SPRITES.scale : this.skin.scale;
    // The art is high-resolution, so smooth downscaling keeps it clean.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -m.anchorX * s, -m.anchorY * s + offsetY, m.frameW * s, m.frameH * s);
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
