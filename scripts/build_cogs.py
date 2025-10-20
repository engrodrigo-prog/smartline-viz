# >>> SMARTLINE-EROSION: build_cogs
import sys, subprocess
from pathlib import Path


def to_cog(path):
    path = Path(path)
    out = path.with_suffix(".cog.tif")
    cmd = [
        "gdal_translate",
        "-of", "COG",
        "-co", "COMPRESS=LZW",
        "-co", "OVERVIEWS=AUTO",
        str(path),
        str(out)
    ]
    print("->", " ".join(cmd))
    subprocess.check_call(cmd)


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        to_cog(arg)
# <<< SMARTLINE-EROSION: build_cogs
