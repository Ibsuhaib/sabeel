// Getting a position fix, in one place.
//
// Prayer times and the qibla are both computed from coordinates, and how good
// those coordinates are decides how good the answer is. A city picked from a
// list puts you at that city's centre, which can be tens of kilometres from
// where you actually are — enough to move Fajr and Maghrib by a few minutes and
// to shift the qibla noticeably when you are far from Makkah. So a fix is worth
// asking for, and the app records which kind it has rather than pretending they
// are the same.
//
// On Android the WebView only raises its permission prompt for permissions the
// manifest declares; ACCESS_COARSE_LOCATION and ACCESS_FINE_LOCATION are added
// by scripts/android-setup.mjs for exactly this reason.

export const LOCATION_SOURCE = {
  gps: 'Device location',
  city: 'Chosen city',
  manual: 'Entered by hand'
}

/**
 * Ask the device where it is.
 * @returns {Promise<{lat,lng,accuracy,label,source}>}
 * @throws {Error} with `.code`: 'unsupported' | 'denied' | 'unavailable' | 'timeout'
 */
export function locate({ highAccuracy = true, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('This device has no location support.'), { code: 'unsupported' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        label: 'Current location',
        source: 'gps'
      }),
      err => {
        const code = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'
        reject(Object.assign(new Error(MESSAGE[code]), { code }))
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 300000 }
    )
  })
}

const MESSAGE = {
  denied: 'Location permission was refused. You can pick a city instead, or allow location in your device settings.',
  timeout: 'Could not get a fix in time. Try again near a window, or pick a city.',
  unavailable: 'Location is unavailable right now. Pick a city instead.',
  unsupported: 'This device has no location support. Pick a city instead.'
}

/** Has the browser already been granted location, so asking will not prompt? */
export async function locationGranted() {
  try {
    const s = await navigator.permissions?.query({ name: 'geolocation' })
    return s?.state === 'granted'
  } catch {
    return false
  }
}

/** A short description of how good a stored location is. */
export function describeAccuracy(location) {
  if (!location) return null
  if (location.source !== 'gps') return LOCATION_SOURCE[location.source] || LOCATION_SOURCE.city
  if (location.accuracy == null) return 'Device location'
  return location.accuracy < 1000
    ? `Device location · ±${Math.round(location.accuracy)} m`
    : `Device location · ±${(location.accuracy / 1000).toFixed(1)} km`
}
