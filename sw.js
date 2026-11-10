// Rakti: The Last Guardian - offline cache.
// Bump ASSET_VERSION whenever shipped files change in a way the network-first shell cannot pick up
// (renamed/replaced assets under assets/ are cache-first, so they need a bump to refresh).
const ASSET_VERSION = 'v15-hybrid';

const SHELL_CACHE = `rakti-shell-${ASSET_VERSION}`;
const ASSET_CACHE = `rakti-assets-${ASSET_VERSION}`;
const FONT_CACHE = 'rakti-fonts-v1';
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];

// App shell: index, styles, every module reachable from js/main.js, manifest and icons.
const SHELL_URLS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/pwa.js',
  'js/dev.js',
  'js/core/preload.js',
  'js/core/audio.js',
  'js/core/engine.js',
  'js/core/input.js',
  'js/core/keyLabels.js',
  'js/core/mode.js',
  'js/core/settings.js',
  'js/core/titleMusic.js',
  'js/core/touch.js',
  'js/entities/archer.js',
  'js/entities/betal.js',
  'js/entities/enemySprites.js',
  'js/entities/fatherBoss.js',
  'js/entities/player.js',
  'js/levels/endless.js',
  'js/levels/level1.js',
  'js/levels/level2.js',
  'js/levels/level3.js',
  'js/levels/level4.js',
  'js/render/platformArt.js',
  'js/render/shrineBeacon.js',
  // new modules added by other sessions (e.g. touch controls) are cached at runtime on first load
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

// Title screen + HUD + menus: needed before the first level starts.
const TITLE_URLS = [
  'assets/title/start-screen.webp',
  'assets/title/rakti-logo.webp',
  'assets/title/menu-button.webp',
  'assets/title/menu-button-pressed.webp',
  'assets/title/kali-loading-sigil.webp',
  'assets/audio/music/title.mp3',
  'assets/ui/card_frame.webp',
  'assets/ui/hud/rakti_medallion.webp',
  'assets/ui/hud/hp_bar.webp',
  'assets/ui/hud/ability_bar.webp',
  'assets/ui/hud/talwar.webp',
  'assets/ui/hud/father_boss_bar.webp',
];

