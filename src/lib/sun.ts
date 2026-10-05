import type { LatLon } from './geo'

/** Point on Earth where the sun is directly overhead (declination + equation of time). */
export function subsolarPoint(date = new Date()): LatLon {
  const dayOfYear = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
  const b = ((2 * Math.PI) / 364) * (dayOfYear - 81)
  const eqTimeMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lon = (12 - utcHours - eqTimeMin / 60) * 15
  return [declination, ((lon + 540) % 360) - 180]
}
