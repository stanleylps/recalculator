"""Serve this folder at http://localhost:8080/recalculator/ to mirror the live URL."""
import http.server, os, socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
PREFIX = "/recalculator"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        if self.path in ("/", PREFIX):
            self.send_response(302); self.send_header("Location", PREFIX + "/"); self.end_headers(); return
        if not self.path.startswith(PREFIX + "/"):
            self.send_error(404); return
        self.path = self.path[len(PREFIX):]
        super().do_GET()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8080), Handler) as httpd:
    print("Serving at http://localhost:8080/recalculator/")
    httpd.serve_forever()
