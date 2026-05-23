import re


def tokenize(value: str):
    return set(re.findall(r"[a-z0-9]+", (value or "").lower()))


def jaccard_similarity(s1: str, s2: str) -> float:
    words1 = tokenize(s1)
    words2 = tokenize(s2)
    if not words1 and not words2:
        return 1.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)


def get_vibe_score(s1: str, s2: str) -> float:
    keywords = ["acoustic", "remix", "lofi", "live", "instrumental", "slowed", "reverb", "cover", "speed up", "mix", "rap", "pop", "rock", "jazz", "lo-fi"]
    score = 0.0
    s1_lower = s1.lower()
    s2_lower = s2.lower()
    for keyword in keywords:
        in_s1 = keyword in s1_lower
        in_s2 = keyword in s2_lower
        if in_s1 and in_s2:
            score += 0.2
        elif in_s1 != in_s2:
            score -= 0.05
    return score


def best_thumbnail(track: dict) -> str:
    thumbnails = track.get("thumbnail") or track.get("thumbnails")
    if isinstance(thumbnails, list) and thumbnails:
        return thumbnails[-1].get("url", "") or thumbnails[0].get("url", "")
    if isinstance(thumbnails, dict):
        return thumbnails.get("url", "")
    if isinstance(thumbnails, str):
        return thumbnails
    return ""


def primary_artist(track: dict) -> str:
    artists = track.get("artists")
    if isinstance(artists, list) and artists:
        return ", ".join([artist.get("name", str(artist)) if isinstance(artist, dict) else str(artist) for artist in artists if artist])
    if track.get("artists_names"):
        return track.get("artists_names")
    if track.get("artist"):
        return track.get("artist")
    return "Unknown Artist"


def normalize_recommendation(track: dict, source: str, position: int, title: str, artist: str):
    video_id = track.get("videoId") or track.get("id")
    if not video_id:
        return None

    cand_title = track.get("title") or track.get("name") or "Unknown Title"
    cand_artist = primary_artist(track)
    decay = max(0.0, 1.0 - (position * 0.012))
    text_sim = jaccard_similarity(title, cand_title)
    artist_match = 0.0
    if artist and cand_artist:
        artist_lower = artist.lower().strip()
        cand_artist_lower = cand_artist.lower().strip()
        if artist_lower == cand_artist_lower:
            artist_match = 1.0
        elif artist_lower in cand_artist_lower or cand_artist_lower in artist_lower:
            artist_match = 0.65
    vibe_sim = get_vibe_score(f"{title} {artist}", f"{cand_title} {cand_artist}")
    source_boost = 0.12 if source == "watch-playlist" else 0.04
    raw_score = (0.24 * decay) + (0.28 * text_sim) + (0.24 * artist_match) + (0.16 * (1.0 + vibe_sim)) + source_boost
    match_percentage = int(min(99.0, max(58.0, raw_score * 100)))

    album = track.get("album")
    album_name = album.get("name", "Single") if isinstance(album, dict) else album or "Single"
    return {
        "videoId": video_id,
        "title": cand_title,
        "artist": cand_artist,
        "thumbnail": best_thumbnail(track),
        "album": album_name,
        "matchPercentage": match_percentage,
        "recommendationSource": source,
    }
