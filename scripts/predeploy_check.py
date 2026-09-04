#!/usr/bin/env python3
from pathlib import Path
from html.parser import HTMLParser
import json, re, shutil, struct, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
errors = []
notes = []

def fail(msg): errors.append(msg)
def ok(msg): notes.append(msg)

required = [
    SITE / "index.html",
    SITE / "manifest.webmanifest",
    SITE / "sw.js",
    SITE / "icon-192.png",
    SITE / "icon-512.png",
    SITE / ".nojekyll",
    ROOT / ".github/workflows/verify.yml",
    ROOT / ".github/workflows/deploy-pages.yml",
]
for path in required:
    if not path.exists(): fail(f"missing: {path.relative_to(ROOT)}")
if not errors: ok("required files present")

# Manifest validation.
try:
    manifest = json.loads((SITE / "manifest.webmanifest").read_text(encoding="utf-8"))
    for key in ("name", "short_name", "start_url", "scope", "display", "icons"):
        if key not in manifest: fail(f"manifest missing key: {key}")
    if str(manifest.get("start_url", "")).startswith("/"):
        fail("manifest start_url must be relative for GitHub Pages project sites")
    if str(manifest.get("scope", "")).startswith("/"):
        fail("manifest scope must be relative for GitHub Pages project sites")
    ok("manifest JSON valid")
except Exception as e:
    fail(f"manifest invalid: {e}")

# PNG dimension check with only stdlib.
def png_size(path: Path):
    data = path.read_bytes()[:24]
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not PNG")
    return struct.unpack(">II", data[16:24])

for name, expected in (("icon-192.png", (192,192)), ("icon-512.png", (512,512))):
    try:
        actual = png_size(SITE/name)
        if actual != expected: fail(f"{name} is {actual}, expected {expected}")
        else: ok(f"{name} size OK")
    except Exception as e:
        fail(f"{name}: {e}")

# HTML asset checks and project-site-safe relative URLs.
class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.assets=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        for key in ("src","href"):
            v=d.get(key)
            if v and not (v.startswith("http:") or v.startswith("https:") or v.startswith("data:") or v.startswith("#")):
                self.assets.append((tag,key,v))

html = (SITE/"index.html").read_text(encoding="utf-8")
p=AssetParser(); p.feed(html)
for tag,key,v in p.assets:
    if v.startswith("/"):
        fail(f"absolute asset path not GitHub-project-site safe: {v}")
    clean=v.split("?",1)[0].split("#",1)[0]
    target=(SITE/clean).resolve()
    try: target.relative_to(SITE.resolve())
    except ValueError:
        fail(f"asset escapes site directory: {v}"); continue
    if not target.exists(): fail(f"HTML asset missing: {v}")
ok("HTML relative asset references checked")

# Inline JavaScript syntax.
scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.S|re.I)
inline = "\n".join(s for s in scripts if s.strip())
if inline:
    node = shutil.which("node")
    if not node:
        fail("node is unavailable; cannot syntax-check inline JavaScript")
    else:
        tmp = ROOT/".predeploy-inline.js"
        tmp.write_text(inline, encoding="utf-8")
        try:
            r=subprocess.run([node,"--check",str(tmp)],text=True,capture_output=True)
            if r.returncode: fail("JavaScript syntax error: "+(r.stderr or r.stdout).strip())
            else: ok("inline JavaScript syntax OK")
        finally:
            tmp.unlink(missing_ok=True)

# Service worker should cache only files that exist.
sw=(SITE/"sw.js").read_text(encoding="utf-8")
for asset in re.findall(r'"(\./[^"?]+)"', sw):
    clean=asset[2:]
    if clean == "": continue
    if clean == "index.html" or clean.endswith((".webmanifest",".png")):
        if not (SITE/clean).exists(): fail(f"service worker asset missing: {asset}")
ok("service worker asset list checked")

# Deployment workflow must remain manual-only at this checkpoint.
deploy=(ROOT/".github/workflows/deploy-pages.yml").read_text(encoding="utf-8")
if "workflow_dispatch:" not in deploy:
    fail("deploy workflow is not manually triggerable")
# Exclude comments before checking for push trigger.
active="\n".join(line for line in deploy.splitlines() if not line.lstrip().startswith("#"))
if re.search(r"(?m)^\s*push\s*:", active):
    fail("deploy workflow contains push trigger; pre-deploy state must be manual-only")
else:
    ok("deploy workflow is manual-only")

# Basic feature markers to catch accidental wrong-file deployment.
markers = ["今週→翌週コピー","希望休","有給","必要人数","CSV","元に戻す","serviceWorker"]
for marker in markers:
    if marker not in html: fail(f"expected app feature marker missing: {marker}")
if all(m in html for m in markers): ok("expected v2 feature markers present")

print("PRE-DEPLOY CHECK")
for n in notes: print(f"  PASS  {n}")
for e in errors: print(f"  FAIL  {e}")
if errors:
    print(f"\nRESULT: FAIL ({len(errors)} error(s))")
    sys.exit(1)
print(f"\nRESULT: PASS ({len(notes)} checks)")
