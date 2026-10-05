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
