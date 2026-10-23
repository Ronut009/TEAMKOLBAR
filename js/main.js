/**
 * ==========================================================================
 * UNDERWATER RUINS - MAIN ENTRY POINT (js/main.js)
 * ==========================================================================
 */

import { Level } from './level.js';
import { Player } from './player.js';
import { Engine } from './engine.js';
import { Input } from './input.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  // Build underwater ruins level
  const level = new Level();

  // Spawn player on the left ruin platform (top surface at y=340)
  // Player y is bottom-of-feet, so feet at y=340
  const player = new Player(220, 340);

  const engine = new Engine(canvas, level, player);

  window.__GAME__ = { engine, level, player, input: Input };

  engine.start();
});
