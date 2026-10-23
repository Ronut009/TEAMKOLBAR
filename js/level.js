/**
 * ==========================================================================
 * UNDERWATER RUINS - LEVEL (js/level.js)
 * Side-scrolling platformer: ancient submerged Indian temple ruins.
 * Recreates the glowing golden bridge, blue lotus flowers, stone columns,
 * carved deity walls, seaweed vines, and deep underwater atmosphere.
 * ==========================================================================
 */

export class Level {
  constructor() {
    // World dimensions in pixels (wider than screen for scrolling)
    this.width = 2400;
    this.height = 720;

    this.platforms = [];     // Solid surfaces player stands on
    this.colliders = [];     // All solid rects for physics
    this.lotusFlowers = [];  // Animated blue lotus props
    this.bubbles = [];       // Floating bubble particles
    this.fishSchools = [];   // Background fish groups
    this.seaweeds = [];      // Hanging vine / seaweed props
    this.debris = [];        // Rubble and ruins scatter
    this.interactables = []; // Undertale-style inspect spots

    this.camera = {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      // Vertical: fix camera so full height is shown
    };

    // Animated bridge state
    this.bridgeSparkle = [];
    this.bridgeTime = 0;

    // Pre-baked background canvas (background ruins, light rays)
    this.bgCanvas = null;

    this.buildMap();
    this.spawnAmbientParticles();
    this.prebakeBackground();
  }

