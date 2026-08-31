from pathlib import Path
import fitz

root = Path(r"C:\Users\Kai\Documents\ChatGPT\AMR\AMR_V2\.tmp\prd-word")
pdf = fitz.open(root / "AMR-PRD-render.pdf")
out = root / "final-render"
out.mkdir(parents=True, exist_ok=True)
for old in out.glob("page-*.png"):
    old.unlink()
matrix = fitz.Matrix(1.5, 1.5)
for index, page in enumerate(pdf):
    page.get_pixmap(matrix=matrix, alpha=False).save(out / f"page-{index + 1}.png")
print(f"pages={len(pdf)} out={out}")
