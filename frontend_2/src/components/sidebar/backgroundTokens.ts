export function extractHexColor(value: string, fallback: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return value;
  return fallback;
}

export function stripBackgroundTokens(value: string) {
  return value.replace(/\s*BG_(?:SOLID|GRADIENT|MULTI)\([^)]*\)/g, '').trim();
}

export function parseBackgroundToken(promptHint: string, type: 'SOLID' | 'GRADIENT' | 'MULTI') {
  const matched = promptHint.match(new RegExp(`BG_${type}\\(([^)]*)\\)`));
  if (!matched) return null;

  return matched[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function withBackgroundToken(promptHint: string, token: string) {
  const base = stripBackgroundTokens(promptHint);
  return base ? `${base} ${token}`.trim() : token;
}
