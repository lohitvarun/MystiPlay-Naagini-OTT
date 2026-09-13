# MystiPlay — Naagini OTT

A cinematic, red-and-black OTT streaming web app for the **Naagini 1, 2, 3, 4, and 7** seasons (419 episodes total). Built with Flask, vanilla HTML/CSS/JS, and a single JSON file as the source of truth for all episode data.

## Run it

```bash
pip install flask
cd backend
python3 app.py
```

Then open **http://localhost:5000**.

## Add your real videos

Open `data/episodes.json` and replace the `video_url` field for each episode:

```json
"video_url": "https://example.com/demo/naagini3-ep87.mp4"
```

becomes:

```json
"video_url": "https://your-cdn.com/real-video.mp4"
```

**Nothing else needs to change** — no HTML, no JavaScript. The player reads `video_url` straight from this file.

## Add your real images

Drop images into:

- `assets/banners/hero.jpg` — homepage hero
- `assets/banners/naagini{N}-banner.jpg` — season cover banners
- `assets/posters/naagini{N}.jpg` — season posters
- `assets/thumbnails/naagini{N}-ep{E}.jpg` — episode thumbnails

Until you do, every image area shows a stylish "MYSTIPLAY — CINEMATIC ART" placeholder instead of a broken-image icon.

## Project structure

```
naagini-ott/
├── backend/app.py          Flask server (serves frontend, JSON, assets)
├── frontend/
│   ├── index.html          Homepage (hero, continue watching, latest, popular, shows, my list)
│   ├── season.html         Cinematic season cover + episode grid (Load More pagination)
│   ├── player.html         HTML5 video player (custom controls, skip intro, auto-next)
│   ├── search.html         Live search across seasons/episodes/cast
│   ├── css/style.css       Red + black cinematic theme
│   └── js/
│       ├── app.js          Shared: data loading, localStorage, nav, homepage rendering
│       ├── seasons.js      Season cover page + episode grid + load more
│       ├── player.js       Video playback, resume, next/prev, skip intro (INTRO_SKIP_SECONDS)
│       └── search.js       Search filtering + rendering
├── data/episodes.json      Single source of truth — 419 episodes across 5 seasons
└── assets/                 logos/ posters/ banners/ thumbnails/ (empty, ready for your images)
```

## LocalStorage keys

- `mystiplay_my_list` — saved episodes
- `mystiplay_continue_watching` — playback progress per episode
- `mystiplay_profile` — profile name

## Content check

The app validates episode counts on every load (see browser console):

```
Naagini 1 = 62
Naagini 2 = 72
Naagini 3 = 205
Naagini 4 = 30
Naagini 7 = 50
Total = 419
```

Naagini 5, 6, and 8 are intentionally absent from every file in this project.
