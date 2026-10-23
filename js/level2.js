/**
 * ==========================================================================
 * GLITCHVERSE - LEVEL 2: SUNKEN DESERT CATACOMBS (js/level2.js)
 * Features:
 * 1. Climbing Ladders (Top-left, Cave, and Gears)
 * 2. Purple Scorpions with Threat Detection Radius, Knockback & 5 Damage (20 HP -> 15 HP)
 * 3. Bottom-Left Cave Chest containing the Sanctum Key
 * 4. Locked Cyan Padlock Door at Lower Right
 * 5. Unreachable Archer shooting arrows
 * 6. Morph Ability [Q]: Transforms the overhead square box into a round rolling boulder
 *    that plunges down to crush and eliminate the archer!
 * ==========================================================================
 */

export class Level2 {
  constructor() {
    this.width = 1024;
    this.height = 571;
    this.levelIndex = 2;

    // Background Map Artwork
    this.bgImg = new Image();
    this.bgLoaded = false;
    this.bgImg.onload = () => { this.bgLoaded = true; };
    this.bgImg.src = 'assets/temple_map_lvl2.jpg';
    if (this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      this.bgLoaded = true;
    }

    // Archer Sprites
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
    this.archerIdleImg = new Image();
    this.archerIdleImg.src = 'assets/anims/archer_idle.png';
    this.archerDefeatedImg = new Image();
    this.archerDefeatedImg.src = 'assets/anims/archer_defeated.png';
    this.archerArrowImg = new Image();
    this.archerArrowImg.src = 'assets/anims/archer_arrow.png';

    // Platforms
    this.platforms = [
      // 1. Upper Left Balcony (x=40..245, y=145)
      { id: 'top_left', x1: 40, x2: 245, y: 145, oneWay: true },

      // 1b. Sand Dune Ledge below Upper Left Ladder (x=150..245, y=255)
      { id: 'sand_dune', x1: 150, x2: 245, y: 255, oneWay: true },

      // 2. Sand Dune & Middle Left Platform (x=40..460, y=325)
      { id: 'middle_left', x1: 40, x2: 460, y: 325, oneWay: false },

      // 3. Golden Bridge (x=460..675, y=325)
      { id: 'bridge_lvl2', x1: 460, x2: 675, y: 325, oneWay: true },

      // 4. Middle Right Platform (x=675..1024, y=325)
      { id: 'middle_right', x1: 675, x2: 1024, y: 325, oneWay: false },

      // 5. Upper Right Stone Balcony (x=700..950, y=175)
      { id: 'top_right', x1: 700, x2: 950, y: 175, oneWay: true },

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
      { id: 'ladder_cave', x: 360, y1: 325, y2: 535, width: 26 },
      // Ladder 3: Middle platform up to Upper Right Balcony
      { id: 'ladder_right', x: 765, y1: 175, y2: 325, width: 26 }
    ];

    // Scorpions (Threat radius, knockback, 5 damage = 20 HP -> 15 HP)
    this.scorpions = [
      {
        id: 'scorp_pit',
        x: 515,
        y: 435,
        startX: 515,
        patrolX1: 495,
        patrolX2: 545,
        dir: 1,
        speed: 25,
        detectionRadius: 85,
        strikeRadius: 32,
        damage: 5,
        alive: true,
        stingerAngle: 0,
        pulseTimer: 0
      },
      {
        id: 'scorp_elephant',
        x: 775,
        y: 410,
        startX: 775,
        patrolX1: 740,
        patrolX2: 805,
        dir: 1,
        speed: 30,
        detectionRadius: 85,
        strikeRadius: 32,
        damage: 5,
        alive: true,
        stingerAngle: 0,
        pulseTimer: 0
      },
      {
        id: 'scorp_door',
        x: 820,
        y: 515,
        startX: 820,
        patrolX1: 760,
        patrolX2: 860,
        dir: -1,
        speed: 35,
        detectionRadius: 90,
        strikeRadius: 34,
        damage: 5,
        alive: true,
        stingerAngle: 0,
        pulseTimer: 0
      }
    ];

    // Unreachable Archer Enemy (Middle Right Ledge)
    this.archer = {
      x: 855,
      y: 325,
      alive: true,
      crushed: false,
      state: 'idle', // 'pull', 'shoot', 'idle'
      frame: 0,
      animTimer: 0,
      shootCooldown: 2.2,
      cooldownTimer: 1.0,
      arrows: []
    };

    // Morphable Object (Square Box above the Archer)
    // When [Q] is pressed, morphs into a round rolling stone boulder!
    this.morphBox = {
      x: 855,
      y: 175 - 16,            // On Upper Right Balcony (y=175)
      initialX: 855,
      initialY: 175 - 16,
      size: 28,
      isMorphed: false,       // false = square box, true = round boulder
      isFalling: false,
      hasCrushed: false,
      vx: 0,
      vy: 0,
      rotation: 0,
      morphAuraTimer: 0
    };

    // Bottom-Left Cave Chest (Contains Sanctum Key)
    this.chest = {
      x: 125,
      y: 535,
      radius: 45,
      opened: false,
      glowPulse: 0
    };

    // Locked Door on Lower Right (Requires Key to unlock)
    this.lockedDoor = {
      x: 898,
      y: 515,
      radius: 46,
      unlocked: false,
      shatterParticles: [],
      openAnimProgress: 0
    };

    // Undertale Inspectable Landmarks in Level 2
    this.interactables = [
      {
        x: 400, y: 325, radius: 45,
        text: "* An ancient sandstone stele of a Surya warrior.\n* The carving points steadfastly toward the east catacombs."
      },
      {
        x: 740, y: 460, radius: 50,
        text: "* A colossal stone elephant carving guarding the subterranean stream.\n* Phosphorescent moss clings to its ancient tusks."
      },
      {
        x: 550, y: 325, radius: 55,
        text: "* A bridge suspended over the twilight abyss.\n* Golden celestial engravings shimmer faintly beneath the sand."
      }
    ];

    this.spores = [];
    this.initSpores(40);
    this.cameraShake = 0;
    this.isCompleted = false;
    this.animTime = 0;
    this.bridgeOpacity = 1.0;
  }

