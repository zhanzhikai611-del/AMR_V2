from pathlib import Path
from PIL import Image, ImageDraw

root = Path(r"C:\Users\Kai\Documents\ChatGPT\AMR\AMR_V2\.tmp\prd-word")
pages = sorted((root / "final-render").glob("page-*.png"), key=lambda p: int(p.stem.split("-")[-1]))
out = root / "contact-sheets"
out.mkdir(exist_ok=True)
for old in out.glob("sheet-*.png"):
    old.unlink()
for start in range(0, len(pages), 4):
    batch = pages[start:start + 4]
    opened = [Image.open(p).convert("RGB") for p in batch]
    width = max(im.width for im in opened)
    height = max(im.height for im in opened)
    sheet = Image.new("RGB", (width * 2 + 30, height * 2 + 50), "#CCD3D8")
    draw = ImageDraw.Draw(sheet)
    for idx, (path, im) in enumerate(zip(batch, opened)):
        x = (idx % 2) * (width + 30)
        y = (idx // 2) * (height + 25) + 25
        sheet.paste(im, (x, y))
        draw.text((x + 8, y - 20), path.stem, fill="#15202B")
    sheet.save(out / f"sheet-{start // 4 + 1:02d}.png")
print(f"sheets={(len(pages) + 3) // 4}")
