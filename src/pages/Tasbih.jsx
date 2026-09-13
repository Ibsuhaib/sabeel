import { useEffect, useState } from 'react'
import { store } from '../lib/store.js'
import { Screen, Header, Card, Loading, IconButton } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const PRESETS = [
  { label: 'SubhanAllah', ar: 'سُبْحَانَ ٱللَّٰه', target: 33 },
  { label: 'Alhamdulillah', ar: 'ٱلْحَمْدُ لِلَّٰه', target: 33 },
  { label: 'Allahu Akbar', ar: 'ٱللَّٰهُ أَكْبَر', target: 34 },
  { label: 'La ilaha illa Allah', ar: 'لَا إِلَٰهَ إِلَّا ٱللَّٰه', target: 100 },
  { label: 'Astaghfirullah', ar: 'أَسْتَغْفِرُ ٱللَّٰه', target: 100 },
  { label: 'Salawat', ar: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّد', target: 100 }
]

export default function Tasbih() {
  const [state, setState] = useState(null)

  useEffect(() => { store.tasbih().then(setState) }, [])
  useEffect(() => { if (state) store.setTasbih(state) }, [state])

  if (!state) return <Loading />

  const preset = PRESETS.find(p => p.label === state.label) || PRESETS[0]
  const complete = state.count >= state.target

  function tap() {
    const count = state.count + 1
    const done = count >= state.target
    if (navigator.vibrate) navigator.vibrate(done ? [40, 60, 40] : 10)
    setState(s => ({ ...s, count: done ? 0 : count, total: s.total + 1, rounds: done ? (s.rounds || 0) + 1 : (s.rounds || 0) }))
  }

  return (
    <Screen>
      <Header
        title="Tasbih"
        subtitle={`${state.total} total · ${state.rounds || 0} rounds`}
        back
        actions={<IconButton name="reset" label="Reset counter" onClick={() => setState(s => ({ ...s, count: 0 }))} />}
      />

      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setState(s => ({ ...s, label: p.label, target: p.target, count: 0 }))}
              className={`tap shrink-0 chip px-3 py-1.5 rounded-full text-xs border transition-colors ${
                state.label === p.label ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 text-center">
        <p className="ar text-brand" style={{ textAlign: 'center', fontSize: 34 }}>{preset.ar}</p>
        <p className="text-xs text-muted mt-2">{preset.label}</p>
      </div>

      <button
        onClick={tap}
        className="tap block mx-auto mt-8 w-56 h-56 rounded-full border-4 border-line bg-surf active:scale-95 transition-transform grid place-items-center relative"
        aria-label="Count one"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(var(--c-line))" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="47" fill="none" stroke="rgb(var(--c-brand))" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 47}`}
            strokeDashoffset={`${2 * Math.PI * 47 * (1 - state.count / state.target)}`}
            style={{ transition: 'stroke-dashoffset .2s' }}
          />
        </svg>
        <div className="relative">
          <div className={`text-6xl font-semibold tabular-nums ${complete ? 'text-brand' : ''}`}>{state.count}</div>
          <div className="text-xs text-muted mt-1">of {state.target}</div>
        </div>
      </button>

      <div className="px-4 mt-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted flex-1">Target per round</span>
            <div className="flex gap-1.5">
              {[33, 34, 100, 1000].map(t => (
                <button
                  key={t}
                  onClick={() => setState(s => ({ ...s, target: t, count: 0 }))}
                  className={`tap chip px-2.5 py-1 rounded-lg text-xs tabular-nums border ${
                    state.target === t ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        </Card>

        <button
          onClick={() => setState(s => ({ ...s, count: 0, total: 0, rounds: 0 }))}
          className="tap w-full mt-3 py-2.5 text-xs text-muted"
        >
          <Icon name="reset" size={13} className="inline mr-1.5 -mt-0.5" />Clear all totals
        </button>
      </div>
    </Screen>
  )
}
