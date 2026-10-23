const ENEMY_FRAMES = {
  walk: [
    { x: 42, y: 60, width: 176, height: 190 },
    { x: 218, y: 60, width: 166, height: 190 },
    { x: 384, y: 60, width: 166, height: 190 },
    { x: 550, y: 60, width: 168, height: 190 },
    { x: 718, y: 60, width: 160, height: 190 },
    { x: 878, y: 60, width: 146, height: 190 }
  ],
  attack: [
    { x: 47, y: 311, width: 168, height: 174 },
    { x: 215, y: 312, width: 166, height: 173 },
    { x: 381, y: 280, width: 174, height: 205 },
    { x: 555, y: 279, width: 163, height: 206 },
    { x: 718, y: 313, width: 160, height: 172 },
    { x: 878, y: 310, width: 146, height: 175 }
  ],
  hurt: [
    { x: 46, y: 785, width: 169, height: 177 },
    { x: 215, y: 785, width: 169, height: 177 }
  ],
  fallen: { x: 550, y: 862, width: 220, height: 105 }
};

function makeTransparentBackground(frame) {
  const ctx = frame.getContext('2d', { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  const pixels = imageData.data;
  const queue = new Int32Array(frame.width * frame.height);
  let head = 0;
  let tail = 0;

  const isWhiteBackground = (pixel) => {
    const red = pixels[pixel];
    const green = pixels[pixel + 1];
    const blue = pixels[pixel + 2];
    return red > 238 && green > 238 && blue > 238
      && Math.max(red, green, blue) - Math.min(red, green, blue) < 24;
  };

  const enqueue = (index) => {
    const pixel = index * 4;
    if (pixels[pixel + 3] === 0 || !isWhiteBackground(pixel)) return;
    pixels[pixel + 3] = 0;
    queue[tail++] = index;
  };

  for (let x = 0; x < frame.width; x++) {
    enqueue(x);
    enqueue((frame.height - 1) * frame.width + x);
  }
  for (let y = 1; y < frame.height - 1; y++) {
    enqueue(y * frame.width);
    enqueue(y * frame.width + frame.width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % frame.width;
    const y = Math.floor(index / frame.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < frame.width) enqueue(index + 1);
    if (y > 0) enqueue(index - frame.width);
    if (y + 1 < frame.height) enqueue(index + frame.width);
  }

  ctx.putImageData(imageData, 0, 0);
}

export class EnemySpriteSheet {
  constructor() {
    this.loaded = false;
    this.frames = { walk: [], attack: [], hurt: [], fallen: null };
    this.sheet = new Image();
    this.sheet.onload = () => this.prepareFrames();
    this.sheet.src = 'assets/anims/sentinel_enemy_sheet.jpeg';
    if (this.sheet.complete && this.sheet.naturalWidth > 0) this.prepareFrames();
  }

  prepareFrames() {
    if (this.loaded || !this.sheet.naturalWidth) return;

    const extract = ({ x, y, width, height }) => {
      const frame = document.createElement('canvas');
      frame.width = width;
      frame.height = height;
      const ctx = frame.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(this.sheet, x, y, width, height, 0, 0, width, height);
      makeTransparentBackground(frame);
      return frame;
    };

    this.frames.walk = ENEMY_FRAMES.walk.map(extract);
    this.frames.attack = ENEMY_FRAMES.attack.map(extract);
    this.frames.hurt = ENEMY_FRAMES.hurt.map(extract);
    this.frames.fallen = extract(ENEMY_FRAMES.fallen);
    this.loaded = true;
  }

  render(ctx, enemy, { width = 66, height = 82 } = {}) {
    if (!this.loaded) return false;

    let frame;
    let drawWidth = width;
    let drawHeight = height;
    if (enemy.dead) {
      frame = this.frames.fallen;
      drawWidth = width * 1.18;
      drawHeight = height * 0.43;
    } else if ((enemy.hurtTimer || 0) > 0) {
      const hurtElapsed = Math.max(0, 0.3 - enemy.hurtTimer);
      frame = this.frames.hurt[Math.min(this.frames.hurt.length - 1, Math.floor(hurtElapsed * 10))];
    } else if (enemy.attacking || enemy.isAttacking) {
      const timer = enemy.attackAnimTimer || 0;
      const duration = enemy.attackAnimDuration || 0.72;
      const progress = Math.min(0.999, timer / duration);
      frame = this.frames.attack[Math.floor(progress * this.frames.attack.length)];
    } else if (enemy.isMoving) {
      frame = this.frames.walk[Math.floor((enemy.animTime || 0) * 9) % this.frames.walk.length];
    } else {
      frame = this.frames.walk[0];
    }

    if (!frame) return false;

    ctx.save();
    ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
    if (enemy.facing === 'left') ctx.scale(-1, 1);
    ctx.drawImage(frame, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }
}
