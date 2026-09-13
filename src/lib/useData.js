import { useCallback, useEffect, useState } from 'react'

// Every screen that loads data goes through this. Before it existed, a failed
// fetch left the reader showing "Opening the muṣḥaf" forever — no message, no
// way out — because the loaders had no .catch. On a phone with a weak signal
// that is the difference between "this surah is broken" and "tap retry".
export function useData(loader, deps = [], { label = 'content' } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState({ data: null, error: null, loading: true })

    Promise.resolve()
      .then(loader)
      .then(data => {
        if (!alive) return
        if (data == null) throw new Error(`No ${label} found here.`)
        setState({ data, error: null, loading: false })
      })
      .catch(err => {
        if (!alive) return
        setState({ data: null, error: err?.message || `Could not load ${label}.`, loading: false })
      })

    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt(a => a + 1), [])
  return { ...state, retry }
}