// Placeholder: fill with the Level 1 files once the asset audit reports them.
const LEVEL1_URLS = [
  'assets/anims/betal/attack_0.webp',
  'assets/anims/betal/attack_1.webp',
  'assets/anims/betal/attack_2.webp',
  'assets/anims/betal/attack_3.webp',
  'assets/anims/betal/attack_4.webp',
  'assets/anims/betal/attack_5.webp',
  'assets/anims/betal/death_0.webp',
  'assets/anims/betal/death_1.webp',
  'assets/anims/betal/death_2.webp',
  'assets/anims/betal/death_3.webp',
  'assets/anims/betal/hurt_0.webp',
  'assets/anims/betal/hurt_1.webp',
  'assets/anims/betal/walk_0.webp',
  'assets/anims/betal/walk_1.webp',
  'assets/anims/betal/walk_2.webp',
  'assets/anims/betal/walk_3.webp',
  'assets/anims/betal/walk_4.webp',
  'assets/anims/betal/walk_5.webp',
  'assets/anims/rakti_prologue/outfit_0.webp',
  'assets/anims/rakti_prologue/outfit_1.webp',
  'assets/anims/rakti_prologue/outfit_2.webp',
  'assets/anims/rakti_prologue/outfit_3.webp',
  'assets/anims/rakti_prologue/outfit_4.webp',
  'assets/anims/rakti_prologue/outfit_5.webp',
  'assets/anims/rakti_prologue/wake_0.webp',
  'assets/anims/rakti_prologue/wake_1.webp',
  'assets/anims/rakti_prologue/wake_2.webp',
  'assets/anims/rakti_prologue/wake_3.webp',
  'assets/anims/rakti_prologue/wake_4.webp',
  'assets/anims/rakti_prologue/wake_5.webp',
  'assets/anims/rakti_prologue/walk_0.webp',
  'assets/anims/rakti_prologue/walk_1.webp',
  'assets/anims/rakti_prologue/walk_2.webp',
  'assets/anims/rakti_prologue/walk_3.webp',
  'assets/anims/rakti_prologue/walk_4.webp',
  'assets/anims/rakti_prologue/walk_5.webp',
  'assets/anims/rakti_v3/attack_0.webp',
  'assets/anims/rakti_v3/attack_1.webp',
  'assets/anims/rakti_v3/attack_2.webp',
  'assets/anims/rakti_v3/attack_3.webp',
  'assets/anims/rakti_v3/attack_4.webp',
  'assets/anims/rakti_v3/attack_5.webp',
  'assets/anims/rakti_v3/climb_0.webp',
  'assets/anims/rakti_v3/climb_1.webp',
  'assets/anims/rakti_v3/climb_2.webp',
  'assets/anims/rakti_v3/climb_3.webp',
  'assets/anims/rakti_v3/climb_4.webp',
  'assets/anims/rakti_v3/climb_5.webp',
  'assets/anims/rakti_v3/descend_0.webp',
  'assets/anims/rakti_v3/descend_1.webp',
  'assets/anims/rakti_v3/descend_2.webp',
  'assets/anims/rakti_v3/descend_3.webp',
  'assets/anims/rakti_v3/descend_4.webp',
  'assets/anims/rakti_v3/descend_5.webp',
  'assets/anims/rakti_v3/idle_0.webp',
  'assets/anims/rakti_v3/idle_1.webp',
  'assets/anims/rakti_v3/idle_2.webp',
  'assets/anims/rakti_v3/idle_3.webp',
  'assets/anims/rakti_v3/idle_4.webp',
  'assets/anims/rakti_v3/idle_5.webp',
  'assets/anims/rakti_v3/jump_0.webp',
  'assets/anims/rakti_v3/jump_1.webp',
  'assets/anims/rakti_v3/jump_2.webp',
  'assets/anims/rakti_v3/jump_3.webp',
  'assets/anims/rakti_v3/jump_4.webp',
  'assets/anims/rakti_v3/jump_5.webp',
  'assets/anims/rakti_v3/kali_hover_0.webp',
  'assets/anims/rakti_v3/kali_hover_1.webp',
  'assets/anims/rakti_v3/kali_hover_2.webp',
  'assets/anims/rakti_v3/kali_hover_3.webp',
  'assets/anims/rakti_v3/kali_hover_4.webp',
  'assets/anims/rakti_v3/kali_hover_5.webp',
  'assets/anims/rakti_v3/kali_move_0.webp',
  'assets/anims/rakti_v3/kali_move_1.webp',
  'assets/anims/rakti_v3/kali_move_2.webp',
  'assets/anims/rakti_v3/kali_move_3.webp',
  'assets/anims/rakti_v3/kali_move_4.webp',
  'assets/anims/rakti_v3/kali_move_5.webp',
  'assets/anims/rakti_v3/kali_revert_0.webp',
  'assets/anims/rakti_v3/kali_revert_1.webp',
  'assets/anims/rakti_v3/kali_revert_2.webp',
  'assets/anims/rakti_v3/kali_revert_3.webp',
  'assets/anims/rakti_v3/kali_revert_4.webp',
  'assets/anims/rakti_v3/kali_revert_5.webp',
  'assets/anims/rakti_v3/kali_transform_0.webp',
  'assets/anims/rakti_v3/kali_transform_1.webp',
  'assets/anims/rakti_v3/kali_transform_2.webp',
  'assets/anims/rakti_v3/kali_transform_3.webp',
  'assets/anims/rakti_v3/kali_transform_4.webp',
  'assets/anims/rakti_v3/kali_transform_5.webp',
  'assets/anims/rakti_v3/mantle_0.webp',
  'assets/anims/rakti_v3/mantle_1.webp',
  'assets/anims/rakti_v3/mantle_10.webp',
  'assets/anims/rakti_v3/mantle_11.webp',
  'assets/anims/rakti_v3/mantle_2.webp',
  'assets/anims/rakti_v3/mantle_3.webp',
  'assets/anims/rakti_v3/mantle_4.webp',
  'assets/anims/rakti_v3/mantle_5.webp',
  'assets/anims/rakti_v3/mantle_6.webp',
  'assets/anims/rakti_v3/mantle_7.webp',
  'assets/anims/rakti_v3/mantle_8.webp',
  'assets/anims/rakti_v3/mantle_9.webp',
  'assets/anims/rakti_v3/run_0.webp',
  'assets/anims/rakti_v3/run_1.webp',
  'assets/anims/rakti_v3/run_2.webp',
  'assets/anims/rakti_v3/run_3.webp',
  'assets/anims/rakti_v3/run_4.webp',
  'assets/anims/rakti_v3/run_5.webp',
  'assets/anims/rakti_v3/runback_0.webp',
  'assets/anims/rakti_v3/runback_1.webp',
  'assets/anims/rakti_v3/runback_2.webp',
  'assets/anims/rakti_v3/runback_3.webp',
  'assets/anims/rakti_v3/runback_4.webp',
  'assets/anims/rakti_v3/runback_5.webp',
  'assets/audio/music/title.mp3',
  'assets/audio/sfx/boss_blast.wav',
  'assets/audio/sfx/boss_gong.wav',
  'assets/audio/sfx/boss_land.wav',
  'assets/audio/sfx/boss_slam.wav',
  'assets/audio/sfx/door_open.wav',
  'assets/audio/sfx/footsteps.wav',
  'assets/audio/sfx/ground_rise.wav',
  'assets/audio/sfx/hit1.wav',
  'assets/audio/sfx/hit2.wav',
  'assets/audio/sfx/hit3.wav',
  'assets/audio/sfx/hit4.wav',
  'assets/audio/sfx/hit5.wav',
  'assets/audio/sfx/item_aura.wav',
  'assets/audio/sfx/item_get.wav',
  'assets/audio/sfx/jump.wav',
  'assets/audio/sfx/mob_aggro.wav',
  'assets/audio/sfx/mob_growl.wav',
  'assets/audio/sfx/mob_swing1.wav',
  'assets/audio/sfx/mob_swing2.wav',
  'assets/audio/sfx/mob_swing3.wav',
  'assets/audio/sfx/morph.wav',
  'assets/audio/sfx/portal_open.wav',
  'assets/audio/sfx/rocket_fly.wav',
  'assets/audio/sfx/rocket_launch.wav',
  'assets/audio/sfx/stone_close.wav',
  'assets/audio/sfx/stone_move.wav',
  'assets/audio/sfx/stone_open.wav',
  'assets/audio/sfx/stone_shake.wav',
  'assets/audio/sfx/sword_draw.wav',
  'assets/audio/sfx/sword_swing1.wav',
  'assets/audio/sfx/sword_swing2.wav',
  'assets/audio/sfx/text_pop1.wav',
  'assets/audio/sfx/text_pop2.wav',
  'assets/audio/sfx/text_pop3.wav',
  'assets/audio/sfx/trishul_draw.wav',
  'assets/audio/sfx/trishul_throw.wav',
  'assets/audio/sfx/vine_in.wav',
  'assets/audio/sfx/vine_lash.wav',
  'assets/audio/sfx/vine_out.wav',
  'assets/level1/column.webp',
  'assets/level1/filler_ruins.webp',
  'assets/level1/geyser_sheet.webp',
  'assets/level1/hibiscus/hib_front.webp',
  'assets/level1/hibiscus/hib_side_a.webp',
  'assets/level1/hibiscus/hib_side_b.webp',
  'assets/level1/hibiscus/leaf_b.webp',
  'assets/level1/hibiscus/leaf_c.webp',
  'assets/level1/hibiscus/pad_l.webp',
  'assets/level1/hibiscus/pad_m.webp',
  'assets/level1/hibiscus/pad_s.webp',
  'assets/level1/hibiscus/petal_c.webp',
  'assets/level1/hibiscus/petal_d.webp',
  'assets/level1/kali_idol.webp',
  'assets/level1/lever_0.webp',
  'assets/level1/lever_1.webp',
  'assets/level1/lever_2.webp',
  'assets/level1/pillar_medium.webp',
  'assets/level1/pillar_small.webp',
  'assets/level1/pillar_tall.webp',
  'assets/level1/prologue_portal.webp',
  'assets/level1/relic.webp',
  'assets/level1/sanctum_clean.webp',
  'assets/level1/sanctum_suns.webp',
  'assets/level1/shrine.webp',
  'assets/level1/spikes/single_spike_sheet.webp',
  'assets/level1/tower_door_closed.webp',
  'assets/level1/tower_door_open.webp',
  'assets/level1/tower_shrine.webp',
  'assets/level1/towers_bg.webp',
  'assets/platforms/temple_platform_v2.webp',
  'assets/portraits/kali2_0.webp',
  'assets/portraits/kali3_0.webp',
  'assets/portraits/kali3_1.webp',
  'assets/portraits/kali3_10.webp',
  'assets/portraits/kali3_11.webp',
  'assets/portraits/kali3_2.webp',
  'assets/portraits/kali3_3.webp',
  'assets/portraits/kali3_4.webp',
  'assets/portraits/kali3_5.webp',
  'assets/portraits/kali3_6.webp',
  'assets/portraits/kali3_7.webp',
  'assets/portraits/kali3_8.webp',
  'assets/portraits/kali3_9.webp',
  'assets/portraits/rakti3_0.webp',
  'assets/portraits/rakti3_1.webp',
  'assets/portraits/rakti3_10.webp',
  'assets/portraits/rakti3_11.webp',
  'assets/portraits/rakti3_2.webp',
  'assets/portraits/rakti3_3.webp',
  'assets/portraits/rakti3_4.webp',
  'assets/portraits/rakti3_5.webp',
  'assets/portraits/rakti3_6.webp',
  'assets/portraits/rakti3_7.webp',
  'assets/portraits/rakti3_8.webp',
  'assets/portraits/rakti3_9.webp',
  'assets/portraits/rakti_sari3_0.webp',
  'assets/portraits/rakti_sari3_1.webp',
  'assets/portraits/rakti_sari3_2.webp',
  'assets/portraits/rakti_sari3_3.webp',
  'assets/portraits/rakti_sari3_4.webp',
  'assets/portraits/rakti_sari3_5.webp',
  'assets/title/kali-loading-sigil.webp',
  'assets/title/menu-button-pressed.webp',
  'assets/title/menu-button.webp',
  'assets/title/rakti-logo.webp',
  'assets/title/start-screen.webp',
  'assets/ui/card_frame.webp',
  'assets/ui/hud/ability_bar.webp',
  'assets/ui/hud/hp_bar.webp',
  'assets/ui/hud/kali_medallion.webp',
  'assets/ui/hud/rakti_medallion.webp',
  'assets/ui/hud/rakti_medallion_hurt.webp',
  'assets/ui/hud/talwar.webp',
  'assets/ui/hud/trishul.webp',
  'assets/weapons/trishul_throw.webp'
];

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Marcellus&family=Press+Start+2P&display=swap';

