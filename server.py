#!/usr/bin/env python3
"""
Lokálny HTTP server pre DocProps Studio.
Automaticky spustí server na porte 8080 a otvorí predvolený internetový prehliadač.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Tiché logovanie
        pass

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("=" * 60)
        print("   DocProps Studio - Lokálny Web Server")
        print("=" * 60)
        print(f" Aplikácia beží na adrese: {url}")
        print(" Pre ukončenie stlačte Ctrl + C v tomto okne.")
        print("=" * 60)
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer ukončený.")

if __name__ == "__main__":
    main()
