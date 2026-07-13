# Cinephile Cards

A web app for creating trading cards for **Cinephile**, the movie guessing game.
Each card shows an actor's name, a movie-specific photo of that actor, and the
movie the photo is from.

## Features

- **46 preloaded cards** ready to go — click any card's photo area to add the
  actor's movie-specific image.
- **Create new cards** with the *+ New Card* button (actor, movie, photo).
- **Edit and delete** any card via the hover actions on each card.
- **Export**:
  - single card as **PNG** (750×1050 px, 300 DPI at real card size) or **PDF**
    (true poker-card size, 63.5 × 88.9 mm);
  - the whole deck as a **print-ready A4 PDF** (9 cards per page) or a
    **zip of PNGs**.
- All data (including uploaded photos) persists locally in the browser via
  IndexedDB — no server needed.

## Stack

Plain HTML/CSS/JS static site, no build step. Export powered by vendored
copies of html2canvas, jsPDF and JSZip; fonts (Cinzel, Playfair Display) are
self-hosted. Deployable anywhere static files can be served (`netlify.toml`
included).

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
