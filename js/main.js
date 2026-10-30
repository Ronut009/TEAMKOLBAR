/**
 * ==========================================================================
 * GLITCHVERSE - MAIN ENTRY POINT (js/main.js)
 * Initializes submerged temple level, platformer player, and engine loop.
 * ==========================================================================
 */

import { Level } from './level1.js';   // js/level.js = previous single-screen Level 1 (backup)
import { Player } from './player.js';
import { Engine } from './engine.js';
import { Input } from './input.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Failed to locate #gameCanvas element.');
    return;
  }

  // Initialize Submerged Temple Ruins Level (1024x434 map)
  const level = new Level();

  // Spawn Player on the lower left courtyard floor
  const spawnX = 160;
  const spawnY = 366;
  const player = new Player(spawnX, spawnY);

  // Initialize engine with responsive fullscreen camera
  const engine = new Engine(canvas, level, player);

  // Debug global reference
  window.__GAME__ = {
    engine,
    level,
    player,
    input: Input
  };

  // Launch engine loop
  engine.start();
});
