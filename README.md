# 🎧 Spotify Desktop Clone (Premium Audio System)

A premium, full-featured **Spotify Desktop Client Clone** engineered with a sleek modern design system and advanced audio delivery mechanisms. 

Built using a **FastAPI backend** utilizing `yt-dlp` and `ffmpeg` postprocessors, combined with a **Vite + React frontend** supporting offline caching and standard-to-lossless audio streaming paths.
---
---

## ✨ Features

### 🎨 Pixel-Perfect Spotify Desktop Theme
* **Pure Dark Mode**: Crafted with official canvas backdrops (`#000000`), container frames (`#121212`), and Spotify Green (`#1db954`).
* **Circular Typography**: Styled with the beautiful Google Inter font family.
* **Interactive Controls**: Hover-reactive progress and volume seek bars, and a unified split-panel frame layout.

### 🟢 Lossless Audio Quality (HiFi)
* **Direct Server-Side FLAC Transcoding**: Integrates `FFmpegExtractAudio` postprocessors in `yt-dlp` to transcode streams to pristine `.flac` formats on-the-fly.
* **Online Lossless Streaming Bypass**: Bypasses the YouTube iframe player, feeding direct high-bitrate FLAC streams directly into standard browser HTML5 `<audio>` players.
* **Pulsing HiFi badge**: Shows an active glowing indicator badge when streaming in lossless quality.
* **Glassmorphic Quality Popover**: Beautiful controls settings menu next to the volume bar to easily toggle streaming and download quality modes.

### 📂 Listen Offline (Premium Capability)
* **On-Device IndexedDB Cache**: Caches audio Blobs directly in browser storage (`spotify-clone-offline`), permitting large binary files to be stored and played locally.
* **Dual-Player Synchronization**: Seamlessly swaps control timeline seek and volume states between YouTube player and standard `<audio>` player tag.
* **Simulated Offline Mode**: Quick-switch offline toggle that dims non-downloaded tracks and grey-outs cursor actions to demonstrate offline fidelity.

---

## 🛠 Tech Stack

* **Frontend**: React, Vite, Tailwind/Vanilla CSS, Lucide Icons, IndexedDB
* **Backend**: FastAPI (Python), `yt-dlp`, `ffmpeg`, `YTMusicAPI`

---

## 🚀 Getting Started

### 1. Run the FastAPI Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
*Backend runs on `http://localhost:8000`*

### 2. Run the Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5174`*

---

## 💎 Custom Verification Results (Lossless Transcoding)
The transcoding backend is verified to compile and deliver high-fidelity FLAC audio containers successfully:
```text
=== VERIFYING LOSSLESS DOWNLOAD ENDPOINT ===
Lossless Download Response: {
  "status": "success",
  "message": "Song downloaded successfully",
  "videoId": "kJQP7kiw5Fk"
}

=== VERIFYING DOWNLOADS DIRECTORY CONTENT ===
Downloaded files on server disk:
 - kJQP7kiw5Fk_lossless.flac

=== VERIFYING STREAMING ROUTE AND HEADERS ===
Content-Type Header: audio/flac
Content-Length Header: 60551450
Status Code: 200
```
