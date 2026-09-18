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

import { isNative, nativePosition, locationServicesEnabled } from './native.js'

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
// Which of two failures to tell someone about.
//
// Android saying the switch is off is a fact; the web API's timeout is only the
// symptom of it. Where the native side knew something definite, that is the one
// worth showing.
function worseOf(nativeErr, webErr) {
  if (!nativeErr) return webErr
  if (nativeErr.code === 'servicesOff' || nativeErr.code === 'denied') return nativeErr
  return webErr
}

async function explain(e) {
  let code = e.code
  const native = await isNative().catch(() => false)

  // In the app this is a fact rather than an inference: ask whether the switch
  // is on. On the web it has to stay an inference — permission granted and still
  // no fix means the device, not the page.
  if (code === 'unavailable' || code === 'timeout') {
    const on = await locationServicesEnabled()
    if (on === false) code = 'servicesOff'
    else if (on === null && code === 'unavailable' && await locationGranted()) code = 'servicesOff'
  }
  const message = code === 'servicesOff' && !native ? MESSAGE.servicesOffDesktop : MESSAGE[code]
  return Object.assign(new Error(message), { code })
}

/**
 * Ask the device where it is.
 * @returns {Promise<{lat,lng,accuracy,label,source}>}
 * @throws {Error} with `.code`: 'unsupported' | 'denied' | 'servicesOff' | 'unavailable' | 'timeout'
 */
export async function locate({ highAccuracy = true, timeout = 15000 } = {}) {
  // Inside the APK, ask Android before asking the WebView.
  //
  // The WebView's geolocation reports a granted permission and then produces no
  // fix, and gives nothing to diagnose with either, because the web API cannot
  // say whether the device's Location switch is even on. Android's own
  // LocationManager can, asks every provider at once instead of waiting on
  // satellites, and will take a recent fix immediately.
  //
  // It is a *fallback*, not a replacement. The first version of this rethrew
  // whatever the native side said, so one failure there took away the WebView
  // path as well — and that path had been working. An extra way to get a
  // position must never be able to remove the one that was already there, so
  // anything it does is remembered and then stepped over.
  let nativeFailure = null
  try {
    const native = await nativePosition({ timeout })
    if (native) return native
  } catch (e) {
    nativeFailure = e
  }

  if (!navigator.geolocation) {
    throw await explain(nativeFailure || Object.assign(new Error(MESSAGE.unsupported), { code: 'unsupported' }))
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
        throw await explain(worseOf(nativeFailure, second))
      }
    }
    throw await explain(worseOf(nativeFailure, e))
  }
}

const MESSAGE = {
  denied: 'Location permission was refused. You can pick a city instead, or allow location in your device settings.',
  timeout: 'Could not get a fix in time. Try again near a window, or pick a city.',
  servicesOff: 'Location is switched off on this phone. Turn it on and Sabeel will find you — it never leaves the device.',
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
