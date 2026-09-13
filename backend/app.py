"""
MystiPlay — Naagini OTT
Flask backend.

Responsibilities:
- Serve the frontend (index/season/player/search pages, css, js)
- Serve the episode dataset (data/episodes.json) as the single source of truth
- Serve static assets (posters, banners, thumbnails, logos)

No episode/video data is ever hard-coded here. Everything comes from
data/episodes.json so that the only file a developer needs to edit when
adding real videos is that JSON file.
"""

import os
from flask import Flask, jsonify, send_from_directory, abort

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DATA_DIR = os.path.join(BASE_DIR, "data")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

app = Flask(__name__, static_folder=None)


# ---------------------------------------------------------------------------
# Frontend pages
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<page>.html")
def page(page):
    allowed_pages = {"index", "season", "player", "search"}
    if page not in allowed_pages:
        abort(404)
    return send_from_directory(FRONTEND_DIR, f"{page}.html")


@app.route("/css/<path:filename>")
def css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "css"), filename)


@app.route("/js/<path:filename>")
def js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "js"), filename)


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

@app.route("/data/episodes.json")
def episodes_json():
    """Serve the single source of truth for all season/episode metadata."""
    return send_from_directory(DATA_DIR, "episodes.json")


# ---------------------------------------------------------------------------
# Assets (posters, banners, thumbnails, logos)
# ---------------------------------------------------------------------------

@app.route("/assets/<path:filename>")
def assets(filename):
    full_path = os.path.join(ASSETS_DIR, filename)
    if not os.path.isfile(full_path):
        # Let the frontend fall back to a CSS placeholder instead of a
        # broken image icon — a 404 here is expected until real assets
        # are dropped into the assets/ folders.
        abort(404)
    directory, name = os.path.split(full_path)
    return send_from_directory(directory, name)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "MystiPlay", "platform": "Naagini OTT"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
