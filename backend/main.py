from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import os
import glob
import yt_dlp
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Spotify Clone API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

yt = YTMusic()

from pydantic import BaseModel
from typing import List

class BulkSearchRequest(BaseModel):
    queries: List[str]

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
        suffix = "_lossless" if quality == "lossless" else ""
        existing_files = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}{suffix}.*"))
        if existing_files:
            return {"status": "success", "message": "Song already downloaded", "videoId": videoId}

        url = f"https://www.youtube.com/watch?v={videoId}"
        opts = ydl_opts_lossless if quality == "lossless" else ydl_opts_standard
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([url])
        except Exception as e:
            if quality == "lossless":
                # Fallback to standard download if transcoding/ffmpeg fails
                with yt_dlp.YoutubeDL(ydl_opts_standard) as ydl:
                    ydl.download([url])
                std_files = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}.*"))
                if std_files:
                    std_file = std_files[0]
                    ext = os.path.splitext(std_file)[1]
                    import shutil
                    fallback_path = os.path.join(DOWNLOADS_DIR, f"{videoId}_lossless{ext}")
                    shutil.copyfile(std_file, fallback_path)
                else:
                    raise e
            else:
                raise e

        # Confirm download
        downloaded = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}{suffix}.*"))
        if downloaded:
            return {"status": "success", "message": "Song downloaded successfully", "videoId": videoId}
        else:
            return {"status": "error", "message": "Download completed but file not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/stream/{videoId}")
def stream_song(videoId: str, quality: str = "standard"):
    try:
        suffix = "_lossless" if quality == "lossless" else ""
        existing_files = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}{suffix}.*"))
        if not existing_files:
            # Trigger download on-the-fly if not cached on server
            url = f"https://www.youtube.com/watch?v={videoId}"
            opts = ydl_opts_lossless if quality == "lossless" else ydl_opts_standard
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
            except Exception as e:
                if quality == "lossless":
                    # Fallback to standard
                    with yt_dlp.YoutubeDL(ydl_opts_standard) as ydl:
                        ydl.download([url])
                    std_files = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}.*"))
                    if std_files:
                        std_file = std_files[0]
                        ext = os.path.splitext(std_file)[1]
                        import shutil
                        fallback_path = os.path.join(DOWNLOADS_DIR, f"{videoId}_lossless{ext}")
                        shutil.copyfile(std_file, fallback_path)
                    else:
                        raise e
                else:
                    raise e
            existing_files = glob.glob(os.path.join(DOWNLOADS_DIR, f"{videoId}{suffix}.*"))

        if existing_files:
            file_path = existing_files[0]
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".flac":
                media_type = "audio/flac"
            elif ext == ".wav":
                media_type = "audio/wav"
            elif ext == ".mp3":
                media_type = "audio/mpeg"
            elif ext == ".webm":
                media_type = "audio/webm"
            else:
                media_type = "audio/mp4"
            return FileResponse(file_path, media_type=media_type, filename=os.path.basename(file_path))
        else:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Song not found or failed to download"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.get("/api/downloaded-songs")
def downloaded_songs():
    try:
        existing_files = glob.glob(os.path.join(DOWNLOADS_DIR, "*.*"))
        video_ids = [os.path.splitext(os.path.basename(f))[0] for f in existing_files]
        # Only valid 11 char youtube video ids
        video_ids = [vid for vid in video_ids if len(vid) == 11]
        return {"status": "success", "data": video_ids}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

