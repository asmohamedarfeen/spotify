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

class BulkSearchRequest(BaseModel):
    queries: List[str]

VALID_QUALITIES = {"standard", "lossless"}

@app.get("/api/search")
def search(q: str):
    try:
        results = yt.search(q, filter="songs")
        return {"status": "success", "data": results}
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

def jaccard_similarity(s1: str, s2: str) -> float:
    words1 = set(s1.lower().split())
    words2 = set(s2.lower().split())
    if not words1 and not words2:
        return 1.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

def get_vibe_score(s1: str, s2: str) -> float:
    KEYWORDS = ["acoustic", "remix", "lofi", "live", "instrumental", "slowed", "reverb", "cover", "speed up", "mix", "rap", "pop", "rock", "jazz", "lo-fi"]
    score = 0.0
    s1_lower = s1.lower()
    s2_lower = s2.lower()
    for kw in KEYWORDS:
        in_s1 = kw in s1_lower
        in_s2 = kw in s2_lower
        if in_s1 and in_s2:
            score += 0.2
        elif in_s1 != in_s2:
            score -= 0.05
    return score

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
        watch_playlist = yt.get_watch_playlist(videoId, limit=20)
        tracks = watch_playlist.get("tracks", [])
        
        results = []
        for i, track in enumerate(tracks):
            cand_video_id = track.get("videoId")
            # Skip the currently playing song itself
            if cand_video_id == videoId:
                continue
                
            cand_title = track.get("title", "Unknown Title")
            
            cand_artist = "Unknown Artist"
            if track.get("artists"):
                cand_artist = track["artists"][0].get("name", "Unknown Artist")
            elif track.get("artists_names"):
                cand_artist = track["artists_names"]
                
            cand_thumbnail = ""
            thumbnails = track.get("thumbnail") or track.get("thumbnails")
            if thumbnails:
                if isinstance(thumbnails, list) and len(thumbnails) > 0:
                    cand_thumbnail = thumbnails[-1].get("url", "")
                elif isinstance(thumbnails, dict):
                    cand_thumbnail = thumbnails.get("url", "")
                    
            # Calculate leaf similarity (Text overlap + vibe overlap + artist matchup + decay)
            decay = max(0.0, 1.0 - (i * 0.015))
            text_sim = jaccard_similarity(title, cand_title)
            
            artist_match = 0.0
            if artist and cand_artist:
                if artist.lower().strip() == cand_artist.lower().strip():
                    artist_match = 1.0
                elif artist.lower() in cand_artist.lower() or cand_artist.lower() in artist.lower():
                    artist_match = 0.5
                    
            vibe_sim = get_vibe_score(title, cand_title)
            
            # Combine scores
            raw_score = (0.3 * decay) + (0.3 * text_sim) + (0.2 * artist_match) + (0.2 * (1.0 + vibe_sim))
            # Map raw score to a nice percentage range [60%, 98%]
            match_percentage = int(min(98.0, max(60.0, raw_score * 100)))
            
            results.append({
                "videoId": cand_video_id,
                "title": cand_title,
                "artist": cand_artist,
                "thumbnail": cand_thumbnail,
                "album": track.get("album", {}).get("name", "Single") if track.get("album") else "Single",
                "matchPercentage": match_percentage
            })
            
        # Sort by match percentage in descending order
        results.sort(key=lambda x: x["matchPercentage"], reverse=True)
        return {"status": "success", "data": results[:15]}
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
