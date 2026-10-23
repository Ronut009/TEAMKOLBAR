/**
 * ==========================================================================
 * GLITCHVERSE - SUBMERGED RUINS TEMPLE MAP (js/level.js)
 * Features visual stone stepping platforms, dynamic Divine-only Golden Bridge,
 * strict pit bounds, and Undertale inspection landmarks.
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
    // The Golden Bridge is only solid when Divine Form (X ability) is active!
    this.platforms = [
      // 1. Lower Left Ground (Stretches from far left to x=462)
      { id: 'floor_left', x1: 0, x2: 462, y: 368, oneWay: false },

      // 2. Lower Right Ground (Stretches from x=548 to far right)
      { id: 'floor_right', x1: 548, x2: 1024, y: 368, oneWay: false },

      // 3. Left Carved Stepping Platform (Visual stone ledge at y=270)
      { id: 'pillar_step_left', x1: 172, x2: 248, y: 270, oneWay: true },

      // 4. Right Carved Stepping Platform (Visual stone ledge at y=275)
      { id: 'pillar_step_right', x1: 640, x2: 710, y: 275, oneWay: true },

      // 5. Upper Left Balcony (Overgrown roof with glowing lotus)
      { id: 'balcony_left', x1: 220, x2: 388, y: 172, oneWay: true },

      // 6. Upper Right Temple Balcony (Temple roof with carved statues)
      { id: 'balcony_right', x1: 728, x2: 1024, y: 172, oneWay: true },

      // 7. The Golden Constellation Bridge (Only active in Divine Form)
      { id: 'golden_bridge', x1: 388, x2: 728, y: 172, oneWay: true, divineOnly: true }
    ];

    // Pit Side Walls (Prevent phasing into side of platforms below y=368)
    this.pitWalls = {
      leftWallX: 462,
      rightWallX: 548,
      wallTopY: 368,
      wallBottomY: 434
    };

    // Undertale Inspectable Landmarks
    this.interactables = [
      {
        x: 100, y: 368, radius: 45,
        text: "* A celestial blue lotus blooms in the sunken courtyard.\n* Its gentle underwater glow fills you with DETERMINATION."
      },
      {
        x: 355, y: 172, radius: 40,
        text: "* Sacred blue lotus atop the ruined balcony.\n* A faint golden aura shimmers across the empty sky toward the east."
      },
      {
        x: 558, y: 172, radius: 55,
        text: "* The Bridge of Constellations.\n* Dormant in the mortal realm. Only the Divine Avatar [X] can awaken its golden stars."
      },
      {
        x: 725, y: 172, radius: 40,
        text: "* A lotus offering at the entrance to the upper sanctuary.\n* It radiates a soothing celestial warmth."
      },
      {
        x: 875, y: 368, radius: 55,
        text: "* The Sunken Temple Sanctum.\n* Stone carvings of ancient deities watch in silent vigil."
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
    for (let i = 0; i < count; i++) {
      this.bridgeStars.push({
        x: 388 + Math.random() * (728 - 388),
        y: 168 + (Math.random() - 0.5) * 8,
        size: 1.5 + Math.random() * 2,
        twinkleSpeed: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Collision check: Given previous and current foot position,
   * returns the platform landed upon, if any.
   * Golden bridge only lands if isDivine is true!
   */
  checkPlatformLanding(prevY, currY, x, droppingThrough = false, isDivine = false) {
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
    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.x, py - item.y);
      if (dist <= item.radius) {
        return item;
      }
    }
    return null;
  }

  update(playerX, playerY, dt, isDivine = false) {
    this.animTime += dt;

    // Smooth bridge opacity fade in/out
    const targetBridgeOpacity = isDivine ? 1.0 : 0.0;
    this.bridgeOpacity += (targetBridgeOpacity - this.bridgeOpacity) * Math.min(1.0, dt * 6.0);

    const minZoomW = window.innerWidth / this.width;
    const minZoomH = window.innerHeight / this.height;
    const desiredZoom = Math.min(2.5, Math.max(1.0, Math.min(minZoomW, minZoomH) * 1.05));
    this.camera.zoom = desiredZoom;

    const viewW = window.innerWidth / this.camera.zoom;
    const viewH = window.innerHeight / this.camera.zoom;
    this.camera.width = viewW;
    this.camera.height = viewH;

    this.camera.targetX = playerX - viewW / 2;
    this.camera.targetY = playerY - viewH / 2 - 20;

    const maxCamX = Math.max(0, this.width - viewW);
    const maxCamY = Math.max(0, this.height - viewH);

    this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, maxCamX));
    this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, maxCamY));

    const t = 1.0 - Math.exp(-this.camera.lerpSpeed * dt);
    this.camera.x += (this.camera.targetX - this.camera.x) * t;
    this.camera.y += (this.camera.targetY - this.camera.y) * t;

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

    // 1. Draw Base Map (Mortal ruins with open chasm)
    if (this.baseMapLoaded) {
      ctx.drawImage(this.baseMapImg, 0, 0, this.width, this.height);
    } else if (this.fullMapImg.complete) {
      ctx.drawImage(this.fullMapImg, 0, 0, this.width, this.height);
    }

    // 2. Render God-Rays
    this.renderGodRays(ctx);

    // 3. Render Visual Carved Stone Stepping Platforms (Left: y=270, Right: y=275)
    this.renderSteppingPlatforms(ctx);

    // 4. Render Golden Constellation Bridge (ONLY visible when Divine Form is active)
    this.renderGoldenBridge(ctx, isDivine);

    // 5. Render Blue Lotus Auras
    this.renderLotusAuras(ctx);

    ctx.restore();
  }

  /**
   * Renders the visual carved sandstone stepping platform at y=270 on the left
   * and at y=275 on the right so jumping feels grounded with zero floating!
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

    // Right Stepping Platform (x1=640, x2=710, y=275, w=70, h=14)
    const rx = 640;
    const ry = 275;
    const rw = 70;
    const rh = 14;

    ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
    ctx.fillRect(rx - 2, ry + rh - 2, rw + 4, 6);

    ctx.fillStyle = slabGrad;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.fillStyle = '#8f9a65';
    ctx.fillRect(rx, ry, rw, 2);
    ctx.fillStyle = '#bfa882';
    ctx.fillRect(rx + 2, ry + 2, rw - 4, 1);

    ctx.strokeStyle = '#c89e3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 4, ry + 4, rw - 8, rh - 7);

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
