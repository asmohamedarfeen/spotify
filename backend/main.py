from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import os
import glob
import yt_dlp
from fastapi.responses import FileResponse, JSONResponse
import requests

app = FastAPI(title="Spotify Clone API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

yt = YTMusic()

from pydantic import BaseModel
from typing import List
import re
from html import unescape
from recommendation_logic import normalize_recommendation

class BulkSearchRequest(BaseModel):
    queries: List[str]

class SpotifyPlaylistUrlRequest(BaseModel):
    url: str

VALID_QUALITIES = {"standard", "lossless"}

@app.get("/api/search")
def search(q: str):
    try:
        query = (q or "").strip()
        if not query:
            return {"status": "success", "data": []}

        results = yt.search(query, filter="songs", limit=20, ignore_spelling=True) or []
        if not results:
            fresh_yt = YTMusic()
            results = fresh_yt.search(query, filter="songs", limit=20, ignore_spelling=True) or []
        if not results:
            mixed_results = YTMusic().search(query, limit=25, ignore_spelling=True) or []
            results = [item for item in mixed_results if item.get("videoId") and item.get("resultType") in {"song", "video"}]
        return {"status": "success", "data": results[:20]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/bulk-search")
def bulk_search(req: BulkSearchRequest):
    try:
        results = []
        for q in req.queries:
            q = q.strip()
            if not q: continue
            res = yt.search(q, filter="songs")
            if res and len(res) > 0:
                results.append(res[0])
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/home")
def home():
    try:
        # Get charts or some default playlist for the home page
        charts = yt.get_charts()
        return {"status": "success", "data": charts}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def collect_search_recommendations(title: str, artist: str):
    queries = []
    if artist:
        queries.append(f"{artist} songs")
        queries.append(f"{artist} similar artists")
    if title and artist:
        queries.append(f"{title} {artist}")
    elif title:
        queries.append(title)

    collected = []
    for query in queries[:3]:
        try:
            collected.extend(yt.search(query, filter="songs", limit=10) or [])
        except Exception:
            continue
    return collected

def normalize_quality(quality: str) -> str:
    quality = (quality or "standard").lower().strip()
    return quality if quality in VALID_QUALITIES else "standard"

def find_downloaded_files(video_id: str, quality: str):
    suffix = "_lossless" if normalize_quality(quality) == "lossless" else ""
    return glob.glob(os.path.join(DOWNLOADS_DIR, f"{video_id}{suffix}.*"))

def media_type_for_path(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".flac":
        return "audio/flac"
    if ext == ".wav":
        return "audio/wav"
    if ext == ".mp3":
        return "audio/mpeg"
    if ext == ".webm":
        return "audio/webm"
    return "audio/mp4"

def file_quality(file_path: str) -> str:
    return "lossless" if os.path.splitext(file_path)[1].lower() == ".flac" else "standard"

def download_with_fallback(video_id: str, quality: str):
    quality = normalize_quality(quality)
    url = f"https://www.youtube.com/watch?v={video_id}"
    opts = ydl_opts_lossless if quality == "lossless" else ydl_opts_standard
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:
        if quality != "lossless":
            raise exc
        with yt_dlp.YoutubeDL(ydl_opts_standard) as ydl:
            ydl.download([url])
        return "standard"
    files = find_downloaded_files(video_id, quality)
    return file_quality(files[0]) if files else "standard"

@app.get("/api/recommendations")
def recommendations(videoId: str, title: str = "", artist: str = ""):
    try:
        candidates = []
        try:
            watch_playlist = yt.get_watch_playlist(videoId, limit=30)
            for index, track in enumerate(watch_playlist.get("tracks", [])):
                candidates.append((track, "watch-playlist", index))
        except Exception:
            pass

        fallback_start = len(candidates)
        for index, track in enumerate(collect_search_recommendations(title, artist)):
            candidates.append((track, "search-fallback", fallback_start + index))

        results = []
        seen = {videoId}
        for track, source, index in candidates:
            normalized = normalize_recommendation(track, source, index, title, artist)
            if not normalized or normalized["videoId"] in seen:
                continue
            seen.add(normalized["videoId"])
            results.append(normalized)

        results.sort(key=lambda x: x["matchPercentage"], reverse=True)
        return {"status": "success", "data": results[:18]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Setup local downloads folder
DOWNLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

ydl_opts_standard = {
    'format': 'bestaudio/best',
    'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s.%(ext)s'),
    'quiet': True,
    'no_warnings': True,
}

ydl_opts_lossless = {
    'format': 'bestaudio/best',
    'outtmpl': os.path.join(DOWNLOADS_DIR, '%(id)s_lossless.%(ext)s'),
    'quiet': True,
    'no_warnings': True,
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'flac',
        'preferredquality': '0',
    }],
}

@app.post("/api/download/{videoId}")
def download_song(videoId: str, quality: str = "standard"):
    try:
        quality = normalize_quality(quality)
        existing_files = find_downloaded_files(videoId, quality)
        if existing_files:
            actual = file_quality(existing_files[0])
            return {"status": "success", "message": "Song already downloaded", "videoId": videoId, "qualityRequested": quality, "qualityActual": actual}

        actual_quality = download_with_fallback(videoId, quality)

        # Confirm download
        downloaded = find_downloaded_files(videoId, quality)
        if not downloaded and quality == "lossless":
            downloaded = find_downloaded_files(videoId, "standard")
        if downloaded:
            actual_quality = file_quality(downloaded[0]) if downloaded else actual_quality
            return {"status": "success", "message": "Song downloaded successfully", "videoId": videoId, "qualityRequested": quality, "qualityActual": actual_quality}
        else:
            return {"status": "error", "message": "Download completed but file not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/stream/{videoId}")
def stream_song(videoId: str, quality: str = "standard"):
    try:
        quality = normalize_quality(quality)
        existing_files = find_downloaded_files(videoId, quality)
        if not existing_files:
            # Trigger download on-the-fly if not cached on server
            download_with_fallback(videoId, quality)
            existing_files = find_downloaded_files(videoId, quality)
            if not existing_files and quality == "lossless":
                existing_files = find_downloaded_files(videoId, "standard")

        if existing_files:
            file_path = existing_files[0]
            media_type = media_type_for_path(file_path)
            return FileResponse(file_path, media_type=media_type, filename=os.path.basename(file_path))
        else:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Song not found or failed to download"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/api/downloaded-songs")
