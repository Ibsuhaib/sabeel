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

import { isNative } from './native.js'

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
function fix({ highAccuracy, timeout }) {
  return new Promise((resolve, reject) => {
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
        reject(Object.assign(new Error(code), { code }))
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 300000 }
    )
  })
}

// Work out what actually went wrong, which the error code alone does not say.
//
// POSITION_UNAVAILABLE comes back both when no position can be had and when the
// phone's Location switch is simply off — two situations with opposite remedies.
// They can be told apart: if permission has been granted and a fix still cannot
// be had, it is the device switch and not the app. This matters because the
// message for both used to be "Location is unavailable right now. Pick a city
// instead", which tells someone to give up when the fix is one toggle away.
async function explain(e) {
  let code = e.code
  if (code === 'unavailable' && await locationGranted()) code = 'servicesOff'
  const native = await isNative().catch(() => false)
  const message = code === 'servicesOff' && !native ? MESSAGE.servicesOffDesktop : MESSAGE[code]
  return Object.assign(new Error(message), { code })
}

/**
 * Ask the device where it is.
 * @returns {Promise<{lat,lng,accuracy,label,source}>}
 * @throws {Error} with `.code`: 'unsupported' | 'denied' | 'servicesOff' | 'unavailable' | 'timeout'
 */
export async function locate({ highAccuracy = true, timeout = 15000 } = {}) {
  if (!navigator.geolocation) {
    throw Object.assign(new Error(MESSAGE.unsupported), { code: 'unsupported' })
  }

  try {
    return await fix({ highAccuracy, timeout })
  } catch (e) {
    // A high-accuracy request is asking for a satellite fix, and indoors that
    // regularly times out while the position wifi and cell towers already imply
    // would have come back at once. Ask for that before giving up: a fix good to
    // a hundred metres still puts prayer times and the qibla far closer than the
    // centre of a city does.
    if (highAccuracy && (e.code === 'timeout' || e.code === 'unavailable')) {
      try {
        return await fix({ highAccuracy: false, timeout: Math.max(timeout, 20000) })
      } catch (second) {
        throw await explain(second)
      }
    }
    throw await explain(e)
  }
}

const MESSAGE = {
  denied: 'Location permission was refused. You can pick a city instead, or allow location in your device settings.',
  timeout: 'Could not get a fix in time. Try again near a window, or pick a city.',
  servicesOff: 'Location is switched off on this phone. Swipe down from the top of the screen, turn on the Location tile, then tap Use my location again.',
  servicesOffDesktop: 'Location services are switched off on this device. Turn them on in your system settings, then try again.',
  unavailable: 'Location is unavailable right now. Check that Location is switched on in your device settings, or pick a city instead.',
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
