const SPOTIFY_URL_PATTERN = /https?:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+/i;
const DURATION_PATTERN = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const TRACK_NUMBER_PATTERN = /^\d+$/;

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function cleanCell(value) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function looksLikeHeader(line) {
  const lowered = line.toLowerCase();
  return lowered.includes('track') && (lowered.includes('artist') || lowered.includes('album'));
}

function isNoiseLine(line) {
  const lowered = line.toLowerCase();
  return !line
    || TRACK_NUMBER_PATTERN.test(line)
    || DURATION_PATTERN.test(line)
    || lowered === '#'
    || lowered === 'title'
    || lowered === 'album'
    || lowered === 'duration'
    || looksLikeHeader(line);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || !looksLikeHeader(lines[0]) || !lines[0].includes(',')) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const titleIndex = headers.findIndex((header) => ['track name', 'track', 'title', 'name'].includes(header));
  const artistIndex = headers.findIndex((header) => ['artist name', 'artist', 'artists'].includes(header));

  if (titleIndex < 0 || artistIndex < 0) return [];

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const title = cleanCell(cells[titleIndex]);
    const artist = cleanCell(cells[artistIndex]);
    return title && artist ? `${title} - ${artist}` : title;
  }).filter(Boolean);
}

function parseDelimitedRows(text) {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const queries = [];

  rows.forEach((row, index) => {
    if (isNoiseLine(row) || !/[\t;]/.test(row)) return;
    const cells = row.split(/\t|;/).map(cleanCell).filter(Boolean);
    const filtered = cells.filter((cell) => !isNoiseLine(cell));
    const rowHasDuration = cells.some((cell) => DURATION_PATTERN.test(cell));
    const nextLine = cleanCell(rows[index + 1]);

    if (rowHasDuration && filtered.length >= 1 && nextLine && !isNoiseLine(nextLine) && !/[\t;]/.test(nextLine)) {
      queries.push(`${filtered[0]} - ${nextLine}`);
      return;
    }

    if (filtered.length >= 2) {
      queries.push(`${filtered[0]} - ${filtered[1]}`);
    } else if (filtered.length === 1) {
      queries.push(filtered[0]);
    }
  });

  return queries;
}

function parsePairedSpotifyCopy(text) {
  const lines = text.split(/\r?\n/).map(cleanCell).filter((line) => !isNoiseLine(line));
  const queries = [];

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index];
    const artist = lines[index + 1];
    if (!title) continue;
    if (artist && !DURATION_PATTERN.test(artist)) {
      queries.push(`${title} - ${artist}`);
      index += 1;
    } else {
      queries.push(title);
    }
  }

  return queries;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parsePlaylistImport(text) {
  const trimmed = (text || '').trim();
  const spotifyUrl = SPOTIFY_URL_PATTERN.test(trimmed) && trimmed.split(/\s+/).length === 1;
  if (!trimmed || spotifyUrl) {
    return { queries: [], spotifyUrl };
  }

  const csvQueries = parseCsv(trimmed);
  const delimitedQueries = csvQueries.length > 0 ? csvQueries : parseDelimitedRows(trimmed);
  const queries = delimitedQueries.length > 0 ? delimitedQueries : parsePairedSpotifyCopy(trimmed);

  return {
    queries: dedupe(queries).slice(0, 100),
    spotifyUrl: false,
  };
}
