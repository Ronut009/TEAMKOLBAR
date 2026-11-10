# Rakti: The Last Guardian — hybrid experimental build

**Experimental.** One app, two experiences. The two originals are untouched:
`TEAMKOLBAR` (PC) and `TEAMKOLBAR-mobile` stay as they were; every hybrid change lives only here.

## How the hybrid works

Think of two overlapping circles:

- **Shared middle** — the whole game: levels, engine, WebP assets, preloader, Kali's Decrees,
  dev menu, dialogue system, settings, gamepad support, PWA manifest + service worker.
  (The mobile build was the newer superset of the PC build, so it is the shared base.)
- **Mobile Mode only** (`js/core/mode.js` → `Mode.isMobile`):
  - the touch overlay (`js/core/touch.js`) — joystick, buttons, auto-aim
  - the PWA screen behavior (`js/pwa.js`) — landscape lock, wake lock, `html.touch/compact` CSS classes
  - the touch-tuned jump (`js/entities/player.js`): impulse −612 / Kali −840, softer jump-cut
- **PC Mode only**: the original keyboard/mouse jump feel (−470 / −560, uniform jump-cut);
  no touch overlay ever mounts, so every `Touch.active` branch behaves exactly like `TEAMKOLBAR`.

There are **not** two apps in here — Mobile Mode replaces only the behavior that genuinely differs
(like a git diff applied on top of the shared base).

## Choosing a mode

- The title screen has one **MODE: 🖥 PC / 📱 MOBILE** switch (`#modeSwitch`). The choice is saved in
  `localStorage` (`raktiMode`) and switching reloads the page so every module starts in the right mode.
- First visit auto-detects: coarse pointer → Mobile Mode, otherwise PC Mode.
- Narrow-and-tall viewport prompt (`#orientationPrompt`, driven by `js/core/mode.js`):
  - touch device in PC Mode → one button: **SWITCH TO MOBILE MODE** (or stay);
  - Mobile Mode in portrait → the classic **rotate your phone** screen;
  - a tall desktop window → "best in landscape, try resizing" (dismissable).

## Running it

Local test: `python -m http.server 8123` in this folder, open http://localhost:8123
(or use `play-rakti.bat` / `rakti-server.ps1`, carried over from the PC build).
Deploy like the mobile build: any static host over HTTPS (the service worker needs it).
After changing any shipped file, bump `ASSET_VERSION` in `sw.js` (currently `v15-hybrid`).
