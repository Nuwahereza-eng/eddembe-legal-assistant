"""Draws fake documents for rehearsing the Eddembe demo.

Every image is stamped SAMPLE and uses made-up names, places and phone numbers.
Usage: python3 samples/make_samples.py   (needs Pillow)
"""

import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).parent
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


SAMPLES = {
    "sample-eviction-notice.jpg": {
        "title": "NOTICE TO VACATE",
        "body": [
            "Date: 14th October 2026",
            "To: Ms. Nakato Example, Room 4, Example Rentals, Kawempe Zone 9, Kampala",
            "",
            "You are hereby informed that you must vacate the room you are renting "
            "within THREE (3) DAYS from the date of this notice.",
            "",
            "The landlord needs the room for other purposes. All your property must be "
            "removed by Friday. Any property left behind will be thrown out and the "
            "door padlocked.",
            "",
            "Your rent balance of UGX 350,000 must also be paid before you leave. "
            "The security deposit will not be refunded.",
            "",
            "Signed: ____________________",
            "Mr. Ssemanda Fictitious (Landlord)",
            "Tel: 0700 000 000",
        ],
    },
    "sample-termination-letter.jpg": {
        "title": "TERMINATION OF EMPLOYMENT",
        "body": [
            "Example Hardware Traders Ltd (FICTIONAL)",
            "Date: 2nd October 2026",
            "",
            "To: Mr. Okello Madeup, Shop Attendant",
            "",
            "This is to inform you that your services are no longer required "
            "with immediate effect.",
            "",
            "Your salary for August and September 2026 will be paid when the "
            "company finances improve. No other payment is due to you.",
            "",
            "You have worked with us since March 2021. Please hand over the shop "
            "keys today.",
            "",
            "Management",
        ],
    },
    "sample-land-sale-agreement.jpg": {
        "title": "LAND SALE AGREEMENT",
        "body": [
            "This agreement is made between Mr. Mukasa Imaginary (Seller) and "
            "Mrs. Auma Pretend (Buyer).",
            "",
            "The seller sells a piece of land at Example Village, Fake Parish, "
            "measuring about 50ft by 100ft.",
            "",
            "Price: UGX 15,000,000. Paid today: UGX 10,000,000. Balance: UGX 6,000,000 "
            "to be paid in two months.",
            "",
            "The seller's family agrees to the sale.",
            "",
            "Seller: ____________________     Buyer: ____________________",
            "",
            "Witnesses:",
            "1. ____________________",
        ],
    },
}


def draw_document(title: str, body: list[str]) -> Image.Image:
    width, height = 1240, 1754  # A4 at 150 dpi
    paper = Image.new("RGB", (width, height), (250, 247, 238))
    d = ImageDraw.Draw(paper)

    title_font = font("DejaVuSerif-Bold.ttf", 52)
    body_font = font("DejaVuSerif.ttf", 34)

    tw = d.textlength(title, font=title_font)
    d.text(((width - tw) / 2, 120), title, font=title_font, fill=(20, 20, 20))
    d.line((120, 200, width - 120, 200), fill=(40, 40, 40), width=3)

    y = 260
    for paragraph in body:
        if not paragraph:
            y += 26
            continue
        for line in textwrap.wrap(paragraph, width=52):
            d.text((120, y), line, font=body_font, fill=(25, 25, 30))
            y += 48

    # Diagonal SAMPLE watermark so the image can never pass as a real document.
    mark = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    md = ImageDraw.Draw(mark)
    mark_font = font("DejaVuSans-Bold.ttf", 230)
    mw = md.textlength("SAMPLE", font=mark_font)
    md.text(((width - mw) / 2, height / 2 - 140), "SAMPLE", font=mark_font, fill=(200, 30, 30, 70))
    mark = mark.rotate(30, resample=Image.BICUBIC)
    paper = Image.alpha_composite(paper.convert("RGBA"), mark).convert("RGB")

    footer = font("DejaVuSans-Bold.ttf", 26)
    ImageDraw.Draw(paper).text(
        (120, height - 110),
        "SAMPLE - NOT A REAL DOCUMENT - ALL NAMES ARE MADE UP",
        font=footer,
        fill=(170, 20, 20),
    )
    return paper


def as_photo(doc: Image.Image, seed: int) -> Image.Image:
    """Places the page on a table at a slight angle, like a phone photo."""
    rng = random.Random(seed)
    doc = doc.rotate(rng.uniform(-3, 3), resample=Image.BICUBIC, expand=True, fillcolor=(90, 70, 55))
    canvas = Image.new("RGB", (doc.width + 160, doc.height + 160), (90, 70, 55))
    shadow = Image.new("RGB", doc.size, (50, 38, 30))
    canvas.paste(shadow, (95, 95))
    canvas = canvas.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(doc, (80, 80))
    return canvas.resize((canvas.width * 2 // 3, canvas.height * 2 // 3), Image.LANCZOS)


if __name__ == "__main__":
    for i, (name, spec) in enumerate(SAMPLES.items()):
        as_photo(draw_document(spec["title"], spec["body"]), seed=i).save(OUT / name, quality=85)
        print("wrote", OUT / name)
