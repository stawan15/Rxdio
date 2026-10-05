import { useCallback, useEffect, useState } from 'react'
import { radioApi, type Country, type RadioStation } from '../services/radioApi'

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [attempt, setAttempt] = useState(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on demand
  useEffect(() => {
    const ac = new AbortController()
    radioApi.getCountries(ac.signal).then(setCountries).catch(() => { /* picker/globe degrade to empty */ })
    return () => ac.abort()
  }, [attempt])
  return { countries, reload: useCallback(() => setAttempt(a => a + 1), []) }
}

type StationsState = { stations: RadioStation[]; status: 'loading' | 'ready' | 'error' }

/** Stations for a country; an in-flight request is aborted when the country changes. */
export function useStations(code: string) {
  const [state, setState] = useState<StationsState>({ stations: [], status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on demand
  useEffect(() => {
    const ac = new AbortController()
    setState({ stations: [], status: 'loading' })
    radioApi
      .getStationsByCountry(code, ac.signal)
      .then(stations => setState({ stations, status: 'ready' }))
      .catch(() => { if (!ac.signal.aborted) setState({ stations: [], status: 'error' }) })
    return () => ac.abort()
  }, [code, attempt])
  return { ...state, reload: useCallback(() => setAttempt(a => a + 1), []) }
}
