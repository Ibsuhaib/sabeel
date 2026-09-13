import { useState } from 'react'
import { useSettings } from '../lib/settings.jsx'
import { METHODS } from '../lib/prayer.js'
import { RECITERS } from '../lib/audio.js'
import { Button, Choice } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// Four taps: location → madhab → translation → reciter. No account, no email,
// no permission wall. Every step is skippable and changeable later.
const STEPS = ['location', 'madhab', 'translation', 'reciter']

export default function Onboarding() {
  const { settings, set } = useSettings()
  const [step, setStep] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState(null)

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : set({ onboarded: true }))

  function useMyLocation() {
    setLocating(true)
    setLocError(null)
    if (!navigator.geolocation) {
      setLocError('This device has no location support. You can pick a city instead.')
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        set({
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Current location'
          },
          // A sensible regional default; the user can change it on the next screen.
          method: guessMethod(pos.coords.latitude, pos.coords.longitude)
        })
        setLocating(false)
        setStep(1)
      },
      err => {
        setLocError(
          err.code === 1
            ? 'Location permission was denied. Pick a city below — you can change it any time.'
            : 'Could not get a location fix. Pick a city below.'
        )
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
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
            {locError && (
              <p className="text-xs text-amber-500 mt-3 flex gap-2">
                <Icon name="warn" size={14} className="shrink-0 mt-0.5" />{locError}
              </p>
            )}
            <CityPicker onPick={city => { set({ location: city, method: city.method }); setStep(1) }} />
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
          <Step title="Choose a reciter" body="Recitation streams on demand and is cached as you listen, so surahs you have played work offline.">
            <div className="px-4 max-h-72 overflow-y-auto space-y-2">
              {RECITERS.slice(0, 8).map(r => (
                <button
                  key={r.id}
                  onClick={() => set({ reciter: r.id })}
                  className={`tap w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                    settings.reciter === r.id ? 'border-brand bg-brand/10' : 'border-line bg-surf text-muted'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
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
const CITIES = [
  { label: 'Makkah', lat: 21.4225, lng: 39.8262, method: 'UmmAlQura' },
  { label: 'Madinah', lat: 24.4686, lng: 39.6142, method: 'UmmAlQura' },
  { label: 'Cairo', lat: 30.0444, lng: 31.2357, method: 'Egyptian' },
  { label: 'Istanbul', lat: 41.0082, lng: 28.9784, method: 'Turkey' },
  { label: 'Karachi', lat: 24.8607, lng: 67.0011, method: 'Karachi' },
  { label: 'Lahore', lat: 31.5204, lng: 74.3587, method: 'Karachi' },
  { label: 'Delhi', lat: 28.6139, lng: 77.209, method: 'Karachi' },
  { label: 'Mumbai', lat: 19.076, lng: 72.8777, method: 'Karachi' },
  { label: 'Hyderabad', lat: 17.385, lng: 78.4867, method: 'Karachi' },
  { label: 'Dhaka', lat: 23.8103, lng: 90.4125, method: 'Karachi' },
  { label: 'Kuala Lumpur', lat: 3.139, lng: 101.6869, method: 'Singapore' },
  { label: 'Jakarta', lat: -6.2088, lng: 106.8456, method: 'Singapore' },
  { label: 'Dubai', lat: 25.2048, lng: 55.2708, method: 'Dubai' },
  { label: 'London', lat: 51.5074, lng: -0.1278, method: 'MuslimWorldLeague' },
  { label: 'New York', lat: 40.7128, lng: -74.006, method: 'NorthAmerica' },
  { label: 'Toronto', lat: 43.6532, lng: -79.3832, method: 'NorthAmerica' }
]

function guessMethod(lat, lng) {
  if (lng > 34 && lng < 60 && lat > 12 && lat < 33) return 'UmmAlQura'
  if (lng > 60 && lng < 95) return 'Karachi'
  if (lng > 95 && lng < 141 && lat < 25) return 'Singapore'
  if (lng > -170 && lng < -50) return 'NorthAmerica'
  if (lng > 25 && lng < 45 && lat > 34 && lat < 43) return 'Turkey'
  return 'MuslimWorldLeague'
}

function CityPicker({ onPick }) {
  const [q, setQ] = useState('')
  const list = CITIES.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="mt-6">
      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="Or search for a city"
        className="w-full px-4 py-3 rounded-xl bg-surf border border-line text-sm outline-none focus:border-brand"
      />
      <div className="mt-2 max-h-52 overflow-y-auto grid grid-cols-2 gap-2">
        {list.map(c => (
          <button key={c.label} onClick={() => onPick(c)} className="tap px-3 py-2.5 rounded-xl bg-surf border border-line text-sm text-left hover:border-brand/50">
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
