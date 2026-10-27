# Second half of export.js: Instagram JPEGs from the 2x screenshots, and the PDF trimmed to exactly
# 1080x1350 (Chromium rounds the page up by half a point, which left a white hairline under every page).
import glob, os, shutil, sys
import pypdf
from PIL import Image

out = sys.argv[1]
os.makedirs(os.path.join(out, 'instagram'), exist_ok=True)
for f in sorted(glob.glob(os.path.join(out, '.png', '*.png'))):
    name = os.path.basename(f)[:-4] + '.jpg'
    Image.open(f).convert('RGB').save(os.path.join(out, 'instagram', name), quality=95, subsampling=0)
shutil.rmtree(os.path.join(out, '.png'))

pdf = os.path.join(out, 'carousel.pdf')
w = pypdf.PdfWriter(clone_from=pdf)
for p in w.pages:
    top = float(p.mediabox.top)
    box = pypdf.generic.RectangleObject([0, top - 1012.5, 810, top])
    p.mediabox = box
    p.cropbox = box
w.write(pdf)
