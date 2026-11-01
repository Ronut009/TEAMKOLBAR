/**
 * Starts the start-screen music as early as the page allows: this tiny module loads long before the game's
 * many scripts have finished, so the track is already buffered when the first click lets it play.
 */
import { Music } from './audio.js';

Music.play('title');
