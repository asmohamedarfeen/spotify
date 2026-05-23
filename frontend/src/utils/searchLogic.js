export function normalizeSearchTerm(value) {
  return (value || '').trim().replace(/\s+/g, ' ');
}

export function canSearch(value) {
  return normalizeSearchTerm(value).length >= 2;
}
