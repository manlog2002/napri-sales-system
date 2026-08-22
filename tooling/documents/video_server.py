from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import os


ROOT = Path(r"C:\Users\DELL\Documents\Codex\2026-08-19\referenced-chatgpt-conversation-this-is-an")
WORK = ROOT / "work" / "napri-sales-kit"
OUT = ROOT / "outputs" / "حزمة-نبري-البيعية"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WORK), **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/upload":
            self.send_error(404)
            return
        name = Path(parse_qs(parsed.query).get("name", ["video.webm"])[0]).name
        if not name.lower().endswith(".webm"):
            self.send_error(400, "Only .webm is accepted")
            return
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length)
        OUT.mkdir(parents=True, exist_ok=True)
        target = OUT / name
        target.write_bytes(data)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write((f'{{"saved":"{name}","bytes":{len(data)}}}').encode("utf-8"))


if __name__ == "__main__":
    os.chdir(WORK)
    ThreadingHTTPServer(("127.0.0.1", 8128), Handler).serve_forever()
