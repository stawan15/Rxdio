let names: Intl.DisplayNames | null | undefined

export function countryName(code: string, fallback = code) {
  if (names === undefined) {
    try { names = new Intl.DisplayNames(['en'], { type: 'region' }) } catch { names = null }
  }
  try { return names?.of(code) ?? fallback } catch { return fallback }
}

export function flagEmoji(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐'
  return String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0)))
}

/** Country matching the browser locale (en-US → US), else Thailand. */
export function defaultCountryCode() {
  const region = navigator.language.split('-')[1]?.toUpperCase()
  return region && /^[A-Z]{2}$/.test(region) ? region : 'TH'
}

let localNames: Intl.DisplayNames | null | undefined

/** Country name in the visitor's own language, or null when that is English. */
export function localCountryName(code: string): string | null {
  if (localNames === undefined) {
    const lang = navigator.language
    try { localNames = lang.toLowerCase().startsWith('en') ? null : new Intl.DisplayNames([lang], { type: 'region' }) } catch { localNames = null }
  }
  try { return localNames?.of(code) ?? null } catch { return null }
}

const NICKNAMES: Record<string, string> = { usa: 'US', america: 'US', uk: 'GB', england: 'GB', britain: 'GB', uae: 'AE', holland: 'NL' }

/** True when the query is exactly this country's ISO code or a known nickname (ranks first in search). */
export const isExactCountryMatch = (code: string, query: string) => {
  const q = query.trim().toLowerCase()
  return code.toLowerCase() === q || NICKNAMES[q] === code
}

/** Be liberal in what you accept: English or local names, ISO codes, common nicknames. */
export function matchesCountry(code: string, englishName: string, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return code.toLowerCase() === q || NICKNAMES[q] === code || englishName.toLowerCase().includes(q) || (localCountryName(code)?.toLowerCase().includes(q) ?? false)
}
