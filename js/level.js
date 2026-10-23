/**
 * ==========================================================================
 * GLITCHVERSE - LEVEL & ENVIRONMENT (js/level.js)
 * Undertale-style atmospheric ruins, warm torches, lotus pools & inspection spots.
 * ==========================================================================
 */

export class Level {
  constructor(widthInTiles = 54, heightInTiles = 40, tileSize = 32) {
    this.cols = widthInTiles;
    this.rows = heightInTiles;
    this.tileSize = tileSize;
    this.width = this.cols * this.tileSize;
    this.height = this.rows * this.tileSize;

    this.colliders = [];
    this.props = [];
    this.interactables = [];
    this.ambientParticles = [];

    this.bgCanvas = null;

    this.camera = {
      x: 0,
      y: 0,
      width: window.innerWidth || 960,
      height: window.innerHeight || 540,
      targetX: 0,
      targetY: 0,
      lerpSpeed: 7.0
    };

    this.initAmbientParticles(70);
    this.buildRuinsMap();
    this.renderPrebakedBackground();
  }

  initAmbientParticles(count) {
    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        speedX: -6 + Math.random() * 12,
        speedY: -10 - Math.random() * 12,
        alpha: 0.15 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#ffd460' : '#4eedff'
      });
    }
  }

  buildRuinsMap() {
    this.colliders = [];
    this.props = [];
    this.interactables = [];

    const pad = this.tileSize * 2;

    // Perimeter boundary walls
    this.colliders.push({ x: 0, y: 0, width: this.width, height: pad, type: 'wall' });
    this.colliders.push({ x: 0, y: this.height - pad, width: this.width, height: pad, type: 'wall' });
    this.colliders.push({ x: 0, y: 0, width: pad, height: this.height, type: 'wall' });
    this.colliders.push({ x: this.width - pad, y: 0, width: pad, height: this.height, type: 'wall' });

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // 1. Sun Dais / Central Emblem (Undertale inspection spot)
    this.interactables.push({
      x: centerX,
      y: centerY,
      radius: 65,
      text: "* The great Sun Mandala hums with a warm, steady golden vibration.\n* Knowing your journey lies ahead fills you with DETERMINATION."
    });

    // 2. Bell Altar in upper courtyard
    this.props.push({
      x: centerX,
      y: centerY - 150,
      width: 64,
      height: 70,
      type: 'sun_altar',
      hasLight: true,
      lightColor: 'rgba(255, 215, 0, 0.45)',
      lightRadius: 140
    });
    this.colliders.push({
      x: centerX - 28,
      y: centerY - 130,
      width: 56,
      height: 44,
      type: 'solid_altar'
    });
    this.interactables.push({
      x: centerX,
      y: centerY - 120,
      radius: 48,
      text: "* An ancient bronze shrine dedicated to the solar deity.\n* A small inscription reads: 'Walk forward without fear.'"
    });

    // 3. Sandstone Colonnade
    const pillarPositions = [
      { x: centerX - 240, y: centerY - 160 },
      { x: centerX - 240, y: centerY },
      { x: centerX - 240, y: centerY + 160 },
      { x: centerX + 240, y: centerY - 160 },
      { x: centerX + 240, y: centerY },
      { x: centerX + 240, y: centerY + 160 },
      { x: centerX - 120, y: centerY - 240 },
      { x: centerX + 120, y: centerY - 240 },
      { x: centerX - 120, y: centerY + 240 },
      { x: centerX + 120, y: centerY + 240 },
    ];

    pillarPositions.forEach((pos, idx) => {
      this.props.push({
        x: pos.x,
        y: pos.y,
        width: 36,
        height: 76,
        type: 'pillar',
        id: `pillar_${idx}`
      });
      this.colliders.push({
        x: pos.x - 16,
        y: pos.y + 12,
        width: 32,
        height: 24,
        type: 'solid_pillar'
      });
    });

    // 4. Sacred Lotus Pools
    const westPond = { x: 200, y: centerY - 40, width: 140, height: 110 };
    const eastPond = { x: this.width - 340, y: centerY - 40, width: 140, height: 110 };
    this.colliders.push({ ...westPond, type: 'water' });
    this.colliders.push({ ...eastPond, type: 'water' });
    this.waterPools = [westPond, eastPond];

    this.interactables.push({
      x: westPond.x + westPond.width / 2,
      y: westPond.y + westPond.height / 2,
      radius: 80,
      text: "* Pure crystal-clear water with blooming lotus petals.\n* The reflection shows your unwavering spirit."
    });

    // 5. Ancient Braziers with Sacred Flame
    const brazierPositions = [
      { x: centerX - 70, y: centerY - 150 },
      { x: centerX + 70, y: centerY - 150 },
      { x: centerX - 160, y: centerY + 80 },
      { x: centerX + 160, y: centerY + 80 },
    ];

    brazierPositions.forEach((bPos, idx) => {
      this.props.push({
        x: bPos.x,
        y: bPos.y,
        width: 28,
        height: 38,
        type: 'brazier',
        id: `brazier_${idx}`,
        hasLight: true,
        lightColor: 'rgba(255, 175, 40, 0.42)',
        lightRadius: 110
      });
      this.colliders.push({
        x: bPos.x - 12,
        y: bPos.y + 2,
        width: 24,
        height: 20,
        type: 'solid_brazier'
      });
      this.interactables.push({
        x: bPos.x,
        y: bPos.y,
        radius: 36,
        text: "* A bronze fire pot dancing with warm golden flame."
      });
    });
  }

  renderPrebakedBackground() {
    this.bgCanvas = document.createElement('canvas');
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    const ctx = this.bgCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const ts = this.tileSize;

    // Fill dark earthy turf
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * ts;
        const y = r * ts;

        const noise = Math.sin(c * 0.7) * Math.cos(r * 0.7);
        let grassColor = '#2f4219';
        if (noise > 0.35) grassColor = '#39521f';
        else if (noise < -0.35) grassColor = '#253514';

        ctx.fillStyle = grassColor;
        ctx.fillRect(x, y, ts, ts);

        if ((c * 7 + r * 13) % 13 === 0) {
          ctx.fillStyle = '#4c6c2b';
          ctx.fillRect(x + 8, y + 8, 2, 4);
        }
      }
    }

    // Courtyard stone promenade
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const courtWidth = 600;
    const courtHeight = 460;
    const courtLeft = centerX - courtWidth / 2;
    const courtTop = centerY - courtHeight / 2;

    for (let py = courtTop; py < courtTop + courtHeight; py += ts) {
      for (let px = courtLeft; px < courtLeft + courtWidth; px += ts) {
        ctx.fillStyle = '#221f1b';
        ctx.fillRect(px, py, ts, ts);

        ctx.fillStyle = '#3a342d';
        ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

        ctx.fillStyle = '#4f473e';
        ctx.fillRect(px + 2, py + 2, ts - 4, 2);
        ctx.fillRect(px + 2, py + 2, 2, ts - 4);
      }
    }

    // Draw Surya Mandala
    this.drawSuryaMandala(ctx, centerX, centerY, 110);

    // Draw Pools
    this.waterPools.forEach(pool => this.drawLotusPool(ctx, pool));

    // Draw Perimeter Walls
    this.drawPerimeterWalls(ctx);
  }

  drawSuryaMandala(ctx, cx, cy, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#16130f';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f4be41';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2e2417';
    ctx.fill();

    const rays = 16;
    for (let i = 0; i < rays; i++) {
      const angle = (i * Math.PI * 2) / rays;
      const rayLen = i % 2 === 0 ? radius - 16 : radius - 30;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
      ctx.strokeStyle = i % 2 === 0 ? '#f4be41' : '#b3821c';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#17130f';
    ctx.fill();
    ctx.strokeStyle = '#38e1ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f4be41';
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLotusPool(ctx, pool) {
    ctx.save();
    ctx.fillStyle = '#181512';
    ctx.fillRect(pool.x - 4, pool.y - 4, pool.width + 8, pool.height + 8);
    ctx.fillStyle = '#312d27';
    ctx.fillRect(pool.x - 2, pool.y - 2, pool.width + 4, pool.height + 4);

    const grad = ctx.createLinearGradient(pool.x, pool.y, pool.x, pool.y + pool.height);
    grad.addColorStop(0, '#0c2732');
    grad.addColorStop(1, '#05141b');
    ctx.fillStyle = grad;
    ctx.fillRect(pool.x, pool.y, pool.width, pool.height);

    // Floating pads
    const pads = [
      { x: pool.x + 28, y: pool.y + 26 },
      { x: pool.x + pool.width - 32, y: pool.y + 36 },
      { x: pool.x + pool.width / 2, y: pool.y + pool.height - 28 },
    ];
    pads.forEach(p => {
      ctx.fillStyle = '#28551f';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7294';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 1, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawPerimeterWalls(ctx) {
    const ts = this.tileSize;
    const border = ts * 2;

    ctx.fillStyle = '#16120e';
    ctx.fillRect(0, 0, this.width, border);
    ctx.fillRect(0, this.height - border, this.width, border);
    ctx.fillRect(0, 0, border, this.height);
    ctx.fillRect(this.width - border, 0, border, this.height);

    ctx.strokeStyle = '#b88a24';
    ctx.lineWidth = 2;
    ctx.strokeRect(border, border, this.width - border * 2, this.height - border * 2);
  }

  update(targetX, targetY, dt) {
    this.camera.targetX = targetX - this.camera.width / 2;
    this.camera.targetY = targetY - this.camera.height / 2;

    this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, this.width - this.camera.width));
    this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, this.height - this.camera.height));

    const t = 1.0 - Math.exp(-this.camera.lerpSpeed * dt);
    this.camera.x += (this.camera.targetX - this.camera.x) * t;
    this.camera.y += (this.camera.targetY - this.camera.y) * t;

    for (const p of this.ambientParticles) {
      p.x += p.speedX * dt;
      p.y += p.speedY * dt;
      p.phase += 1.5 * dt;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  isColliding(x, y, w, h) {
    for (const box of this.colliders) {
      if (
        x < box.x + box.width &&
        x + w > box.x &&
        y < box.y + box.height &&
        y + h > box.y
      ) {
        return true;
      }
    }
    return false;
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

  renderBackground(ctx) {
    if (!this.bgCanvas) return;
    const sx = Math.floor(this.camera.x);
    const sy = Math.floor(this.camera.y);
    const sw = this.camera.width;
    const sh = this.camera.height;

    ctx.drawImage(this.bgCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }

  renderProp(ctx, prop) {
    const rx = Math.floor(prop.x - this.camera.x);
    const ry = Math.floor(prop.y - this.camera.y);

    ctx.save();
    if (prop.type === 'pillar') {
      const w = prop.width;
      const h = prop.height;
      const px = rx - w / 2;
      const py = ry - h + 18;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(rx, ry + 12, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#261f18';
      ctx.fillRect(px - 3, py + h - 14, w + 6, 14);

      const grad = ctx.createLinearGradient(px, py, px + w, py);
      grad.addColorStop(0, '#352b22');
      grad.addColorStop(0.5, '#5e5040');
      grad.addColorStop(1, '#2c231b');
      ctx.fillStyle = grad;
      ctx.fillRect(px, py + 14, w, h - 28);

      ctx.fillStyle = '#f4be41';
      ctx.fillRect(px - 1, py + 18, w + 2, 3);

      ctx.fillStyle = '#483c2f';
      ctx.fillRect(px - 4, py, w + 8, 14);
    } else if (prop.type === 'sun_altar') {
      const w = prop.width;
      const h = prop.height;
      const px = rx - w / 2;
      const py = ry - h + 16;

      ctx.fillStyle = '#1c1712';
      ctx.fillRect(px - 6, py + h - 18, w + 12, 18);
      ctx.fillStyle = '#3a2f24';
      ctx.fillRect(px, py, w, h - 18);

      const bob = Math.sin(performance.now() * 0.003) * 2;
      ctx.fillStyle = '#f4be41';
      ctx.beginPath();
      ctx.arc(rx, py + 25 + bob, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.type === 'brazier') {
      const w = prop.width;
      const h = prop.height;
      const px = rx - w / 2;
      const py = ry - h + 12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(rx, ry + 6, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#312517';
      ctx.fillRect(px + 4, py + 16, w - 8, 12);
      ctx.fillStyle = '#4f3a22';
      ctx.beginPath();
      ctx.arc(rx, py + 14, 11, 0, Math.PI);
      ctx.fill();

      const time = performance.now() * 0.006;
      const f = Math.sin(time * 3.5) * 2;
      ctx.fillStyle = '#ff5b1a';
      ctx.beginPath();
      ctx.moveTo(rx - 7, py + 14);
      ctx.quadraticCurveTo(rx + f, py, rx, py - 6);
      ctx.quadraticCurveTo(rx + f, py, rx + 7, py + 14);
      ctx.fill();

      ctx.fillStyle = '#fff280';
      ctx.beginPath();
      ctx.moveTo(rx - 3, py + 14);
      ctx.quadraticCurveTo(rx, py + 5, rx, py);
      ctx.quadraticCurveTo(rx, py + 5, rx + 3, py + 14);
      ctx.fill();
    }
    ctx.restore();
  }

  renderAmbientParticles(ctx) {
    ctx.save();
    for (const p of this.ambientParticles) {
      const rx = p.x - this.camera.x;
      const ry = p.y - this.camera.y;
      if (rx < -10 || rx > this.camera.width + 10 || ry < -10 || ry > this.camera.height + 10) continue;

      ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.phase));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(rx, ry, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderLighting(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const prop of this.props) {
      if (prop.hasLight) {
        const rx = prop.x - this.camera.x;
        const ry = prop.y - this.camera.y;
        const rad = prop.lightRadius || 100;

        const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
        grad.addColorStop(0, prop.lightColor || 'rgba(255, 190, 60, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(rx, ry, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
