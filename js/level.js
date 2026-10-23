/**
 * ==========================================================================
 * GLITCHVERSE - SUBMERGED RUINS TEMPLE MAP (js/level.js)
 * Recreates the submerged ancient temple with platforms, golden constellation
 * bridge, glowing lotuses, god-rays, and inspection spots.
 * ==========================================================================
 */

export class Level {
  constructor() {
    this.width = 1024;
    this.height = 434;

    // Load high-resolution pixel artwork of the submerged temple ruins
    this.mapImg = new Image();
    this.mapLoaded = false;
    this.mapImg.onload = () => { this.mapLoaded = true; };
    this.mapImg.src = 'assets/temple_map.png';
    if (this.mapImg.complete && this.mapImg.naturalWidth > 0) {
      this.mapLoaded = true;
    }

    // Platforms definitions:
    // Walking surface Y is where the feet touch the stone.
    this.platforms = [
      // 1. Lower Left Ground (Stone pavement from far left to chasm edge)
      { id: 'floor_left', x1: 0, x2: 462, y: 366, oneWay: false },

      // 2. Lower Right Ground (Sanctum front courtyard)
      { id: 'floor_right', x1: 544, x2: 1024, y: 366, oneWay: false },

      // 3. Lower Chasm Stepping Stone (Sunken block so player can cross bottom)
      { id: 'chasm_stepping', x1: 440, x2: 565, y: 388, oneWay: true },

      // 4. Left Ruined Pillar Base (Stepping stone up to upper balcony)
      { id: 'pillar_step_left', x1: 175, x2: 245, y: 270, oneWay: true },

      // 5. Right Ruined Pediment (Stepping stone up to right balcony)
      { id: 'pillar_step_right', x1: 635, x2: 705, y: 275, oneWay: true },

      // 6. Upper Left Balcony (Overgrown roof with glowing lotus)
      { id: 'balcony_left', x1: 220, x2: 388, y: 172, oneWay: true },

      // 7. Upper Right Temple Balcony (Temple roof with carved statues)
      { id: 'balcony_right', x1: 728, x2: 1024, y: 172, oneWay: true },

      // 8. The Golden Constellation Bridge (Arched star bridge)
      { id: 'golden_bridge', x1: 382, x2: 734, y: 172, oneWay: true }
    ];

    // Undertale Inspectable Landmarks
    this.interactables = [
      {
        x: 100, y: 366, radius: 45,
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
        x: 875, y: 366, radius: 55,
        text: "* The Sunken Temple Sanctum.\n* Stone carvings of ancient deities watch in silent vigil."
      }
    ];

    // Dynamic underwater bubbles & glowing lotus spores
    this.spores = [];
    this.initSpores(45);

    // Dynamic golden bridge star sparkles
    this.bridgeStars = [];
    this.initBridgeStars(25);

    // Camera viewport tracking
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
        x: 388 + Math.random() * (730 - 388),
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
   * @param {number} prevY
   * @param {number} currY
   * @param {number} x
   * @param {boolean} droppingThrough - True if holding Down + Jump
   * @returns {Object|null}
   */
  checkPlatformLanding(prevY, currY, x, droppingThrough = false) {
    for (const plat of this.platforms) {
      // Check horizontal span
      if (x >= plat.x1 && x <= plat.x2) {
        if (plat.oneWay && droppingThrough) {
          continue; // Ignore one-way platform when dropping down
        }

        // Crossed platform line from above or standing on it
        if (prevY <= plat.y + 2 && currY >= plat.y - 1) {
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
      if (x >= plat.x1 - 4 && x <= plat.x2 + 4 && Math.abs(y - plat.y) <= 4) {
        return plat;
      }
    }
    return null;
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

    // 1. Calculate dynamic responsive camera zoom & follow
    // Scale the 1024x434 world so it fits comfortably on any screen
    const minZoomW = window.innerWidth / this.width;
    const minZoomH = window.innerHeight / this.height;
    // Choose an optimal zoom that displays the world with retro sharpness
    const desiredZoom = Math.min(2.5, Math.max(1.0, Math.min(minZoomW, minZoomH) * 1.05));
    this.camera.zoom = desiredZoom;

    const viewW = window.innerWidth / this.camera.zoom;
    const viewH = window.innerHeight / this.camera.zoom;
    this.camera.width = viewW;
    this.camera.height = viewH;

    // Follow player smoothly
    this.camera.targetX = playerX - viewW / 2;
    this.camera.targetY = playerY - viewH / 2 - 20;

    // Clamp within map bounds
    const maxCamX = Math.max(0, this.width - viewW);
    const maxCamY = Math.max(0, this.height - viewH);

    this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, maxCamX));
    this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, maxCamY));

    const t = 1.0 - Math.exp(-this.camera.lerpSpeed * dt);
    this.camera.x += (this.camera.targetX - this.camera.x) * t;
    this.camera.y += (this.camera.targetY - this.camera.y) * t;

    // 2. Update floating bubbles & lotus spores
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
    // 1. Draw base map artwork
    if (this.mapLoaded) {
      ctx.drawImage(this.mapImg, 0, 0, this.width, this.height);
    } else {
      // Fallback deep twilight violet if image loading
      ctx.fillStyle = '#1c142c';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Render Sunken Temple Light Rays (God-Rays shining through surface)
    this.renderGodRays(ctx);

    // 3. Render Golden Bridge Shimmer (Twinkling star constellation runes)
    this.renderGoldenBridgeShimmer(ctx);

    // 4. Render Blue Lotus Cyan Auras
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

    // Constellation bridge glow
    const bridgeGrad = ctx.createLinearGradient(382, 172, 734, 172);
    bridgeGrad.addColorStop(0, 'rgba(255, 215, 0, 0.2)');
    bridgeGrad.addColorStop(0.5, 'rgba(255, 240, 160, 0.55)');
    bridgeGrad.addColorStop(1, 'rgba(255, 215, 0, 0.2)');

    ctx.fillStyle = bridgeGrad;
    ctx.fillRect(384, 168, 350, 7);

    // Twinkling golden stars along the constellation bridge
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

    // Lotus flower coordinates
    const lotusPositions = [
      { x: 100, y: 366 },
      { x: 355, y: 172 },
      { x: 725, y: 172 },
      { x: 890, y: 366 }
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