  buildMap() {
    const W = this.width;
    const H = this.height;

    // ─────────────────────────────────────────────────────────────
    // PLATFORMS — coordinate system: Y increases downward
    // ─────────────────────────────────────────────────────────────

    // LEFT RUINS PLATFORM (upper, x=80..580, y=340..420)
    this.platforms.push({ x: 80, y: 340, w: 500, h: 80, type: 'ruin_left' });

    // LEFT LOWER LEDGE (x=80..300, y=530..580)
    this.platforms.push({ x: 80, y: 530, w: 220, h: 50, type: 'lower' });

    // CENTER LOWER PLATFORM (x=880..1520, y=570..620)
    this.platforms.push({ x: 880, y: 570, w: 640, h: 50, type: 'lower_center' });

    // RIGHT RUINS PLATFORM (upper, x=1820..2320, y=330..420)
    this.platforms.push({ x: 1820, y: 330, w: 500, h: 90, type: 'ruin_right' });

    // RIGHT LOWER LEDGE (x=2100..2320, y=520..570)
    this.platforms.push({ x: 2100, y: 520, w: 220, h: 50, type: 'lower' });

    // Stair stepping stones between left platform and lower (x=580..680, y=410..450)
    this.platforms.push({ x: 560, y: 415, w: 100, h: 40, type: 'stone' });
    this.platforms.push({ x: 660, y: 450, w: 100, h: 40, type: 'stone' });
    this.platforms.push({ x: 760, y: 495, w: 140, h: 40, type: 'stone' });

    // Stair stepping stones right side
    this.platforms.push({ x: 1640, y: 495, w: 140, h: 40, type: 'stone' });
    this.platforms.push({ x: 1740, y: 450, w: 100, h: 40, type: 'stone' });
    this.platforms.push({ x: 1740, y: 405, w: 100, h: 40, type: 'stone' });

    // Build colliders from platforms
    for (const p of this.platforms) {
      this.colliders.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }

    // ─────────────────────────────────────────────────────────────
    // LOTUS FLOWERS (blue glowing, various positions)
    // ─────────────────────────────────────────────────────────────
    const lotusPositions = [
      // Left platform
      { x: 160, y: 326, size: 28, glow: true },
      { x: 390, y: 326, size: 22, glow: true },
      // Left lower
      { x: 140, y: 516, size: 20, glow: true },
      // Center lower
      { x: 950, y: 555, size: 24, glow: true },
      { x: 1200, y: 555, size: 20, glow: true },
      { x: 1450, y: 555, size: 22, glow: true },
      // Right platform
      { x: 1900, y: 314, size: 26, glow: true },
      { x: 2180, y: 314, size: 22, glow: true },
      // Right lower
      { x: 2240, y: 506, size: 20, glow: true },
      // Far left ground
      { x: 30,  y: 630, size: 28, glow: true },
      // Far right ground
      { x: 2330, y: 630, size: 26, glow: true },
    ];
    for (const l of lotusPositions) {
      this.lotusFlowers.push({ ...l, phase: Math.random() * Math.PI * 2, bloom: 0 });
    }

    // ─────────────────────────────────────────────────────────────
    // SEAWEED / VINES (hanging down from top of platforms)
    // ─────────────────────────────────────────────────────────────
    const vineXPositions = [100, 140, 250, 320, 450, 520,
      900, 1000, 1200, 1400, 1520,
      1840, 1950, 2050, 2150, 2250, 2300];
    for (const vx of vineXPositions) {
      const len = 40 + Math.random() * 80;
      this.seaweeds.push({ x: vx, len, phase: Math.random() * Math.PI * 2, color: Math.random() > 0.5 ? '#2d6b3c' : '#1e4a2c' });
    }

    // ─────────────────────────────────────────────────────────────
    // FISH SCHOOLS (background atmosphere)
    // ─────────────────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      this.fishSchools.push({
        x: 200 + Math.random() * 1800,
        y: 60 + Math.random() * 280,
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 15 + Math.random() * 25,
        count: 6 + Math.floor(Math.random() * 8),
        spread: 30 + Math.random() * 20
      });
    }

    // ─────────────────────────────────────────────────────────────
    // DEBRIS & RUBBLE
    // ─────────────────────────────────────────────────────────────
    const debrisData = [
      { x: 540, y: 395, w: 40, h: 20 }, { x: 590, y: 400, w: 25, h: 15 },
      { x: 900, y: 555, w: 50, h: 25 }, { x: 1100, y: 560, w: 35, h: 18 },
      { x: 1350, y: 560, w: 40, h: 20 }, { x: 1500, y: 555, w: 55, h: 28 },
      { x: 1700, y: 485, w: 30, h: 16 }, { x: 1780, y: 395, w: 40, h: 20 },
    ];
    for (const d of debrisData) {
      this.debris.push({ ...d, color: '#3a3028' });
    }

    // ─────────────────────────────────────────────────────────────
    // INTERACTABLES (Undertale inspect points)
    // ─────────────────────────────────────────────────────────────
    this.interactables.push({
      x: 1200, y: 580, radius: 90,
      text: "* The golden bridge pulses with ancient light.\n* It seems to connect two worlds separated by an abyss."
    });
    this.interactables.push({
      x: 200, y: 350, radius: 60,
      text: "* A carved stone column, worn smooth by centuries beneath the sea.\n* Mossy sigils trace a prayer to a forgotten god."
    });
    this.interactables.push({
      x: 2100, y: 340, radius: 60,
      text: "* A relief depicting a divine warrior — the form uncannily familiar.\n* 'One who walks between realms shall restore the balance.'"
    });

    // Spawn initial bridge sparkles
    this.spawnBridgeSparkles();
  }

  spawnBridgeSparkles() {
    this.bridgeSparkle = [];
    // Bridge spans from x=580 to x=1820, arcing from y=340 down to 420 at center
    for (let i = 0; i < 40; i++) {
      const t = Math.random();
      const bx = 580 + t * 1240;
      // Parabolic arc: y = 340 + 80 * 4 * t * (1-t)  (peak at center)
      const by = 340 + 320 * t * (1 - t);
      this.bridgeSparkle.push({
        x: bx, y: by,
        life: Math.random(),
        maxLife: 0.8 + Math.random() * 1.2,
        size: 2 + Math.random() * 3
      });
    }
  }

  spawnAmbientParticles() {
    this.bubbles = [];
    for (let i = 0; i < 80; i++) {
      this.bubbles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1 + Math.random() * 3,
        speed: 8 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.3 + Math.random() * 0.5
      });
    }
  }

  prebakeBackground() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    const ctx = this.bgCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Deep underwater background gradient (dark purple/navy)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0e0820');
    bgGrad.addColorStop(0.35, '#1a1240');
    bgGrad.addColorStop(0.7, '#0d0e30');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Volumetric light rays from surface (god rays)
    ctx.save();
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const rx = 300 + i * 260;
      const rw = 40 + Math.random() * 80;
      const rayGrad = ctx.createLinearGradient(rx, 0, rx, 500);
      rayGrad.addColorStop(0, 'rgba(100, 160, 255, 0.13)');
      rayGrad.addColorStop(0.5, 'rgba(80, 120, 220, 0.06)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rx - rw / 2, 0);
      ctx.lineTo(rx + rw / 2, 0);
      ctx.lineTo(rx + rw * 1.8, 520);
      ctx.lineTo(rx - rw * 1.8, 520);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Deep background silhouette ruins (far back, very dark)
    this.drawBackgroundRuinSilhouettes(ctx);

    // Draw all platforms as carved stone
    for (const p of this.platforms) {
      this.drawPlatform(ctx, p);
    }

    // Draw stone columns on left and right platform tops
    this.drawColumns(ctx);

    // Draw the right temple wall with deity carving
    this.drawTempleWall(ctx);

    // Draw debris
    for (const d of this.debris) {
      this.drawDebris(ctx, d);
    }

    // Draw "water" mist at very bottom
    const mistGrad = ctx.createLinearGradient(0, this.height - 100, 0, this.height);
    mistGrad.addColorStop(0, 'rgba(5, 5, 30, 0)');
    mistGrad.addColorStop(1, 'rgba(5, 5, 30, 0.9)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, this.height - 100, this.width, 100);

    // Draw top underwater mist
    const topMist = ctx.createLinearGradient(0, 0, 0, 80);
    topMist.addColorStop(0, 'rgba(5, 5, 30, 0.8)');
    topMist.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topMist;
    ctx.fillRect(0, 0, this.width, 80);
  }

  drawBackgroundRuinSilhouettes(ctx) {
    ctx.save();
    ctx.fillStyle = '#0a0718';

    // Far-back broken arch structures
    const archData = [
      { x: 600, y: 100, w: 80, h: 300 },
      { x: 720, y: 140, w: 60, h: 260 },
      { x: 1100, y: 80, w: 70, h: 320 },
      { x: 1400, y: 120, w: 65, h: 280 },
      { x: 1750, y: 90, w: 75, h: 310 },
    ];
    for (const a of archData) {
      ctx.fillRect(a.x, a.y, a.w, a.h);
      // Arch top
      ctx.beginPath();
      ctx.arc(a.x + a.w / 2, a.y, a.w / 2, Math.PI, 0);
      ctx.fill();
    }

    // Cave ceiling rocks
    for (let i = 0; i < 14; i++) {
      const rx = i * 180 + Math.random() * 60;
      const ry = 0;
      const rw = 80 + Math.random() * 120;
      const rh = 20 + Math.random() * 60;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw / 2, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPlatform(ctx, p) {
    ctx.save();

    // Main stone body
    const stoneGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    stoneGrad.addColorStop(0, '#4a4238');
    stoneGrad.addColorStop(0.4, '#3a3028');
    stoneGrad.addColorStop(1, '#22201a');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // Top surface highlight
    ctx.fillStyle = '#5a5246';
    ctx.fillRect(p.x, p.y, p.w, 4);

    // Stone tile seams (horizontal)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let ty = p.y + 20; ty < p.y + p.h; ty += 20) {
      ctx.fillRect(p.x + 2, ty, p.w - 4, 2);
    }
    // Stone tile seams (vertical)
    for (let tx = p.x + 40; tx < p.x + p.w; tx += 40) {
      ctx.fillRect(tx, p.y + 2, 2, p.h - 4);
    }

    // Moss patches on top surface
    ctx.fillStyle = 'rgba(50, 100, 40, 0.5)';
    for (let mx = p.x + 10; mx < p.x + p.w - 10; mx += 45 + Math.floor(mx % 30)) {
      ctx.fillRect(mx, p.y, 18, 3);
    }

    // Left-side carved pilaster ornament (for main platforms)
    if (p.type === 'ruin_left' || p.type === 'ruin_right') {
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(p.x, p.y, 12, p.h);
      ctx.fillRect(p.x + p.w - 12, p.y, 12, p.h);
    }

    ctx.restore();
  }

  drawColumns(ctx) {
    // Left platform columns  (top of left ruin platform at y=340)
    const leftColX = [120, 200, 290, 380, 460];
    for (const cx of leftColX) {
      this.drawColumn(ctx, cx, 340, 130);
    }

    // Right platform columns (top of right ruin platform at y=330)
    const rightColX = [1860, 1950, 2060, 2180, 2270];
    for (const cx of rightColX) {
      this.drawColumn(ctx, cx, 330, 140);
    }
  }

  drawColumn(ctx, cx, baseY, height) {
    ctx.save();
    const w = 22;
    const capH = 18;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, baseY + 4, w / 2 + 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shaft
    const shaftGrad = ctx.createLinearGradient(cx - w/2, 0, cx + w/2, 0);
    shaftGrad.addColorStop(0, '#2e2820');
    shaftGrad.addColorStop(0.35, '#5c5046');
    shaftGrad.addColorStop(0.7, '#4a4238');
    shaftGrad.addColorStop(1, '#1e1c16');
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(cx - w/2, baseY - height, w, height);

    // Fluting grooves on shaft
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    for (let g = 0; g < 4; g++) {
      ctx.fillRect(cx - w/2 + 4 + g * 4, baseY - height + 4, 2, height - capH - 4);
    }

    // Capital (ornate top)
    ctx.fillStyle = '#5a5040';
    ctx.fillRect(cx - w/2 - 5, baseY - height, w + 10, capH);
    ctx.fillStyle = '#6a6050';
    ctx.fillRect(cx - w/2 - 5, baseY - height, w + 10, 4);

    // Lotus finial ornament at top of capital
    ctx.fillStyle = '#38a8cc';
    ctx.beginPath();
    ctx.arc(cx, baseY - height - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawTempleWall(ctx) {
    ctx.save();
    // Right side temple wall structure (x=2100..2400, full height of platform and above)
    const wx = 2100;
    const wy = 80;
    const ww = 300;
    const wh = 340;

    // Wall body
    const wallGrad = ctx.createLinearGradient(wx, wy, wx + ww, wy);
    wallGrad.addColorStop(0, '#3a3028');
    wallGrad.addColorStop(0.5, '#2e2820');
    wallGrad.addColorStop(1, '#1a1812');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(wx, wy, ww, wh);

    // Stone block seams
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let ty = wy + 30; ty < wy + wh; ty += 30) {
      ctx.fillRect(wx + 2, ty, ww - 4, 2);
    }
    for (let tx = wx + 50; tx < wx + ww; tx += 50) {
      ctx.fillRect(tx, wy + 2, 2, wh - 4);
    }

    // Deity silhouette relief (carved Vishnu/Nataraja style)
    const dx = wx + ww/2 - 30;
    const dy = wy + 40;
    ctx.fillStyle = '#241e18';

    // Body/torso
    ctx.fillRect(dx + 8, dy + 30, 44, 60);
    // Head with crown
    ctx.beginPath();
    ctx.arc(dx + 30, dy + 20, 22, 0, Math.PI * 2);
    ctx.fill();
    // Crown spire
    ctx.fillRect(dx + 25, dy - 20, 10, 28);
    ctx.beginPath();
    ctx.arc(dx + 30, dy - 22, 7, 0, Math.PI * 2);
    ctx.fill();

    // Multiple arms (4-armed deity)
    // Upper arms
    ctx.save();
    ctx.translate(dx + 30, dy + 44);
    ctx.fillStyle = '#241e18';
    // Upper right arm
    ctx.fillRect(36, -16, 30, 10);
    // Upper left arm
    ctx.fillRect(-66, -16, 30, 10);
    // Lower right arm
    ctx.fillRect(30, 12, 28, 10);
    // Lower left arm
    ctx.fillRect(-58, 12, 28, 10);
    ctx.restore();

    // Legs
    ctx.fillRect(dx + 8, dy + 90, 20, 44);
    ctx.fillRect(dx + 32, dy + 90, 20, 44);

    // Doorway arch beneath deity
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(dx + 10, dy + 120, 40, 90);
    ctx.beginPath();
    ctx.arc(dx + 30, dy + 124, 20, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  }

  drawDebris(ctx, d) {
    ctx.save();
    ctx.fillStyle = d.color || '#3a3028';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, 2);
    ctx.restore();
  }

  update(playerX, playerY, dt) {
    // Smooth horizontal camera follow
    const camTargetX = playerX - this.camera.width / 2;
    this.camera.x = Math.max(0, Math.min(camTargetX, this.width - this.camera.width));
    // Camera is fixed vertically to show the whole scene
    this.camera.y = 0;

    this.bridgeTime += dt;

    // Update bridge sparkles
    for (const s of this.bridgeSparkle) {
      s.life -= dt * 0.8;
      if (s.life <= 0) {
        // Respawn along bridge arc
        const t = Math.random();
        s.x = 580 + t * 1240;
        s.y = 340 + 320 * t * (1 - t);
        s.life = 0.8 + Math.random() * 1.0;
        s.maxLife = s.life;
        s.size = 2 + Math.random() * 3;
      }
    }

    // Update bubbles
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      b.x += Math.sin(this.bridgeTime * 1.5 + b.phase) * 6 * dt;
      if (b.y < -10) {
        b.y = this.height + 10;
        b.x = Math.random() * this.width;
      }
    }

    // Update fish schools
    for (const fish of this.fishSchools) {
      fish.x += fish.dir * fish.speed * dt;
      if (fish.x > this.width + 100) fish.x = -100;
      if (fish.x < -100) fish.x = this.width + 100;
    }
  }

  // Check if a box overlaps any solid collider
  isSolidAt(x, y, w, h) {
    for (const col of this.colliders) {
      if (x < col.x + col.w && x + w > col.x &&
          y < col.y + col.h && y + h > col.y) {
        return true;
      }
    }
    return false;
  }

  getNearbyInteractable(px, py) {
    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.x, py - item.y);
      if (dist <= item.radius) return item;
    }
    return null;
  }

  // ── RENDER METHODS ──────────────────────────────────────────────────────────

  renderBackground(ctx) {
    if (!this.bgCanvas) return;
    ctx.drawImage(this.bgCanvas,
      this.camera.x, this.camera.y, this.camera.width, this.camera.height,
      0, 0, this.camera.width, this.camera.height
    );
  }

  // Renders the glowing golden magical bridge arc
  renderBridge(ctx) {
    const cx = this.camera.x;
    const cy = this.camera.y;
    ctx.save();

    // Bridge start and end
    const bx1 = 580 - cx, by1 = 340 - cy;
    const bx2 = 1820 - cx, by2 = 330 - cy;
    const controlX = (bx1 + bx2) / 2;
    const controlY = Math.min(by1, by2) + 60; // Arc peak above platform level

    // Outer warm glow pass
    ctx.strokeStyle = 'rgba(255, 210, 60, 0.18)';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.quadraticCurveTo(controlX, controlY, bx2, by2);
    ctx.stroke();

    // Mid glow
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.38)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.quadraticCurveTo(controlX, controlY, bx2, by2);
    ctx.stroke();

    // Core bright gold line
    ctx.strokeStyle = '#ffe850';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.quadraticCurveTo(controlX, controlY, bx2, by2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Bridge sparkle nodes
    for (const s of this.bridgeSparkle) {
      const alpha = Math.max(0, s.life / s.maxLife);
      const rx = s.x - cx, ry = s.y - cy;
      if (rx < -10 || rx > this.camera.width + 10) continue;

      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = '#fff8a0';

      // Draw star/cross sparkle
      const sz = s.size;
      ctx.fillRect(rx - sz/2, ry - 1, sz, 2);
      ctx.fillRect(rx - 1, ry - sz/2, 2, sz);

      // Small center dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderLotus(ctx) {
    const t = this.bridgeTime;
    ctx.save();

    for (const l of this.lotusFlowers) {
      const rx = Math.floor(l.x - this.camera.x);
      const ry = Math.floor(l.y - this.camera.y);
      if (rx < -40 || rx > this.camera.width + 40) continue;

      const pulse = 0.7 + 0.3 * Math.sin(t * 2.5 + l.phase);

      // Outer glow bloom
      const bloom = ctx.createRadialGradient(rx, ry, 2, rx, ry, l.size * 2.5 * pulse);
      bloom.addColorStop(0, 'rgba(40, 200, 255, 0.55)');
      bloom.addColorStop(0.5, 'rgba(20, 140, 220, 0.25)');
      bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(rx, ry, l.size * 2.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Petals (8 petals)
      const petals = 8;
      const petalLen = l.size * pulse;
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2 + t * 0.3;
        const px = rx + Math.cos(angle) * petalLen * 0.65;
        const py = ry + Math.sin(angle) * petalLen * 0.65;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(60, 210, 255, 0.85)' : 'rgba(20, 160, 230, 0.75)';
        ctx.beginPath();
        ctx.ellipse(px, py, petalLen * 0.35, petalLen * 0.55, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing center
      ctx.fillStyle = '#a8f0ff';
      ctx.beginPath();
      ctx.arc(rx, ry, l.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rx - 1, ry - 1, l.size * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderSeaweed(ctx) {
    const t = this.bridgeTime;
    ctx.save();

    for (const vine of this.seaweeds) {
      const rx = Math.floor(vine.x - this.camera.x);
      if (rx < -20 || rx > this.camera.width + 20) continue;

      // Find topmost platform above this x
      let topY = 0;
      for (const p of this.platforms) {
        if (vine.x >= p.x && vine.x <= p.x + p.w) {
          topY = p.y;
        }
      }

      const sway = Math.sin(t * 1.2 + vine.phase) * 8;
      const segments = 6;
      const segH = vine.len / segments;

      ctx.strokeStyle = vine.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(rx, topY - this.camera.y);
      for (let i = 1; i <= segments; i++) {
        const sx = rx + Math.sin(i * 0.8 + vine.phase + t * 0.8) * sway * (i / segments);
        const sy = (topY - this.camera.y) + i * segH;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  renderFishSchools(ctx) {
    const cx = this.camera.x;
    ctx.save();
    ctx.fillStyle = 'rgba(80, 130, 200, 0.55)';

    for (const school of this.fishSchools) {
      const rx = school.x - cx;
      if (rx < -school.spread * 3 || rx > this.camera.width + school.spread * 3) continue;

      for (let i = 0; i < school.count; i++) {
        const fx = rx + (i % 4) * (school.spread / 4) * school.dir;
        const fy = school.y + Math.floor(i / 4) * 10;
        const fw = 7, fh = 4;

        // Simple pixel fish shape
        ctx.fillRect(fx - fw/2, fy - fh/2, fw, fh);
        // Tail
        if (school.dir > 0) {
          ctx.fillRect(fx - fw/2 - 3, fy - 2, 4, 2);
          ctx.fillRect(fx - fw/2 - 3, fy + 1, 4, 2);
        } else {
          ctx.fillRect(fx + fw/2 - 1, fy - 2, 4, 2);
          ctx.fillRect(fx + fw/2 - 1, fy + 1, 4, 2);
        }
      }
    }
    ctx.restore();
  }

  renderBubbles(ctx) {
    ctx.save();
    for (const b of this.bubbles) {
      const rx = b.x - this.camera.x;
      const ry = b.y - this.camera.y;
      if (rx < -10 || rx > this.camera.width + 10 || ry < -10 || ry > this.camera.height + 10) continue;

      ctx.globalAlpha = b.alpha * 0.6;
      ctx.strokeStyle = 'rgba(150, 210, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, b.r, 0, Math.PI * 2);
      ctx.stroke();

      // Tiny highlight
      ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(rx - b.r * 0.3, ry - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Render everything non-platform (called by engine in order)
  renderAll(ctx) {
    this.renderBackground(ctx);
    this.renderFishSchools(ctx);
    this.renderSeaweed(ctx);
    this.renderBridge(ctx);
    this.renderLotus(ctx);
    this.renderBubbles(ctx);
  }
}
