# Rakti: The Last Guardian

A 2D action platformer in plain JavaScript and canvas. One build plays on PC (keyboard, mouse, gamepad) and on
phones (touch controls); the title screen's **MODE** switch picks one, and the first visit guesses from the device.

## Folder layout

```
index.html               the page: title screen, menus, HUD, dialogue, cutscene
manifest.webmanifest     install-as-app details
sw.js                    offline cache (bump ASSET_VERSION whenever a shipped file changes)
icons/                   app and browser icons
css/style.css            all styling
js/
  main.js                starts the game
  pwa.js                 phone screen handling (landscape lock, wake lock)
  dev.js                 developer shortcuts (off in normal play)
  core/                  engine, input, touch controls, audio, settings, save slots, preloader
  entities/              Rakti, Betal, the archer, the Level 4 boss
  levels/                level1.js - level4.js, endless.js (Unlimited mode)
  render/                shared drawing helpers (platform art, shrine beacon)
assets/
  audio/music, audio/sfx
  characters/            rakti, rakti_prologue, betal, archer, weapons, portraits
  cutscenes/             opening_film.mp4
  levels/                level1, level2, level3, level4, endless (each level's own art)
  ui/                    hud, title, card_frame.webp
backup/                  retired art, old scripts and old files (git-ignored, never deployed)
```

## Updating the live game

1. Test in the browser (any local server, e.g. VS Code's Live Server or `python -m http.server`).
2. In VS Code: Source Control, type a message, **Commit**, then **Sync Changes**.
3. Render redeploys from `main` in a few minutes. Press Ctrl+F5 once it is live.
