# Spotify Desktop Clone

A local Spotify-style desktop music app built with a FastAPI backend and a Vite + React frontend. The UI follows Spotify's desktop structure: left navigation and library, central Home/Search/Playlist pages, right Now Playing or Queue panel, and a persistent bottom player.

## Features

- Spotify-like desktop shell with Home, Search, Your Library, Liked Songs, Now Playing, Queue, and bottom playback controls.
- YouTube Music search, home charts, bulk playlist creation, autoplay recommendations, and queue management.
- Standard YouTube playback through the embedded player, plus backend audio streaming for downloaded or lossless-mode playback.
- Offline song caching in IndexedDB with local download state.
- Liked songs, recently played songs, playlist storage, shuffle, repeat, autoplay, lyrics panel, and local device/audio-quality popovers.
- Honest HiFi status: the frontend shows lossless only when the backend actually serves FLAC.

## Project Structure

```text
spotify/
  backend/
    main.py
    requirements.txt
    downloads/
  frontend/
    src/
      api/
      components/
      context/
      utils/
    package.json
```

## Requirements

- Python 3.10+
- Node.js 20+
- FFmpeg available on PATH for FLAC extraction

## Run Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs at `http://localhost:8000`.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite usually starts at `http://localhost:5173`. If that port is busy, use the URL printed by Vite.

## Checks

```bash
cd backend
python -m compileall .

cd ..\frontend
npm run lint
npm run build
```

## Notes

This is a local clone-style project, not an official Spotify client. Spotify Connect, official Spotify catalog playback, and official account features are represented with local equivalents where possible.