def downloaded_songs():
    try:
        existing_files = glob.glob(os.path.join(DOWNLOADS_DIR, "*.*"))
        songs = {}
        for file_path in existing_files:
            stem = os.path.splitext(os.path.basename(file_path))[0]
            is_lossless_name = stem.endswith("_lossless")
            video_id = stem.replace("_lossless", "")
            if len(video_id) != 11:
                continue
            quality = file_quality(file_path)
            existing = songs.get(video_id)
            if not existing or quality == "lossless" or is_lossless_name:
                songs[video_id] = {"videoId": video_id, "quality": quality, "fileName": os.path.basename(file_path)}
        return {"status": "success", "data": list(songs.values())}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def strip_html(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value or "")
    return unescape(value).replace("\xa0", " ").strip()

def extract_spotify_playlist_id(url: str) -> str:
    match = re.search(r"open\.spotify\.com/(?:embed/)?playlist/([A-Za-z0-9]+)", url or "")
    if not match:
        raise ValueError("Enter a valid public Spotify playlist URL")
    return match.group(1)

def parse_spotify_embed_playlist(html: str):
    title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    if not title_match:
        title_match = re.search(r'alt="([^"]+) cover"', html)
    playlist_name = strip_html(title_match.group(1)) if title_match else "Imported Spotify Playlist"
    rows = re.findall(r'<li[^>]+data-testid="tracklist-row-\d+"[^>]*>(.*?)</li>', html, flags=re.S)
    tracks = []
    for row in rows:
        title_match = re.search(r'<h3[^>]*>(.*?)</h3>', row, flags=re.S)
        artist_match = re.search(r'<h4[^>]*>(.*?)</h4>', row, flags=re.S)
        duration_match = re.search(r'data-testid="duration-cell"[^>]*>(.*?)</div>', row, flags=re.S)
        title = strip_html(title_match.group(1)) if title_match else ""
        artist = strip_html(artist_match.group(1)) if artist_match else ""
        duration = strip_html(duration_match.group(1)) if duration_match else ""
        if title and artist:
            tracks.append({
                "title": title,
                "artist": artist,
                "duration": duration,
                "query": f"{title} - {artist}",
            })
    return playlist_name, tracks

@app.post("/api/extract-spotify-playlist")
def extract_spotify_playlist(req: SpotifyPlaylistUrlRequest):
    try:
        playlist_id = extract_spotify_playlist_id(req.url)
        embed_url = f"https://open.spotify.com/embed/playlist/{playlist_id}"
        response = requests.get(
            embed_url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=20,
        )
        response.raise_for_status()
        response.encoding = "utf-8"
        playlist_name, tracks = parse_spotify_embed_playlist(response.text)
        if not tracks:
            return JSONResponse(status_code=422, content={
                "status": "error",
                "message": "Could not read tracks from this public Spotify playlist. Try copying the playlist rows and pasting them instead.",
            })
        return {
            "status": "success",
            "data": {
                "playlistId": playlist_id,
                "playlistName": playlist_name,
                "tracks": tracks,
                "queries": [track["query"] for track in tracks],
                "count": len(tracks),
                "limited": len(tracks) >= 100,
                "source": "spotify-public-embed",
            },
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(e)})

@app.get("/api/lyrics")
def lyrics(title: str = Query(""), artist: str = Query("")):
    try:
        if not title.strip():
            return JSONResponse(status_code=400, content={"status": "error", "message": "title is required"})
        response = requests.get(
            "https://lrclib.net/api/search",
            params={"track_name": title, "artist_name": artist},
            timeout=8,
        )
        response.raise_for_status()
        matches = response.json()
        if not matches:
            return {"status": "success", "data": {"available": False, "lines": [], "plainLyrics": "", "syncedLyrics": ""}}
        match = matches[0]
        plain = match.get("plainLyrics") or ""
        synced = match.get("syncedLyrics") or ""
        lines = [line for line in plain.splitlines() if line.strip()]
        return {
            "status": "success",
            "data": {
                "available": bool(plain or synced),
                "trackName": match.get("trackName"),
                "artistName": match.get("artistName"),
                "albumName": match.get("albumName"),
                "duration": match.get("duration"),
                "plainLyrics": plain,
                "syncedLyrics": synced,
                "lines": lines,
            },
        }
    except Exception as e:
        return JSONResponse(status_code=502, content={"status": "error", "message": f"Lyrics unavailable: {e}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
