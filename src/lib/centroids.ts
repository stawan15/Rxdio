import centroids from '../data/centroids.json'

export type LatLon = readonly [lat: number, lon: number]

export const centroidOf = (code: string): LatLon | undefined => (centroids as unknown as Record<string, LatLon>)[code]
