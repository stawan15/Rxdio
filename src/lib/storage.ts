export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)) } catch { /* private mode / quota */ }
}
