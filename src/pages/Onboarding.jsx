import { useEffect, useState } from 'react'
import { locate } from '../lib/locate.js'
import { useSettings } from '../lib/settings.jsx'
import { METHODS } from '../lib/prayer.js'
import { loadReciters, groupReciters } from '../lib/reciters.js'
import { Button, Choice } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import ReciterPreview, { stopPreview } from '../components/ReciterPreview.jsx'
import LocationError from '../components/LocationError.jsx'
import CityPicker from '../components/CityPicker.jsx'

// Four taps: location → madhab → translation → reciter. No account, no email,
// no permission wall. Every step is skippable and changeable later.
const STEPS = ['location', 'madhab', 'translation', 'reciter']

export default function Onboarding() {
  const { settings, set } = useSettings()
  const [step, setStep] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState(null)

  // A sample still playing when onboarding ends would carry on over the app.
  const next = () => {
    stopPreview()
    return step < STEPS.length - 1 ? setStep(step + 1) : set({ onboarded: true })
  }

  function useMyLocation() {
    setLocating(true)
    setLocError(null)
    locate()
      .then(loc => {
        set({
          location: loc,
          // A sensible regional default; the user can change it on the next screen.
          method: guessMethod(loc.lat, loc.lng)
        })
        setStep(1)
      })
      .catch(e => setLocError(e))
      .finally(() => setLocating(false))
  }

  const s = STEPS[step]

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto px-5 safe-t safe-b">
      <div className="pt-10 pb-6">
        <Wordmark />
        <div className="flex gap-1.5 mt-8">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1">
        {s === 'location' && (
          <Step
            title="Where are you praying?"
            body="Prayer times are calculated on your device. Your location never leaves this phone — there is no server to send it to."
          >
            <Button size="lg" onClick={useMyLocation} disabled={locating}>
              <Icon name="location" size={18} />
              {locating ? 'Getting your location…' : 'Use my location'}
            </Button>
            <LocationError error={locError} onRetry={useMyLocation} />
            <CityPicker onPick={city => { set({ location: { ...city, source: 'city' }, method: city.method }); setStep(1) }} />
          </Step>
        )}

        {s === 'madhab' && (
          <Step
            title="Which school do you follow for Asr?"
            body="This is the one fiqh question that changes the times you see. Hanafi Asr begins later — when a shadow reaches twice the object's length."
          >
            <Choice
              columns={1}
              value={settings.madhab}
              onChange={v => set({ madhab: v })}
              options={[
                { id: 'shafi', label: 'Shafi’i, Maliki, Hanbali', note: 'Asr at 1× shadow length' },
                { id: 'hanafi', label: 'Hanafi', note: 'Asr at 2× shadow length' }
              ]}
            />
            <p className="text-xs text-muted px-4 mt-4 leading-relaxed">
              Both positions are held by recognised scholars. Sabeel never presents one as the
              answer — where the schools differ, you will see them side by side.
            </p>
          </Step>
        )}

        {s === 'translation' && (
          <Step title="Which English translation?" body="You can switch at any time, and show both together while reading.">
            <Choice
              columns={1}
              value={settings.translation}
              onChange={v => set({ translation: v })}
              options={[
                { id: 'en', label: 'Saheeh International', note: 'Precise and widely used' },
                { id: 'e2', label: 'The Clear Quran', note: 'Mustafa Khattab — plainer modern English' }
              ]}
            />
          </Step>
        )}

        {s === 'reciter' && (
          <Step title="Choose a reciter" body="Tap ▶ beside a name to hear them recite al-Fātiḥah — a name tells you little, the voice tells you everything. Recitation streams on demand and is cached as you listen. You can change this any time.">
            <ReciterStep value={settings.reciter} onChange={id => set({ reciter: id })} />
          </Step>
        )}
      </div>

      <div className="py-6 space-y-3">
        <Button size="lg" onClick={next}>
          {step === STEPS.length - 1 ? 'Start' : 'Continue'}
        </Button>
        {step === 0 && (
          <button onClick={() => set({ onboarded: true })} className="tap w-full text-xs text-muted py-2">
            Skip for now — I only want to read
          </button>
        )}
      </div>
    </div>
  )
}

// Haramain imams first — it is what most people are looking for on this screen.
function ReciterStep({ value, onChange }) {
  const [catalogue, setCatalogue] = useState(null)
  useEffect(() => { loadReciters().then(setCatalogue) }, [])

  if (!catalogue) return <p className="px-4 text-sm text-muted">Loading reciters…</p>

  return (
    <div className="px-4 max-h-80 overflow-y-auto">
      {groupReciters(catalogue).map(g => (
        <section key={g.id} className="mb-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">{g.label}</h4>
          <div className="space-y-2">
            {g.reciters.slice(0, g.id === 'other' ? 10 : 99).map(r => (
              // The listen button sits beside the row rather than inside it:
              // a button within a button is not valid, and tapping to hear
              // someone must not also choose them.
              <div key={r.id} className="flex items-center gap-2">
                <button
                  onClick={() => onChange(r.id)}
                  className={`tap flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl border text-sm flex items-center gap-2 ${
                    value === r.id ? 'border-brand bg-brand/10' : 'border-line bg-surf text-muted'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{r.name}</span>
                  {r.mode === 'surah' && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border border-line opacity-70">full surah</span>
                  )}
                </button>
                <ReciterPreview reciter={r} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Wordmark() {
  return (
    <div>
      <div className="ar text-4xl text-brand" style={{ textAlign: 'left', direction: 'rtl' }}>سَبِيل</div>
      <h1 className="text-2xl font-semibold mt-1">Sabeel</h1>
      <p className="text-sm text-muted mt-2 leading-relaxed">
        Quran, hadith, prayer times and dua. Free forever, no ads, no account,
        no tracking. Built as sadaqah jariyah.
      </p>
    </div>
  )
}

function Step({ title, body, children }) {
  return (
    <div>
      <h2 className="text-xl font-semibold px-4">{title}</h2>
      <p className="text-sm text-muted px-4 mt-2 mb-6 leading-relaxed">{body}</p>
      {children}
    </div>
  )
}

// A short offline list so the app is usable with location permission denied.


function guessMethod(lat, lng) {
  if (lng > 34 && lng < 60 && lat > 12 && lat < 33) return 'UmmAlQura'
  if (lng > 60 && lng < 95) return 'Karachi'
  if (lng > 95 && lng < 141 && lat < 25) return 'Singapore'
  if (lng > -170 && lng < -50) return 'NorthAmerica'
  if (lng > 25 && lng < 45 && lat > 34 && lat < 43) return 'Turkey'
  return 'MuslimWorldLeague'
}


