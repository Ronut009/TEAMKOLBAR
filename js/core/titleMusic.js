/**
 * Readies the start-screen music as early as the page allows: this tiny module loads long before the game's many
 * scripts have finished, so the track is already buffered when the player's first key press or touch starts it
 * (the start screen shows "press any key or click for music" until then).
 */
import { Music } from './audio.js';

Music.play('title');
