"""Rewrite the shared <head> links, header and footer on every page so they stay identical.

Run after adding or changing a page:  python3 scripts/sync-layout.py
Each page only needs a <title>, a <header class="site-header"></header> and a
<footer class="site-footer"></footer> placeholder; this script fills them in.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YEAR = "2026"
# Public address of the site, used for social link previews (Open Graph).
# Change this to "https://learnwithstanley.com/recalculator/" once the site moves there, then re-run.
SITE_URL = "https://learnwithstanley.com/recalculator/"

FONTS = ("https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700"
         "&family=Playfair+Display:wght@600;700&display=swap")
ICON = ("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E"
        "%3Crect width=%2732%27 height=%2732%27 rx=%274%27 fill=%27%230b2545%27/%3E%3Ctext x=%2716%27 y=%2720%27 "
        "font-family=%27Arial,sans-serif%27 font-size=%2710%27 font-weight=%27700%27 fill=%27white%27 "
        "text-anchor=%27middle%27 textLength=%2726%27 lengthAdjust=%27spacingAndGlyphs%27%3ESTAN%3C/text%3E%3C/svg%3E")


def head(pre, rel, title, desc):
    page_url = SITE_URL + ("" if rel == "index.html" else rel[: -len("index.html")])
    return f'''<!-- layout:head -->
  <meta name="theme-color" content="#0b2545">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LearnwithStanley Calculators">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{page_url}">
  <meta property="og:image" content="{SITE_URL}assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="{ICON}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{FONTS}" rel="stylesheet">
  <link rel="stylesheet" href="{pre}assets/css/style.css">
  <!-- /layout:head -->'''


def header(pre, is_home):
    current = ' aria-current="page"' if is_home else ''
    return f'''<header class="site-header">
    <div class="wrap">
      <a class="brand" href="{pre or './'}">LearnwithStanley Calculators</a>
      <nav class="nav" aria-label="Site">
        <a href="{pre or './'}"{current}>All tools</a>
      </nav>
    </div>
  </header>'''


def footer(pre):
    return f'''<footer class="site-footer">
    <div class="wrap">
      <p class="disclosure"><strong>Important:</strong> These calculators are for general information and education only. They do not take into account your personal objectives, financial situation or needs, and are not financial advice or a recommendation to buy or sell any investment product. Results are hypothetical illustrations based on the assumptions you enter and are not guaranteed. The value of investments can go down as well as up. Please speak with a licensed financial adviser before making any financial decision. <a href="{pre}disclosure/">Read the full disclosure</a>.</p>
      <div class="footer-bottom">
        <span>&copy; {YEAR} LearnwithStanley.com</span>
        <a href="https://learnwithstanley.com/">Visit LearnwithStanley.com</a>
      </div>
    </div>
  </footer>'''


def pages():
    yield "index.html"
    for name in sorted(os.listdir(ROOT)):
        p = os.path.join(name, "index.html")
        if os.path.isfile(os.path.join(ROOT, p)) and not name.startswith("."):
            yield p


for rel in pages():
    path = os.path.join(ROOT, rel)
    pre = "" if rel == "index.html" else "../"
    s = open(path, encoding="utf-8").read()
    # Drop any previous head links, then insert the shared block right after <title>.
    s = re.sub(r"\s*<!-- layout:head -->.*?<!-- /layout:head -->", "", s, flags=re.S)
    s = re.sub(r'\s*<link rel="(?:icon|preconnect|stylesheet)"[^>]*>', "", s)
    s = re.sub(r'\s*<link href="https://fonts.googleapis.com[^>]*>', "", s)
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    m = re.search(r'<meta name="description" content="([^"]*)"', s)
    desc = m.group(1) if m else ""
    s = re.sub(r'\s*<meta (?:name="theme-color"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>', "", s)
    block = head(pre, rel, title, desc)
    s = s.replace("</title>", "</title>\n  " + block, 1)
    # Calculator pages get the Share button.
    if 'class="card hero"' in s and "share.js" not in s:
        s = s.replace("</body>", f'  <script src="{pre}assets/js/share.js"></script>\n</body>', 1)
    s = re.sub(r'<header class="site-header">.*?</header>', lambda m: header(pre, rel == "index.html"), s, flags=re.S)
    s = re.sub(r'<footer class="site-footer">.*?</footer>', lambda m: footer(pre), s, flags=re.S)
    open(path, "w", encoding="utf-8").write(s)
    print("synced", rel)
