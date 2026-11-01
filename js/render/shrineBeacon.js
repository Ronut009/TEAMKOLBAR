/**
 * ==========================================================================
 * SHRINE BEACON (js/render/shrineBeacon.js)
 * The "a relic waits here" look first used on Level 2's Trishul shrine, shared by all four shrines:
 * a soft light shaft falling onto the shrine, a halo round the relic and a bobbing gold triangle above it.
 * ==========================================================================
 */

/**
 * @param ctx      canvas context (world space)
 * @param o.x      centre x of the shrine / relic
 * @param o.baseY  where the light lands (the shrine's bowl, niche sill or seat)
 * @param o.relicY centre y of the relic (halo); o.relicH its height (the marker floats above it)
 * @param o.t      animation time in seconds
 * @param o.rgb    the halo's colour ('r, g, b'); the shaft and marker stay gold
 * @param o.marker false hides the triangle (e.g. while the relic is still sealed)
 * @param o.shaftH how far above the bowl the shaft starts (default 90)
 */
export function drawShrineBeacon(ctx, o) {
  const { x, baseY, relicY, relicH = 30, t, rgb = '160, 255, 240', marker = true, shaftH = 90, alpha = 1 } = o;
  if (alpha <= 0.01) return;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // light falling onto the shrine
  const top = baseY - shaftH;
  const shaft = ctx.createLinearGradient(0, top, 0, baseY + 6);
  shaft.addColorStop(0, 'rgba(255, 230, 150, 0)');
  shaft.addColorStop(1, `rgba(255, 230, 150, ${(0.18 + 0.08 * pulse) * alpha})`);
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(x - 6, top); ctx.lineTo(x + 6, top); ctx.lineTo(x + 24, baseY + 6); ctx.lineTo(x - 24, baseY + 6);
  ctx.fill();
  // halo round the relic
  const g = ctx.createRadialGradient(x, relicY, 2, x, relicY, 46);
  g.addColorStop(0, `rgba(${rgb}, ${(0.32 + 0.18 * pulse) * alpha})`);
  g.addColorStop(0.5, `rgba(255, 215, 120, ${0.1 * alpha})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 48, relicY - 48, 96, 96);
  ctx.restore();
  if (!marker) return;
  // bobbing gold triangle pointing down at it
  const my = relicY - relicH / 2 - 12 + Math.sin(t * 4) * 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgba(255, 214, 110, ${0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3.2))})`;
  ctx.strokeStyle = 'rgba(60, 30, 10, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, my - 5); ctx.lineTo(x + 6, my - 5); ctx.lineTo(x, my + 3); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
