import { useState } from 'react'

// The cities offered when a live fix is not available or not wanted.
//
// Lifted out of Onboarding so Settings can offer it too. Until it was, the only
// place a location could be chosen was the first run: if the live fix failed
// afterwards there was no way to set one at all, short of clearing the app's
// data — reported as "if we have to change the location inside we cant".
//
// Each carries its own calculation method, because the method that matches a
// place is part of knowing the place.
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

export default function CityPicker({ onPick }) {
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