async function precache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  // One missing file must not abort the install.
  await Promise.all(urls.map(async (url) => {
    try { await cache.add(new Request(url, { cache: 'reload' })); }
    catch (err) { console.warn('[sw] precache miss', url, err); }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await precache(SHELL_CACHE, SHELL_URLS);
    await precache(ASSET_CACHE, [...TITLE_URLS, ...LEVEL1_URLS]);
    try {
      const fonts = await caches.open(FONT_CACHE);
      await fonts.add(new Request(FONT_CSS_URL, { mode: 'no-cors' }));
    } catch (_) { /* offline fonts fall back to serif */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('rakti-') && !CURRENT_CACHES.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

const isAudio = (url) => /\.(mp3|ogg|wav|m4a|aac|flac|webm)$/i.test(url.pathname);

// Safari asks for audio/video with Range requests and refuses a plain 200 reply: slice the cached body into a 206.
async function rangeResponse(request, full) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  let start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  let end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function fetchFull(request) {
  // Fetch the whole file (no Range) so it can be cached and sliced.
  return fetch(new Request(request.url, { credentials: 'same-origin' }));
}

async function cacheFirstAsset(request, url) {
  const cache = await caches.open(ASSET_CACHE);
  let full = await cache.match(request.url, { ignoreVary: true });
  if (!full) {
    full = await fetchFull(request);
    if (full.ok && full.status === 200) cache.put(request.url, full.clone()).catch(() => {});
  }
  if (isAudio(url) && request.headers.has('range') && full.status === 200) return rangeResponse(request, full.clone());
  return full;
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok && res.status === 200) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === 'navigate') {
      const index = await cache.match('index.html');
      if (index) return index;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Google Fonts: stylesheet and font files, stale-while-revalidate.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(request);
      const refresh = fetch(request).then((res) => {
        if (res.ok || res.type === 'opaque') cache.put(request, res.clone()).catch(() => {});
        return res;
      }).catch(() => null);
      return hit || (await refresh) || Response.error();
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Same scope as the worker: strip it so the checks below work for subfolder hosting too.
  const scopePath = new URL(self.registration.scope).pathname;
  const path = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname.slice(1);

  // The opening film (12 MB) streams straight from the network: the worker would have to download all of it
  // before the first frame. Offline, the cutscene just fails to load and the game carries on past it.
  if (/\.(mp4|m4v|mov)$/i.test(path)) return;

  if (path.startsWith('assets/')) {
    event.respondWith(cacheFirstAsset(request, url));
    return;
  }
  event.respondWith(networkFirstShell(request));
});
