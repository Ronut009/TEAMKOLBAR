# Builds: the cleaned red Forest Heart sheet (checker holes removed), the 6-frame hourglass sheet and the hourglass pickup.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
G = sys.argv[1]   # game root
# ---- red heart: 5x2 cells of 225x228; drop the grey "fake transparency" checker inside the loops
a = np.array(Image.open(G + '/assets/level3/forest_heart.png').convert('RGBA')).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
grey = (al > 0) & (mx < 70) & (mx - mn < 14)
lab, n = ndimage.label(grey)
sizes = ndimage.sum(grey, lab, range(1, n + 1))
kill = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 60])
kill = ndimage.binary_dilation(kill, iterations=1) & (mx < 80) & (mx - mn < 22)
a[kill, 3] = 0
print('heart: removed px', int(kill.sum()))
Image.fromarray(a.astype(np.uint8)).save(G + '/assets/level3/forest_heart_red.png', optimize=True)
# ---- hourglass sheet: 6 frames, centred in 360 x 600 cells (rows 46..646), stored at half size
SEG = [(10, 361), (370, 722), (731, 1081), (1091, 1441), (1451, 1801), (1810, 2162)]
src = Image.open(sys.argv[2]).convert('RGBA')
def defringe(im):
    x = np.array(im).astype(int)
    r, g, b = x[..., 0], x[..., 1], x[..., 2]
    red = (r > 120) & (g < r * 0.42) & (b < r * 0.42)
    x[red, 3] = 0
    return Image.fromarray(x.astype(np.uint8))
CW, Y0, Y1 = 360, 40, 652
sheet = Image.new('RGBA', (CW * 6, Y1 - Y0), (0, 0, 0, 0))
for i, (s, e) in enumerate(SEG):
    cx = (s + e) // 2
    piece = src.crop((cx - CW // 2, Y0, cx + CW // 2, Y1))
    m = Image.new('L', piece.size, 0); m.paste(255, (s - (cx - CW // 2), 0, e - (cx - CW // 2), Y1 - Y0))
    clean = Image.new('RGBA', piece.size, (0, 0, 0, 0)); clean.paste(piece, (0, 0), m)
    sheet.paste(defringe(clean), (i * CW, 0))
sheet = sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS)
sheet.save(G + '/assets/ui/hud/sands_hourglass_sheet.png', optimize=True); print('sheet', sheet.size)
# ---- single hourglass (the pickup on tower 2)
one = defringe(Image.open(sys.argv[3]).convert('RGBA'))
one = one.crop(one.getbbox())
one = one.resize((round(one.width * 240 / one.height), 240), Image.LANCZOS)
one.save(G + '/assets/level2/sprites/sands_hourglass.png', optimize=True); print('pickup', one.size)
# ---- the heart sheet: clear stray bits of the neighbouring frame that poke in at each cell's left/right edge
h = np.array(Image.open(G + '/assets/level3/forest_heart_red.png')).astype(int)
for row in range(2):
    for col in range(5):
        x0, y0 = col * 225, row * 228
        cell = h[y0:y0 + 228, x0:x0 + 225]
        lab, n = ndimage.label(cell[..., 3] > 0)
        for i in range(1, n + 1):
            xs = np.where(lab == i)[1]
            if (xs.min() < 10 or xs.max() > 214) and (xs.max() - xs.min()) < 30:
                cell[lab == i, 3] = 0
Image.fromarray(h.astype(np.uint8)).save(G + '/assets/level3/forest_heart_red.png', optimize=True)
