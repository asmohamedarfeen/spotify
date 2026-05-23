# Spotify Clone (Responsive Desktop & Mobile)

A fully responsive, local Spotify-style music web application built with a FastAPI backend and a Vite + React frontend. This project faithfully recreates the Spotify experience across devices.

## 📱 Mobile Experience
- **Bottom Navigation**: Spotify-style bottom tab bar for easy access to Home, Search, and Library on small screens.
- **Mini-Player**: A persistent, compact audio bar above the navigation tabs on mobile.
- **Full-Screen Now Playing**: A rich, swipeable full-screen overlay for mobile devices featuring a draggable seek bar, playback controls, and slide-up lyrics.
- **Touch-Optimized UI**: Larger tap targets, horizontal scrolling strips for cards, and refined responsive grids.

## 💻 Desktop Experience
- **Classic Spotify Desktop Layout**: Left navigation and library sidebar, central Home/Search/Playlist views, and a dynamic right panel for Now Playing or Queue.
- **Persistent Bottom Player**: Comprehensive desktop player bar with volume, quality, device, and playback controls.
- **Hover Effects & Transitions**: Polished CSS animations, card lift effects, and desktop-specific interactions.

## 🎵 Core Features
- YouTube Music search, home charts, bulk playlist creation, autoplay recommendations, and queue management.
- Standard YouTube playback via an embedded player, with seamless fallback to backend audio streaming for offline or lossless-mode playback.
- Offline song caching in IndexedDB with local download state management.
- Robust state management including Liked songs, recently played tracks, playlist storage, shuffle, repeat, autoplay, and dynamic lyrics.
- **Honest HiFi Status**: The frontend accurately reflects lossless quality only when the backend serves a true FLAC file.

## 📁 Project Structure

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
    index.css
```

## ⚙️ Requirements

- Python 3.10+
- Node.js 20+
- FFmpeg available on PATH (required for FLAC extraction)

## 🚀 Getting Started

### 1. Run the Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows. On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py
```

The backend server will run at `http://localhost:8000`.

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite starts the development server at `http://localhost:5173` (or the next available port). Check the console output for the exact URL. You can use your browser's Developer Tools (Device Mode) to test the mobile responsive views.

## ✅ Checks & Linting

```bash
# Backend checks
cd backend
python -m compileall .

# Frontend checks
cd ../frontend
npm run lint
npm run build
```

## ℹ️ Notes

This is an educational, local clone-style project, not an official Spotify client. Features like Spotify Connect, official Spotify catalog playback, and official user account management are simulated with local, functional equivalents.
