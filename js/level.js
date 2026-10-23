/**
 * ==========================================================================
 * GLITCHVERSE - SUBMERGED RUINS TEMPLE MAP (js/level.js)
 * Features visual stone stepping platform (left), celestial Golden Bridge [X],
 * Ancient Lever on RIGHT TOP balcony, widened pit fall space, rising ancient pillar,
 * and Black Space Doorway (Level Complete).
 * ==========================================================================
 */

export class Level {
  constructor() {
    this.width = 1024;
    this.height = 434;

    // Base map without bridge (mortal view)
    this.baseMapImg = new Image();
    this.baseMapLoaded = false;
    this.baseMapImg.onload = () => { this.baseMapLoaded = true; };
    this.baseMapImg.src = 'assets/temple_map_base.png';
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

      // 5. Upper Right Temple Balcony (Temple roof where the ancient lever is located!)
      { id: 'balcony_right', x1: 728, x2: 1024, y: 172, oneWay: true },

      // 6. The Golden Constellation Bridge (Only active in Divine Form [X])
      { id: 'golden_bridge', x1: 388, x2: 728, y: 172, oneWay: true, divineOnly: true }
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

    // Undertale Inspectable Landmarks
    this.interactables = [
      {
        x: 100, y: 368, radius: 45,
        text: "* A celestial blue lotus blooms in the sunken courtyard.\n* Its gentle underwater glow fills you with DETERMINATION."
      },
      {
        x: 355, y: 172, radius: 40,
        text: "* Sacred blue lotus atop the ruined left balcony.\n* An invisible celestial bridge spans the sky to the east.\n* Awaken your Divine Form [X] to cross to the upper mechanism!"
      },
      {
        x: 558, y: 172, radius: 55,
        text: "* The Bridge of Constellations.\n* Dormant in mortal form. Awaken your Divine Avatar [X] to reveal the bridge and cross to the right balcony."
      },
      {
        x: 740, y: 172, radius: 40,
        text: "* Upper Right Temple Balcony.\n* The ancient lever mechanism awaits ahead!"
      },
      {
        x: 898, y: 368, radius: 45,
        text: "* The Dark Temple Sanctum.\n* A passage shrouded in eternal black space."
      }
    ];

    this.spores = [];
    this.initSpores(45);

    this.bridgeStars = [];
    this.initBridgeStars(30);

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
    for (let i = 0; i < count; i++) {
      this.spores.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2.5,
        vx: -4 + Math.random() * 8,
        vy: -12 - Math.random() * 16,
        alpha: 0.2 + Math.random() * 0.6,
        color: Math.random() > 0.3 ? '#4eedff' : '#a2eaff'
      });
    }
  }

  initBridgeStars(count) {
    this.bridgeStars = [];
    const xMin = 390;
    const xMax = 726;
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

    // Burst of celestial spark particles
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      this.spores.push({
        x: this.lever.x,
        y: this.lever.y - 14,
        size: 2.5,
        vx: Math.cos(a) * (30 + Math.random() * 60),
        vy: Math.sin(a) * (30 + Math.random() * 60),
        alpha: 1.0,
        color: i % 2 === 0 ? '#ffd700' : '#4eedff'
      });
    }
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
          ? "* The ancient lever is fully engaged.\n* Deep in the chasm, the sacred stone pillar stands raised!\n* The black sanctum doorway below is now open. Step into the darkness to complete the level!"
          : "* An ancient mechanism atop the east temple balcony.\n* Pull the lever to raise the pillar and unlock the dark sanctum doorway!"
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
        text: "* The ancient temple entrance is cloaked in deep black shadow.\n* You must cross the celestial bridge [X] to the right balcony and pull the lever to open it!"
      };
    }

    // 3. Check Other Undertale Inspection Landmarks
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

  update(playerX, playerY, dt, isDivine = false) {
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

    // Update floating spores / underwater bubbles
    for (const s of this.spores) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < 0) {
        s.y = this.height;
        s.x = Math.random() * this.width;
      }
    }
  }

  spawnPillarSplash() {
    for (let i = 0; i < 4; i++) {
      const side = Math.random() > 0.5 ? this.pillar.x1 : this.pillar.x2;
      this.pillarWaterSplashes.push({
        x: side + (Math.random() - 0.5) * 8,
        y: 368 + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 80,
        vy: -60 - Math.random() * 80,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#4eedff' : '#e0f8ff'
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

    // 2. Render Widened Fall Space (Deep sunken water abyss from x=430 to 690)
    this.renderFallSpace(ctx);

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

    // 8. Render Sanctum Black Space Doorway Glow & Embers
    this.renderSanctumExit(ctx);

    // 9. Render Blue Lotus Auras
    this.renderLotusAuras(ctx);

    ctx.restore();
  }

  /**
   * Renders the widened fall space (x=430 to 690, y=368 to 434) with
   * deep twilight water, submerged ruins, water ripples, and foam edges.
   */
  renderFallSpace(ctx) {
    ctx.save();

    const fx1 = 430;
    const fx2 = 690;
    const fw = fx2 - fx1;
    const fy = 368;
    const fh = 434 - fy;

    // 1. Deep sunken water gradient
    const waterGrad = ctx.createLinearGradient(fx1, fy, fx1, fy + fh);
    waterGrad.addColorStop(0, '#0e2038');
    waterGrad.addColorStop(0.35, '#091526');
    waterGrad.addColorStop(0.8, '#040b15');
    waterGrad.addColorStop(1, '#02050b');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(fx1, fy, fw, fh);

    // 2. Submerged temple blocks beneath the water
    ctx.fillStyle = 'rgba(25, 42, 60, 0.45)';
    ctx.fillRect(fx1 + 20, fy + 24, 70, fh - 24);
    ctx.fillRect(fx2 - 80, fy + 18, 65, fh - 18);

    // 3. Left & Right cliff walls descending into the water
    const leftWallGrad = ctx.createLinearGradient(fx1 - 4, fy, fx1 + 10, fy);
    leftWallGrad.addColorStop(0, '#3a3028');
    leftWallGrad.addColorStop(1, 'rgba(10, 20, 35, 0.85)');
    ctx.fillStyle = leftWallGrad;
    ctx.fillRect(fx1 - 2, fy, 12, fh);

    const rightWallGrad = ctx.createLinearGradient(fx2 - 10, fy, fx2 + 4, fy);
    rightWallGrad.addColorStop(0, 'rgba(10, 20, 35, 0.85)');
    rightWallGrad.addColorStop(1, '#3a3028');
    ctx.fillStyle = rightWallGrad;
    ctx.fillRect(fx2 - 10, fy, 12, fh);

    // 4. Water surface ripples and foam line at y=368
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const waveTime = this.animTime * 3.0;

    ctx.strokeStyle = 'rgba(78, 237, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = fx1; x <= fx2; x += 6) {
      const dy = Math.sin((x * 0.08) + waveTime) * 1.5;
      if (x === fx1) ctx.moveTo(x, fy + dy);
      else ctx.lineTo(x, fy + dy);
    }
    ctx.stroke();

    const surfaceGlow = ctx.createLinearGradient(fx1, fy - 4, fx1, fy + 12);
    surfaceGlow.addColorStop(0, 'rgba(78, 237, 255, 0.25)');
    surfaceGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = surfaceGlow;
    ctx.fillRect(fx1, fy - 2, fw, 14);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Renders the Ancient Stone Pillar in the center of the fall space.
   * Starts submerged below water (y=445) and rises to y=360 when the lever is pulled.
   */
  renderRisingPillar(ctx) {
    if (this.pillar.y > 440) return; // Completely submerged

    ctx.save();
    const px = this.pillar.x1;
    const py = Math.round(this.pillar.y);
    const pw = this.pillar.width;
    const bottomY = 434;

    // 1. Fluted Pillar Shaft (from py+14 down to bottomY)
    const shaftX = px + 6;
    const shaftW = pw - 12;
    const shaftH = Math.max(0, bottomY - (py + 14));

    if (shaftH > 0) {
      const shaftGrad = ctx.createLinearGradient(shaftX, 0, shaftX + shaftW, 0);
      shaftGrad.addColorStop(0, '#3e3225');
      shaftGrad.addColorStop(0.2, '#66533f');
      shaftGrad.addColorStop(0.5, '#7f6b53');
      shaftGrad.addColorStop(0.8, '#5b4a37');
      shaftGrad.addColorStop(1, '#2c2217');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(shaftX, py + 14, shaftW, shaftH);

      // Fluted stone grooves
      ctx.fillStyle = 'rgba(20, 15, 10, 0.45)';
      for (let gx = shaftX + 6; gx < shaftX + shaftW - 4; gx += 8) {
        ctx.fillRect(gx, py + 14, 2, shaftH);
      }

      // Ancient horizontal stone bands with Vedic relief pattern
      ctx.fillStyle = '#9e8564';
      ctx.fillRect(shaftX, py + 26, shaftW, 2);
      ctx.fillRect(shaftX, py + 42, shaftW, 2);
    }

    // 2. Carved Stone Pillar Capital (Platform Top)
    const capGrad = ctx.createLinearGradient(px, py, px, py + 14);
    capGrad.addColorStop(0, '#857057');
    capGrad.addColorStop(0.3, '#9d866a');
    capGrad.addColorStop(0.7, '#63513e');
    capGrad.addColorStop(1, '#3b2f22');
    ctx.fillStyle = capGrad;
    ctx.fillRect(px, py, pw, 14);

    // Mossy walking surface
    ctx.fillStyle = '#7a8c54';
    ctx.fillRect(px, py, pw, 2);
    ctx.fillStyle = '#bda884';
    ctx.fillRect(px + 2, py + 2, pw - 4, 1);

    // Carved Surya Sun Rune on the capital face
    const runeX = px + pw / 2;
    const runeY = py + 7;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const runePulse = this.pillar.isRaised ? (0.6 + 0.4 * Math.sin(this.animTime * 3.5)) : 0.3;
    ctx.fillStyle = `rgba(255, 215, 0, ${runePulse})`;
    ctx.beginPath();
    ctx.arc(runeX, runeY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Small radial rune rays
    ctx.strokeStyle = `rgba(255, 215, 0, ${runePulse * 0.8})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + (this.animTime * 0.5);
      ctx.beginPath();
      ctx.moveTo(runeX + Math.cos(a) * 4, runeY + Math.sin(a) * 4);
      ctx.lineTo(runeX + Math.cos(a) * 6, runeY + Math.sin(a) * 6);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Water dripping and splash particles at water line
    if (this.pillar.isRaising || this.pillar.waterFoamTimer > 0) {
      for (const sp of this.pillarWaterSplashes) {
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Waterline foam ring
    if (py < 368) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(180, 240, 255, 0.45)';
      ctx.fillRect(shaftX - 3, 366, shaftW + 6, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Renders the visual carved sandstone stepping platform at y=270 on the LEFT ONLY.
   * (The right stepping platform tile has been removed as requested in Image 3!)
   */
  renderSteppingPlatforms(ctx) {
    ctx.save();

    // Left Stepping Platform (x1=172, x2=248, y=270, w=76, h=14)
    const lx = 172;
    const ly = 270;
    const lw = 76;
    const lh = 14;

    // Platform shadow
    ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
    ctx.fillRect(lx - 2, ly + lh - 2, lw + 4, 6);

    // Carved ancient sandstone slab
    const slabGrad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
    slabGrad.addColorStop(0, '#584a3c');
    slabGrad.addColorStop(0.3, '#706050');
    slabGrad.addColorStop(0.7, '#44382c');
    slabGrad.addColorStop(1, '#2c221a');
    ctx.fillStyle = slabGrad;
    ctx.fillRect(lx, ly, lw, lh);

    // Top surface moss & stone highlight
    ctx.fillStyle = '#8f9a65';
    ctx.fillRect(lx, ly, lw, 2);
    ctx.fillStyle = '#bfa882';
    ctx.fillRect(lx + 2, ly + 2, lw - 4, 1);

    // Ancient Sanskrit/Solar filigree border inlay
    ctx.strokeStyle = '#c89e3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx + 4, ly + 4, lw - 8, lh - 7);

    // Lotus corner brackets
    ctx.fillStyle = '#ffea79';
    ctx.fillRect(lx + 2, ly + 4, 2, 4);
    ctx.fillRect(lx + lw - 4, ly + 4, 2, 4);

    ctx.restore();
  }

  /**
   * Renders the Ancient Lever on the RIGHT TOP balcony (x=785, y=172).
   */
  renderLever(ctx) {
    ctx.save();

    const lx = this.lever.x;
    const ly = this.lever.y;

    // 1. Pedestal Base (carved stone block)
    const baseW = 18;
    const baseH = 12;
    const baseGrad = ctx.createLinearGradient(lx - baseW / 2, ly - baseH, lx + baseW / 2, ly);
    baseGrad.addColorStop(0, '#604f3d');
    baseGrad.addColorStop(1, '#34291e');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(lx - baseW / 2, ly - baseH, baseW, baseH);

    // Golden mechanical bracket
    ctx.fillStyle = '#b8903c';
    ctx.fillRect(lx - 4, ly - baseH - 4, 8, 6);

    // Central circular pivot rune
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const runeColor = this.lever.activated ? '#ffd700' : '#4eedff';
    ctx.fillStyle = runeColor;
    ctx.beginPath();
    ctx.arc(lx, ly - baseH - 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Lever Arm Handle
    ctx.save();
    ctx.translate(lx, ly - baseH - 1);
    ctx.rotate(this.lever.handleAngle);

    // Lever rod (bronze)
    ctx.strokeStyle = '#d4aa48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -22);
    ctx.stroke();

    // Lotus handle knob
    ctx.fillStyle = this.lever.activated ? '#ffd700' : '#ff4a75';
    ctx.beginPath();
    ctx.arc(0, -23, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. Gentle golden aura when activated
    if (this.lever.activated) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowGrad = ctx.createRadialGradient(lx, ly - baseH - 10, 2, lx, ly - baseH - 10, 24);
      glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lx, ly - baseH - 10, 24, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.lineTo(728, 172);
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

    const bridgeGrad = ctx.createLinearGradient(388, 172, 728, 172);
    bridgeGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    bridgeGrad.addColorStop(0.5, 'rgba(255, 245, 180, 0.8)');
    bridgeGrad.addColorStop(1, 'rgba(255, 215, 0, 0.3)');

    ctx.fillStyle = bridgeGrad;
    ctx.fillRect(388, 169, 340, 5);

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
