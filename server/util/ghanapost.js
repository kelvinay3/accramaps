// GhanaPost GPS digital addresses look like "GA-183-8164":
// two-letter region/district prefix, then 3–5 digit area code, then 4 digit
// unique address. There is no free public API to resolve codes to
// coordinates, so we validate the format and keep the code as metadata on
// saved places.

const CODE_RE = /^([A-Z]{2})-(\d{3,5})-(\d{4})$/;

// First letter → region (second letter identifies the district).
const REGION_PREFIXES = {
  G: 'Greater Accra', A: 'Ashanti', B: 'Bono', C: 'Central', E: 'Eastern',
  N: 'Northern', S: 'Savannah', U: 'Upper East', W: 'Western', V: 'Volta',
  O: 'Oti', X: 'Upper West', T: 'Bono East / Ahafo', M: 'Western North',
};

export function normalizeGhanaPostGps(input) {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  const withDashes = /^[A-Z]{2}\d{7,9}$/.test(cleaned)
    ? cleaned.replace(/^([A-Z]{2})(\d{3,5})(\d{4})$/, '$1-$2-$3')
    : cleaned;
  return CODE_RE.test(withDashes) ? withDashes : null;
}

export function ghanaPostRegion(code) {
  const normalized = normalizeGhanaPostGps(code);
  if (!normalized) return null;
  return REGION_PREFIXES[normalized[0]] || null;
}

export function looksLikeGhanaPostGps(input) {
  return normalizeGhanaPostGps(input) !== null;
}
