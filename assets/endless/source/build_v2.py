# Chaos mode art v2: fits the user's new floor strip, mud sheet and fortress wall to the layouts endless.js uses.
import sys, numpy as np
from PIL import Image
S, OUT = sys.argv[1], sys.argv[2]
# floor: crop to the art (x 6..2164, rows 205..470); walking surface = row 282 of the source (front of the grass)
f = Image.open(S + '/floor_v2_source.png').convert('RGBA').crop((6, 205, 2164, 470))
f.save(OUT + '/floor_grass.png', optimize=True); print('floor', f.size, 'surfaceY', 282 - 205)
# mud sheet: 3 x 4 cells of 724 x 181 -> cells of 650 x 180, slab bottoms aligned on row 172
m = Image.open(S + '/mud_sheet_v2_source.png').convert('RGBA')
CW, CH, K = 650, 180, 650 / 724
sheet = Image.new('RGBA', (CW * 3, CH * 4), (0, 0, 0, 0))
tops = []
for r in range(4):
    for c in range(3):
        cell = m.crop((c * 724, r * 181, (c + 1) * 724, (r + 1) * 181))
        cell = cell.resize((CW, round(181 * K)), Image.LANCZOS)
        a = np.array(cell)[..., 3] > 60
        rows = np.where(a.any(1))[0]
        bottom = rows.max()
        dy = 172 - bottom
        sheet.paste(cell, (c * CW, r * CH + dy), cell)
        mid = a[:, 200:450]
        t = [int(np.argmax(mid[:, x])) for x in range(mid.shape[1]) if mid[:, x].any()]
        tops.append(int(np.percentile(t, 70)) + dy)
sheet.save(OUT + '/mud_sheet.png', optimize=True); print('mud', sheet.size, 'grass tops', tops)
# wall: crop to the art (rows 0..734) and fit to 2000 wide
w = Image.open(S + '/castle_wall_v2_source.png').convert('RGBA').crop((0, 0, 2086, 734))
w = w.resize((2000, round(734 * 2000 / 2086)), Image.LANCZOS)
w.save(OUT + '/castle_wall.png', optimize=True); print('wall', w.size)
