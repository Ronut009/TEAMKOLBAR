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

    // Sprite Display Dimensions (Normalized to 160x280 canvas with foot at y=274)
    this.spriteWidth = 46;
    this.spriteHeight = 80;
    this.footOffsetY = 274 / 280;

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
    this.swordDamage = 4; // Her sword deals 4 damage per strike
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
    this.anims = {
      idle: new Image(),
      run: [],
      attack: [],
      jump: [],
      divine: new Image(),
      kaliTrans: [],
      kaliHoverIdle: [],
      kaliHoverMove: []
    };

    this.anims.idle.src = 'assets/anims/idle.png';

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/run_${i}.png`;
      this.anims.run.push(img);
    }

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/attack_${i}.png`;
      this.anims.attack.push(img);
    }

    for (let i = 0; i < 6; i++) {
      const img = new Image();
      img.src = `assets/anims/jump_${i}.png`;
      this.anims.jump.push(img);
    }

    this.anims.divine.src = 'assets/anims/kali_hover_idle_0.png';

    // Preload Maa Kali Divine Transformation, Hovering Idle, and Hover Move Frames
    for (let i = 0; i < 6; i++) {
      const transImg = new Image();
      transImg.src = `assets/anims/kali_trans_${i}.png`;
      this.anims.kaliTrans.push(transImg);

      const idleImg = new Image();
      idleImg.src = `assets/anims/kali_hover_idle_${i}.png`;
      this.anims.kaliHoverIdle.push(idleImg);

      const moveImg = new Image();
      moveImg.src = `assets/anims/kali_hover_move_${i}.png`;
      this.anims.kaliHoverMove.push(moveImg);
    }

    // Preload Climbing Animations
    this.anims.climbUp = [];
    this.anims.climbDown = [];
    for (let i = 0; i < 6; i++) {
      const imgUp = new Image();
      imgUp.src = `assets/anims/climb_up_${i}.png`;
      this.anims.climbUp.push(imgUp);

      const imgDown = new Image();
      imgDown.src = `assets/anims/climb_down_${i}.png`;
      this.anims.climbDown.push(imgDown);
    }
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
    if (this.isAttacking) {
      this.attackFrame = 0;
      this.attackTimer = 0;
    } else {
      this.isAttacking = true;
      this.attackFrame = 0;
      this.attackTimer = 0;
    }

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
    if (this.isTransforming || this.isDivine) return;
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

  revertToMortal() {
    this.isDivine = false;
    this.isTransforming = false;
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

  update(dt, level, dialogueActive = false) {
    this.animTime += dt;
    this.divinePulse += dt * 4.0;

    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;
    if (this.landingTimer > 0) this.landingTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.ladderCooldown > 0) this.ladderCooldown -= dt;

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

    // 1. Attack on Left Click
    if (Input.isPressed('attack')) {
      this.triggerAttack();
    }

    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.attackFrameDuration) {
        this.attackTimer = 0;
        this.attackFrame++;
        if (this.attackFrame >= 6) {
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
        this.revertToMortal();

        // If standing on the divine golden bridge when power expires, fall!
        if (this.currentPlatform && this.currentPlatform.divineOnly) {
          this.isGrounded = false;
          this.currentPlatform = null;
          this.vy = 80;
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
      case 2: return { x: 100, y: 325 };
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

    // 1. Divine Aura (When in Maa Kali Divine Form or Transforming)
    if (this.isDivine || this.isTransforming) {
      this.drawDivineAura(ctx, cx, cy - 35);
    }

    // 2. Render Sprite
    ctx.save();
    ctx.translate(cx, cy);
    if (isFacingLeft) {
      ctx.scale(-1, 1);
    }

    if (this.isTransforming) {
      const rw = this.divineWidth;
      const rh = this.divineHeight;
      const transImg = (this.anims.kaliTrans && this.anims.kaliTrans[this.transFrame]) || this.anims.idle;
      if (transImg && transImg.complete && transImg.naturalWidth > 0) {
        ctx.drawImage(transImg, -rw / 2, -rh, rw, rh);
      }
    } else if (this.isDivine) {
      const rw = this.divineWidth;
      const rh = this.divineHeight;
      let divineImg;
      if (this.isMoving) {
        // Hover & Move animation (Row 4 - flying horizontally with hair trailing)
        divineImg = (this.anims.kaliHoverMove && this.anims.kaliHoverMove[this.hoverFrame]) || (this.anims.kaliHoverIdle && this.anims.kaliHoverIdle[0]);
      } else {
        // Hovering Idle animation (Row 3 - vertical hovering stance)
        divineImg = (this.anims.kaliHoverIdle && this.anims.kaliHoverIdle[this.hoverFrame]) || (this.anims.kaliHoverIdle && this.anims.kaliHoverIdle[0]);
      }

      if (divineImg && divineImg.complete && divineImg.naturalWidth > 0) {
        const floatBob = this.isMoving ? 0 : Math.sin(this.animTime * 3.5) * 4;
        ctx.drawImage(divineImg, -rw / 2, -rh + floatBob, rw, rh);
      }
    } else {
      let currentImg = this.anims.idle;

      if (this.isClimbing) {
        currentImg = (this.climbDir === 'down'
          ? this.anims.climbDown[this.climbFrame]
          : this.anims.climbUp[this.climbFrame]) || this.anims.climbUp[0];
      } else if (this.isAttacking) {
        currentImg = this.anims.attack[this.attackFrame] || this.anims.idle;
      } else if (!this.isGrounded) {
        if (this.vy < -120) {
          currentImg = this.anims.jump[1] || this.anims.jump[0];
        } else if (Math.abs(this.vy) <= 120) {
          currentImg = this.anims.jump[2] || this.anims.jump[3];
        } else {
          currentImg = this.anims.jump[3] || this.anims.jump[4];
        }
      } else if (this.landingTimer > 0) {
        currentImg = this.anims.jump[4] || this.anims.idle;
      } else if (this.isMoving) {
        currentImg = this.anims.run[this.runFrame] || this.anims.idle;
      }

      const rw = this.spriteWidth;
      const rh = this.spriteHeight;

      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        const drawOffsetY = -rh * this.footOffsetY;
        ctx.drawImage(currentImg, -rw / 2, drawOffsetY, rw, rh);
      }
    }

    ctx.restore();

    // 3. Render Sword Slash Arc
    this.renderSlashes(ctx);

    ctx.restore();
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
