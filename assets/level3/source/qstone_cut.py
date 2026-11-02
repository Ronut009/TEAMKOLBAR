# Cuts the user's 6-frame jungle (green) and earthen (orange) morph sheets into uniform game sheets.
# Each frame is centred on its own column span, rows 130..590 of the source are kept, stored at 0.6x.
import sys
from PIL import Image
SEGS = {
 'green': [(28, 320), (370, 660), (733, 988), (1018, 1383), (1400, 1765), (1784, 2153)],
 'earth': [(34, 316), (374, 659), (741, 1003), (1040, 1393), (1413, 1774), (1790, 2147)],
}
CELL_W, Y0, Y1, K = 380, 130, 590, 0.6
for name, src, out in [('green', sys.argv[1], sys.argv[3]), ('earth', sys.argv[2], sys.argv[4])]:
    im = Image.open(src).convert('RGBA')
    sheet = Image.new('RGBA', (CELL_W * 6, Y1 - Y0), (0, 0, 0, 0))
    for i, (s, e) in enumerate(SEGS[name]):
        cx = (s + e) // 2
        piece = im.crop((cx - CELL_W // 2, Y0, cx + CELL_W // 2, Y1))
        # keep only this frame's own pixels (neighbours can poke into the cell)
        mask = Image.new('L', piece.size, 0)
        mask.paste(255, (s - (cx - CELL_W // 2), 0, e - (cx - CELL_W // 2), Y1 - Y0))
        clean = Image.new('RGBA', piece.size, (0, 0, 0, 0)); clean.paste(piece, (0, 0), mask)
        sheet.paste(clean, (i * CELL_W, 0))
    sheet = sheet.resize((round(sheet.width * K), round(sheet.height * K)), Image.LANCZOS)
    sheet.save(out, optimize=True)
    print(out, sheet.size)
