"""Makes a PDF and a Word (.docx) version of a fake employment contract for testing uploads.

Every file is marked SAMPLE and uses made-up names.
Usage: python3 samples/make_text_samples.py   (needs google-chrome for the PDF)
"""

import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).parent

TITLE = "EMPLOYMENT CONTRACT (SAMPLE - NOT A REAL DOCUMENT)"
PARAGRAPHS = [
    "This contract is between Example Security Services Ltd (FICTIONAL) and Mr. Wasswa Madeup.",
    "Position: Night guard. Start date: 1st November 2026.",
    "Salary: UGX 250,000 per month, paid when the client pays the company.",
    "Hours: 6pm to 8am, seven days a week. No overtime will be paid.",
    "The company may end this contract at any time without notice or payment.",
    "The employee will not get any leave in the first two years.",
    "Uniform costs of UGX 120,000 will be deducted from the first salary.",
    "Signed by the employee: ____________________",
    "SAMPLE - NOT A REAL DOCUMENT - ALL NAMES ARE MADE UP",
]


def make_pdf(path: Path) -> None:
    body = "".join(f"<p>{escape(p)}</p>" for p in PARAGRAPHS)
    html = f"<html><body style='font-family:serif;font-size:14pt;margin:2cm'><h1>{escape(TITLE)}</h1>{body}</body></html>"
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html)
    subprocess.run(
        ["google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
         f"--print-to-pdf={path}", f"file://{f.name}"],
        check=True, capture_output=True,
    )


def make_docx(path: Path) -> None:
    def para(text: str, bold: bool = False) -> str:
        run_props = "<w:rPr><w:b/></w:rPr>" if bold else ""
        return f"<w:p><w:r>{run_props}<w:t xml:space='preserve'>{escape(text)}</w:t></w:r></w:p>"

    document = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        "<w:document xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'><w:body>"
        + para(TITLE, bold=True)
        + "".join(para(p) for p in PARAGRAPHS)
        + "</w:body></w:document>"
    )
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "[Content_Types].xml",
            "<?xml version='1.0' encoding='UTF-8'?>"
            "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>"
            "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>"
            "<Default Extension='xml' ContentType='application/xml'/>"
            "<Override PartName='/word/document.xml' "
            "ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'/>"
            "</Types>",
        )
        z.writestr(
            "_rels/.rels",
            "<?xml version='1.0' encoding='UTF-8'?>"
            "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
            "<Relationship Id='rId1' "
            "Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' "
            "Target='word/document.xml'/></Relationships>",
        )
        z.writestr("word/document.xml", document)


if __name__ == "__main__":
    make_pdf(OUT / "sample-employment-contract.pdf")
    make_docx(OUT / "sample-employment-contract.docx")
    print("wrote sample-employment-contract.pdf and .docx")