  initSpores(count) {
    this.spores = [];
    for (let i = 0; i < count; i++) {
      this.spores.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        vx: -6 + Math.random() * 12,
        vy: -10 - Math.random() * 15,
        alpha: 0.2 + Math.random() * 0.5,
        color: Math.random() > 0.4 ? '#ffea79' : '#ff9955'
      });
    }
  }

  reset() {
    this.scorpions.forEach(s => {
      s.x = s.startX;
      s.alive = true;
    });

    this.archer.alive = true;
    this.archer.crushed = false;
    this.archer.arrows = [];
    this.archer.cooldownTimer = 1.0;

    this.morphBox.x = this.morphBox.initialX;
    this.morphBox.y = this.morphBox.initialY;
    this.morphBox.isMorphed = false;
    this.morphBox.isFalling = false;
    this.morphBox.hasCrushed = false;
    this.morphBox.vx = 0;
    this.morphBox.vy = 0;
    this.morphBox.rotation = 0;

    this.chest.opened = false;
    this.lockedDoor.unlocked = false;
    this.lockedDoor.shatterParticles = [];
    this.lockedDoor.openAnimProgress = 0;
    this.cameraShake = 0;
    this.isCompleted = false;
  }

  /**
   * Activates the Morphing Object ability [Q]!
   * Morphs the square crate above the archer into a heavy round rolling boulder.
   */
  triggerMorph(playerX, playerY) {
    if (this.morphBox.isMorphed) return false;

    // Trigger transfiguration
    this.morphBox.isMorphed = true;
    this.morphBox.morphAuraTimer = 1.2;
    this.cameraShake = 0.5;

    // Sound / burst particles around the box
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      this.spores.push({
        x: this.morphBox.x,
        y: this.morphBox.y,
        size: 3,
        vx: Math.cos(a) * (40 + Math.random() * 60),
        vy: Math.sin(a) * (40 + Math.random() * 60),
        alpha: 1.0,
        color: i % 2 === 0 ? '#4eedff' : '#ffd700'
      });
    }

    // Give boulder initial roll to tumble off the ledge
    this.morphBox.vx = 60;
    this.morphBox.isFalling = true;
    return true;
  }

  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
    for (const plat of this.platforms) {
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
    // 1. Check Bottom-Left Cave Chest (Sanctum Key)
    const distToChest = Math.hypot(px - this.chest.x, py - this.chest.y);
    if (distToChest <= this.chest.radius) {
      return {
        type: 'chest',
        x: this.chest.x,
        y: this.chest.y,
        opened: this.chest.opened,
        prompt: this.chest.opened ? '[E] CHEST (EMPTY)' : '[E] OPEN CHEST',
        text: this.chest.opened
          ? "* The ancient chest sits open.\n* You already obtained the [SANCTUM KEY]!"
          : "* An ancient brass-bound chest nestled within the sunken cavern.\n* Open it to claim the treasure inside!"
      };
    }

    // 2. Check Locked Cyan Padlock Door
    const distToDoor = Math.hypot(px - this.lockedDoor.x, py - this.lockedDoor.y);
    if (distToDoor <= this.lockedDoor.radius) {
      return {
        type: 'locked_door',
        x: this.lockedDoor.x,
        y: this.lockedDoor.y,
        unlocked: this.lockedDoor.unlocked,
        prompt: this.lockedDoor.unlocked ? '[E] ENTER SANCTUM' : '[E] LOCKED DOOR',
        text: this.lockedDoor.unlocked
          ? "* The sanctum door stands unlocked.\n* Step into the darkness to enter the inner temple!"
          : "* The sanctum entrance is barred by a heavy stone door with a glowing cyan padlock.\n* A key is required to open it!"
      };
    }

    // 3. Check Morphable Box if near
    const distToBox = Math.hypot(px - this.morphBox.x, py - this.morphBox.y);
    if (distToBox <= 55 && !this.morphBox.isMorphed) {
      return {
        type: 'morph_box',
        x: this.morphBox.x,
        y: this.morphBox.y,
        prompt: '[Q] MORPH OBJECT',
        text: "* A heavy square stone crate resting precariously near the ledge.\n* Press [Q] to use your Transmutation ability and morph it into a round object!"
      };
    }

    // 4. Other inspection landmarks
    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.x, py - item.y);
      if (dist <= item.radius) {
        return {
          type: 'inspection',
          x: item.x,
          y: item.y,
          prompt: '[E] CHECK',
          text: item.text
        };
      }
    }
    return null;
  }

  checkLevelComplete(px, py) {
    if (this.isCompleted) return false;
    // When the door is unlocked and player steps into the black doorway (x=885..915, y=515)
    if (this.lockedDoor.unlocked && px >= 885 && px <= 918 && py >= 500 && py <= 530) {
      this.isCompleted = true;
      return true;
    }
    return false;
  }

  update(playerX, playerY, dt, isDivine = false, player = null) {
    this.animTime += dt;

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.2);
    }

    // 1. Update Scorpions & Check Proximity / Knockback / Damage
    for (const scorp of this.scorpions) {
      if (!scorp.alive) continue;

      // Patrol
      scorp.x += scorp.dir * scorp.speed * dt;
      if (scorp.x >= scorp.patrolX2) {
        scorp.x = scorp.patrolX2;
        scorp.dir = -1;
      } else if (scorp.x <= scorp.patrolX1) {
        scorp.x = scorp.patrolX1;
        scorp.dir = 1;
      }

      // Check proximity to player
      const distToPlayer = Math.hypot(playerX - scorp.x, playerY - scorp.y);

      // Warning pulse when player is close
      scorp.playerClose = (distToPlayer <= scorp.detectionRadius);
      if (scorp.playerClose) {
        scorp.pulseTimer += dt * 4.0;
      }

      // Strike & Knockback if player touches or enters strike radius
      if (player && distToPlayer <= scorp.strikeRadius && player.invulnerableTimer <= 0) {
        const knockDir = (playerX < scorp.x) ? -1 : 1;
        player.takeDamage(scorp.damage, knockDir * 290, -220);
        this.cameraShake = 0.55;

        // Venom spark burst
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          this.spores.push({
            x: scorp.x,
            y: scorp.y - 6,
            size: 2.5,
            vx: Math.cos(a) * (50 + Math.random() * 50),
            vy: Math.sin(a) * (50 + Math.random() * 50),
            alpha: 1.0,
            color: '#c044ff'
          });
        }
      }
    }

    // 2. Update Archer & Arrows
    if (this.archer.alive) {
      this.archer.cooldownTimer -= dt;
      if (this.archer.cooldownTimer <= 0) {
        this.archer.cooldownTimer = this.archer.shootCooldown;
        // Fire arrow to the left
        this.archer.arrows.push({
          x: this.archer.x - 20,
          y: this.archer.y - 28,
          vx: -320,
          life: 2.5
        });
      }
    }

    // Update active arrows
    for (let i = this.archer.arrows.length - 1; i >= 0; i--) {
      const arr = this.archer.arrows[i];
      arr.x += arr.vx * dt;
      arr.life -= dt;

      // Hit player check
      if (player && Math.hypot(playerX - arr.x, playerY - (arr.y + 10)) < 24) {
        if (player.invulnerableTimer <= 0) {
          player.takeDamage(4, -220, -160);
          this.cameraShake = 0.4;
          this.archer.arrows.splice(i, 1);
          continue;
        }
      }

      if (arr.life <= 0 || arr.x < 0) {
        this.archer.arrows.splice(i, 1);
      }
    }

    // 3. Update Morphed Boulder Physics (Falls on Archer)
    if (this.morphBox.isMorphed && this.morphBox.isFalling) {
      this.morphBox.vy += 850 * dt; // Gravity
      this.morphBox.x += this.morphBox.vx * dt;
      this.morphBox.y += this.morphBox.vy * dt;
      this.morphBox.rotation += 8.0 * dt;

      // Check impact with Archer at y=325
      if (!this.morphBox.hasCrushed && this.morphBox.y >= 325 - 14) {
        this.morphBox.y = 325 - 14;
        this.morphBox.hasCrushed = true;
        this.morphBox.isFalling = false;
        this.morphBox.vx = 0;
        this.morphBox.vy = 0;

        // CRUSH ARCHER!
        this.archer.alive = false;
        this.archer.crushed = true;
        this.cameraShake = 1.0;

        // Big impact dust & rubble shockwave
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2;
          const spd = 60 + Math.random() * 80;
          this.spores.push({
            x: this.archer.x,
            y: this.archer.y - 10,
            size: 3 + Math.random() * 3,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd * 0.6 - 30,
            alpha: 1.0,
            color: i % 2 === 0 ? '#bfa882' : '#ffffff'
          });
        }
      }
    }

    // 4. Update Spores / Floating Sand Dust
    for (const s of this.spores) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < 0) {
        s.y = this.height;
        s.x = Math.random() * this.width;
      }
    }
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  renderBackground(ctx, isDivine = false) {
    ctx.save();

    // 1. Draw Level 2 Base Map
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImg, 0, 0, this.width, this.height);
    }

    // 2. Render Scorpions & Danger Radii
    this.renderScorpions(ctx);

    // 3. Render Archer & Arrows
    this.renderArcher(ctx);

    // 4. Render Morphable Box / Rolling Boulder
    this.renderMorphBox(ctx);

    // 5. Render Chest (Open / Closed State)
    this.renderChest(ctx);

    // 6. Render Locked Cyan Padlock Door
    this.renderLockedDoor(ctx);

    // 7. Render Ladder Visual Assists
    this.renderLadders(ctx);

    ctx.restore();
  }

  renderScorpions(ctx) {
    for (const scorp of this.scorpions) {
      if (!scorp.alive) continue;

      ctx.save();

      // Render Detection Danger Radius when player is close!
      if (scorp.playerClose) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.5 + 0.5 * Math.sin(scorp.pulseTimer);
        const rad = scorp.detectionRadius;

        // Glowing purple radial aura on the ground
        const radGrad = ctx.createRadialGradient(scorp.x, scorp.y, 4, scorp.x, scorp.y, rad);
        radGrad.addColorStop(0, `rgba(180, 50, 255, ${0.35 * pulse})`);
        radGrad.addColorStop(0.7, `rgba(140, 20, 220, ${0.15 * pulse})`);
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(scorp.x, scorp.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // Warning dashed perimeter ring
        ctx.strokeStyle = `rgba(220, 100, 255, ${0.7 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(scorp.x, scorp.y, rad, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Glowing purple aura around the scorpion
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const auraPulse = 0.6 + 0.4 * Math.sin(this.animTime * 4.0 + scorp.x);
      ctx.fillStyle = `rgba(190, 60, 255, ${0.4 * auraPulse})`;
      ctx.beginPath();
      ctx.arc(scorp.x, scorp.y - 12, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
  }

  renderArcher(ctx) {
    ctx.save();
    const ax = this.archer.x;
    const ay = this.archer.y;

    if (this.archer.crushed) {
      // Defeated / Crushed under boulder
      if (this.archerDefeatedImg.complete) {
        ctx.drawImage(this.archerDefeatedImg, ax - 45, ay - 35, 90, 40);
      }
    } else {
      // Alive Archer
      const frameImg = this.archerPullFrames[0] || this.archerIdleImg;
      if (frameImg && frameImg.complete) {
        ctx.save();
        // Facing left towards player
        ctx.translate(ax, ay);
        ctx.scale(-1, 1);
        ctx.drawImage(frameImg, -45, -78, 90, 80);
        ctx.restore();
      }
    }

    // Render flying arrows
    for (const arr of this.archer.arrows) {
      if (this.archerArrowImg.complete) {
        ctx.drawImage(this.archerArrowImg, arr.x, arr.y, 36, 8);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(arr.x, arr.y, 30, 3);
      }
    }

    ctx.restore();
  }

  renderMorphBox(ctx) {
    ctx.save();
    const bx = this.morphBox.x;
    const by = this.morphBox.y;
    const s = this.morphBox.size;

    // Transmutation Aura when morphing
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
      // 1. SQUARE STONE CRATE (Before Morph)
      ctx.fillStyle = 'rgba(10, 8, 20, 0.5)';
      ctx.fillRect(bx - s / 2 + 3, by + s / 2 - 2, s, 4);

      // Carved stone crate body
      const crateGrad = ctx.createLinearGradient(bx - s / 2, by - s / 2, bx + s / 2, by + s / 2);
      crateGrad.addColorStop(0, '#756350');
      crateGrad.addColorStop(0.5, '#8c7862');
      crateGrad.addColorStop(1, '#4e3e30');
      ctx.fillStyle = crateGrad;
      ctx.fillRect(bx - s / 2, by - s / 2, s, s);

      // Bronze bracket frame
      ctx.strokeStyle = '#cda24e';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx - s / 2 + 1, by - s / 2 + 1, s - 2, s - 2);

      // Diagonal cross brace
      ctx.strokeStyle = '#5a4635';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - s / 2 + 2, by - s / 2 + 2);
      ctx.lineTo(bx + s / 2 - 2, by + s / 2 - 2);
      ctx.moveTo(bx + s / 2 - 2, by - s / 2 + 2);
      ctx.lineTo(bx - s / 2 + 2, by + s / 2 - 2);
      ctx.stroke();

      // Glowing [Q] Morph Hint Icon
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hintPulse = 0.6 + 0.4 * Math.sin(this.animTime * 3.0);
      ctx.fillStyle = `rgba(78, 237, 255, ${0.8 * hintPulse})`;
      ctx.beginPath();
      ctx.arc(bx, by - s / 2 - 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // 2. ROUND STONE BOULDER (Morphed Sphere)
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

      // Stone cracks on sphere
      ctx.strokeStyle = '#221911';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rad - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Vedic rune engraving
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
    if (this.chest.opened) {
      // Open chest with golden rays
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

      // Cyan padlock outer glow
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
    // Subtle golden ladder grip indicator on rungs
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffd700';
    for (const lad of this.ladders) {
      for (let y = lad.y1 + 10; y < lad.y2; y += 18) {
        ctx.fillRect(lad.x - lad.width / 2 + 2, y, lad.width - 4, 2);
      }
    }
    ctx.restore();
  }

  renderSpores(ctx) {
    ctx.save();
    for (const s of this.spores) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
