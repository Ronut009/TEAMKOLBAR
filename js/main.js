/**
 * ==========================================================================
 * GLITCHVERSE - MAIN ENTRY POINT (js/main.js)
 * Fullscreen initialization, level setup, and engine start.
 * ==========================================================================
 */

import { Level } from './level.js';
import { Player } from './player.js';
import { Engine } from './engine.js';
import { Input } from './input.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Failed to locate #gameCanvas element.');
    return;
  }

  // Initialize atmospheric ruins level (54x40 tiles)
  const level = new Level(54, 40, 32);

  // Spawn player near central courtyard dais
  const spawnX = level.width / 2;
  const spawnY = level.height / 2 + 50;
  const player = new Player(spawnX, spawnY);

  // Initialize engine with dynamic fullscreen canvas
  const engine = new Engine(canvas, level, player);

  // Expose global debug reference
  window.__GAME__ = {
    engine,
    level,
    player,
    input: Input
  };

  // Launch loop
  engine.start();
});
