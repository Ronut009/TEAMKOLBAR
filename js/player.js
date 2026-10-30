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

    // Sprite Display Dimensions (Kali divine frames are drawn into this 46x80 box)
    this.spriteWidth = 46;
    this.spriteHeight = 80;
    this.footOffsetY = 274 / 280;

    // Rakti's frames live in assets/anims/rakti/. Each frame set shares one canvas; (anchorX, anchorY)
    // is the point between her feet. All sets were normalised to the same head size, so one scale
    // converts sheet pixels to world pixels for every set.
    this.spriteScale = 0.24;
    this.spriteMetrics = {
      main:          { frameW: 290, frameH: 260, anchorX: 152, anchorY: 258 }, // run/attack/jump/climb/mantle/descend/runback
      idle:          { frameW: 136, frameH: 258, anchorX: 76,  anchorY: 256 },
      kaliTransform: { frameW: 194, frameH: 228, anchorX: 90,  anchorY: 226 },
      kaliHover:     { frameW: 182, frameH: 227, anchorX: 88,  anchorY: 225 },
      kaliMove:      { frameW: 178, frameH: 203, anchorX: 80,  anchorY: 201 },
      kaliRevert:    { frameW: 181, frameH: 175, anchorX: 91,  anchorY: 172 }
    };
    // Maa Kali floats this many world pixels above the ground.
    this.kaliHoverLift = 5;

    // Idle breathing loop
    this.idleFrame = 0;
    this.idleTimer = 0;
    this.idleFrameDuration = 0.16;

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
    const frames = (name, count = 6) => Array.from({ length: count }, (_, i) => {
      const img = new Image();
      img.src = `assets/anims/rakti/${name}_${i}.png`;
      return img;
    });

    this.anims = {
      run: frames('run'),            // side run, sword in hand
      runBack: frames('runback'),    // running away from camera (used when walking into an exit)
      attack: frames('attack'),      // 6-frame talwar combo
      jump: frames('jump'),          // 0 crouch, 1 rise, 2 tuck, 3 fall, 4-5 landing crouch
      climb: frames('climb'),        // ladder climb up (back view)
      descend: frames('descend'),    // 0-2 ladder climb down, 3-5 step off at the bottom
      mantle: frames('mantle'),      // 0-1 hang, 2 pull up, 3-5 over the top ledge
      idle: frames('idle'),          // 6-frame standing breath, sword sheathed
      kaliTrans: frames('kali_transform'), // Rakti -> golden aura -> Maa Kali
      kaliHoverIdle: frames('kali_hover'), // Maa Kali hovering in place
      kaliHoverMove: frames('kali_move'),  // Maa Kali gliding
      kaliRevert: frames('kali_revert')    // Maa Kali -> aura -> Rakti
    };
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
    this.vy = -30;
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
    if (level && level.ladders) {
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
            this.startClimbTransition('mantle', [5, 4, 3, 2], 0.26, -10, 0);
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
              this.startClimbTransition('mantle', [0, 1, 2, 3, 4, 5], 0.4, 18, 0);
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
              this.startClimbTransition('descend', [3, 4, 5], 0.2, 0, 0);
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
      this.vy = Math.sin(this.transTimer * 9.0) * -12;
      this.y += this.vy * dt;

      if (this.transTimer >= this.transFrameDuration) {
        this.transTimer = 0;
        this.transFrame++;
        if (this.transFrame >= 6) {
          // Finished transformation: Manifest Divine Kali!
          this.isTransforming = false;
          this.isDivine = true;
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
    if (Input.isPressed('attack') || Input.isPressed('parry')) {
      if (typeof window !== 'undefined' && (Input.isPressed('MouseLeft') || Input.isPressed('MouseRight'))) {
        const screenCenterX = window.innerWidth / 2;
        if (Input.mouseX > screenCenterX + 20) {
          this.facing = 'right';
        } else if (Input.mouseX < screenCenterX - 20) {
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

    // 2. Divine Transformation (Key X or Key E) - only enabled once unlocked via Sacred Lotus
    const wantsTransform = Input.isPressed('KeyX') || Input.isPressed('x') || Input.isPressed('KeyE') || Input.isPressed('e');
    if (wantsTransform && !dialogueActive) {
      if (!this.isDivine && !this.isTransforming && this.hasDivineUnlocked) {
        const isX = Input.isPressed('KeyX') || Input.isPressed('x');
        const nearby = level?.getNearbyInteractable?.(this.x, this.y);
        // [X] always transforms; [E] transforms when not standing at an interactable prompt
        if (isX || !nearby) {
          this.triggerDivineTransformation();
        }
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
    const formSpeed = this.isDivine ? this.divineSpeed : this.baseSpeed;
    this.speed = formSpeed;

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
    this.idleTimer += dt;
    if (this.idleTimer >= this.idleFrameDuration) {
      this.idleTimer = 0;
      this.idleFrame = (this.idleFrame + 1) % 6;
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
    const deathY = level?.levelIndex === 2 ? 585
      : level?.levelIndex === 3 ? 550
      : level?.levelIndex === 4 ? 670
      : 434;
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
    const spawn = this.getLevelSpawn(level);
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
      this.drawFrame(ctx, this.anims.kaliTrans[this.transFrame], 'kaliTransform', -lift * progress);
    } else if (this.isReverting) {
      const progress = Math.min(1, (this.revertFrame + this.revertTimer / this.revertFrameDuration) / 6);
      this.drawFrame(ctx, this.anims.kaliRevert[this.revertFrame], 'kaliRevert', -lift * (1 - progress));
    } else if (this.isDivine) {
      const bob = this.isMoving ? 0 : Math.sin(this.animTime * 3.5) * 2.5;
      if (this.isMoving) {
        this.drawFrame(ctx, this.anims.kaliHoverMove[this.hoverFrame], 'kaliMove', -lift);
      } else {
        this.drawFrame(ctx, this.anims.kaliHoverIdle[this.hoverFrame], 'kaliHover', -lift + bob);
      }
    } else {
      const frame = this.getMortalFrame();
      this.drawFrame(ctx, frame.img, frame.set || 'main', frame.offsetY || 0);
    }

    ctx.restore();

    // 3. Render Sword Slash Arc
    this.renderSlashes(ctx);

    ctx.restore();
  }

  getMortalFrame() {
    const a = this.anims;
    const t = this.climbTransition;
    if (t) {
      const progress = Math.min(1, t.time / t.duration);
      const index = Math.min(t.frames.length - 1, Math.floor(progress * t.frames.length));
      return {
        img: a[t.anim][t.frames[index]],
        offsetY: t.fromOffset + (t.toOffset - t.fromOffset) * progress
      };
    }
    if (this.isClimbing) {
      if (this.climbDir === 'down') return { img: a.descend[[0, 1, 2, 1][this.climbFrame % 4]] };
      return { img: a.climb[this.climbFrame % 6] };
    }
    // Level exits fade the player out; show her running into the doorway.
    if (this.doorwayFade < 1) return { img: a.runBack[Math.floor(this.animTime / 0.09) % 6] };
    if (this.isAttacking) return { img: a.attack[this.attackFrame] || a.attack[0] };
    if (!this.isGrounded) {
      if (this.vy < -120) return { img: a.jump[1] };
      if (this.vy <= 120) return { img: a.jump[2] };
      return { img: a.jump[3] };
    }
    if (this.landingTimer > 0) return { img: a.jump[4] };
    if (this.isMoving) return { img: a.run[this.runFrame] };
    return { img: a.idle[this.idleFrame], set: 'idle' };
  }

  /** Draws one frame with its set's foot anchor at the current origin (already translated/flipped). */
  drawFrame(ctx, img, setName, offsetY = 0) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const m = this.spriteMetrics[setName];
    const s = this.spriteScale;
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
