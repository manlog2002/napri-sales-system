from pathlib import Path
import sys
from zipfile import ZipFile

from pypdf import PdfReader


OUTPUT_DIR = Path(
    r"C:\Users\DELL\Documents\Codex\2026-08-19\referenced-chatgpt-conversation-this-is-an"
) / "outputs" / "حزمة-نبري-البيعية"


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    failures: list[str] = []

    for path in sorted(OUTPUT_DIR.glob("*.docx")):
        try:
            with ZipFile(path) as archive:
                required = {"[Content_Types].xml", "word/document.xml"}
                missing = required.difference(archive.namelist())
                if missing:
                    failures.append(f"{path.name}: missing {sorted(missing)}")
                else:
                    print(f"DOCX OK  {path.name}")
        except Exception as exc:
            failures.append(f"{path.name}: {exc}")

    for path in sorted(OUTPUT_DIR.glob("*.pdf")):
        try:
            reader = PdfReader(path)
            text_size = sum(len(page.extract_text() or "") for page in reader.pages)
            if not reader.pages or text_size < 100:
                failures.append(
                    f"{path.name}: pages={len(reader.pages)}, text={text_size}"
                )
            else:
                print(
                    f"PDF  OK  {path.name} | pages={len(reader.pages)} | text={text_size}"
                )
        except Exception as exc:
            failures.append(f"{path.name}: {exc}")

    for path in sorted(OUTPUT_DIR.glob("*.webm")):
        data = path.read_bytes()[:4]
        if data != b"\x1aE\xdf\xa3" or path.stat().st_size < 100_000:
            failures.append(f"{path.name}: invalid WebM signature/size")
        else:
            print(f"WEBM OK  {path.name} | bytes={path.stat().st_size}")

    if failures:
        raise SystemExit("\n".join(failures))


if __name__ == "__main__":
    main()
