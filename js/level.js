/**
 * ==========================================================================
 * GLITCHVERSE - SUBMERGED RUINS TEMPLE MAP (js/level.js)
 * Synchronized platforms, strict pit boundaries (x: 462-548),
 * golden constellation bridge, and Undertale inspection spots.
 * ==========================================================================
 */

export class Level {
  constructor() {
    this.width = 1024;
    this.height = 434;

    this.mapImg = new Image();
    this.mapLoaded = false;
    this.mapImg.onload = () => { this.mapLoaded = true; };
    this.mapImg.src = 'assets/temple_map.png';
    if (this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      this.mapLoaded = true;
    }

    // Platform definitions aligned to the visual temple architecture
    // Note: Pit chasm is between x=462 and x=548.
    this.platforms = [
      // 1. Lower Left Ground (Stretches from far left to x=462)
      { id: 'floor_left', x1: 0, x2: 462, y: 368, oneWay: false },

      // 2. Lower Right Ground (Stretches from x=548 to far right)
      { id: 'floor_right', x1: 548, x2: 1024, y: 368, oneWay: false },

      // 3. Left Ruined Pillar Step (Intermediate step to upper balcony)
      { id: 'pillar_step_left', x1: 170, x2: 245, y: 270, oneWay: true },

      // 4. Right Ruined Pediment Step (Intermediate step to right balcony)
      { id: 'pillar_step_right', x1: 640, x2: 710, y: 275, oneWay: true },

      // 5. Upper Left Balcony (Overgrown roof with glowing lotus)
      { id: 'balcony_left', x1: 220, x2: 388, y: 172, oneWay: true },

      // 6. Upper Right Temple Balcony (Temple roof with carved statues)
      { id: 'balcony_right', x1: 728, x2: 1024, y: 172, oneWay: true },

      // 7. The Golden Constellation Bridge (Arched celestial bridge)
      { id: 'golden_bridge', x1: 388, x2: 728, y: 172, oneWay: true }
    ];

    // Pit Side Walls (Prevent phasing into side of platforms below y=368)
    this.pitWalls = {
      leftWallX: 462,   // Left stone platform edge
      rightWallX: 548,  // Right stone platform edge
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
        text: "* Sacred blue lotus atop the ruined pillar.\n* Magical bubbles rise from its petals toward the surface light."
      },
      {
        x: 558, y: 172, radius: 55,
        text: "* The Bridge of Constellations.\n* Ancient golden star-runes hum quietly beneath your sandals."
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
    this.initBridgeStars(25);

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
        size: 1 + Math.random() * 2,
        twinkleSpeed: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Collision check: Given previous and current foot position,
   * returns the platform landed upon, if any.
   */
  checkPlatformLanding(prevY, currY, x, droppingThrough = false) {
    for (const plat of this.platforms) {
      if (x >= plat.x1 && x <= plat.x2) {
        if (plat.oneWay && droppingThrough) {
          continue;
        }

        // Landing tolerance: crossing surface line downward
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
  isOnPlatform(x, y) {
    for (const plat of this.platforms) {
      if (x >= plat.x1 - 2 && x <= plat.x2 + 2 && Math.abs(y - plat.y) <= 4) {
        return plat;
      }
    }
    return null;
  }

  /**
   * Checks horizontal collisions against the pit's stone walls
   * @param {number} x
   * @param {number} y - Foot y position
   * @returns {number} Corrected X position
   */
  resolvePitWallCollision(x, y) {
    // If foot is down in the pit below ground level (y > 368)
    if (y > this.pitWalls.wallTopY + 2 && y <= this.pitWalls.wallBottomY) {
      // Trying to enter left stone wall from the pit
      if (x < this.pitWalls.leftWallX + 8 && x > this.pitWalls.leftWallX - 10) {
        return this.pitWalls.leftWallX + 8;
      }
      // Trying to enter right stone wall from the pit
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

  update(playerX, playerY, dt) {
    this.animTime += dt;

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

  renderBackground(ctx) {
    ctx.save();
    if (this.mapLoaded) {
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#1c142c';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    this.renderGodRays(ctx);
    this.renderGoldenBridgeShimmer(ctx);
    this.renderLotusAuras(ctx);
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

  renderGoldenBridgeShimmer(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const bridgeGrad = ctx.createLinearGradient(388, 172, 728, 172);
    bridgeGrad.addColorStop(0, 'rgba(255, 215, 0, 0.2)');
    bridgeGrad.addColorStop(0.5, 'rgba(255, 240, 160, 0.55)');
    bridgeGrad.addColorStop(1, 'rgba(255, 215, 0, 0.2)');

    ctx.fillStyle = bridgeGrad;
    ctx.fillRect(388, 168, 340, 7);

    for (const star of this.bridgeStars) {
      const alpha = 0.4 + 0.6 * Math.abs(Math.sin(this.animTime * star.twinkleSpeed + star.phase));
      ctx.fillStyle = `rgba(255, 245, 180, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

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
