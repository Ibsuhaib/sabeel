// A device heading that means the same thing everywhere on earth.
//
// The two platforms do not agree on what a compass reading is:
//
//   iOS      `webkitCompassHeading` is degrees clockwise from TRUE north.
//            Apple has already applied the magnetic correction.
//   Android  `deviceorientationabsolute` gives alpha from the rotation-vector
//            sensor, which is referenced to MAGNETIC north.
//
// Treating both the same — which is the obvious thing to do, and what this app
// did — leaves the qibla arrow wrong by the local magnetic declination. That is
// under a degree in Jakarta, 12° in New York, and 27° in Cape Town. So on
// Android the reading is corrected with the World Magnetic Model before anyone
// sees it, and the app reports which north it is actually working from.
//
// A phone held flat also has to be told which way up the screen is: in landscape
// the sensor frame and the screen frame differ by the screen rotation.
import { useEffect, useRef, useState } from 'react'
import { declination, decimalYear, hasModel, loadModel } from './geomag.js'
import { geomagModel } from './data.js'

export const norm360 = d => ((d % 360) + 360) % 360

/** Shortest signed turn from a to b, in (-180, 180]. */
export const angleDelta = (a, b) => ((b - a + 540) % 360) - 180

function screenAngle() {
  const a = window.screen?.orientation?.angle
  return typeof a === 'number' ? a : (window.orientation || 0)
}

/**
 * Live device heading, in degrees clockwise from true north.
 *
 * @param {{lat:number,lng:number}|null} location used to look up declination
 * @returns {{heading, accuracy, reference, status, enable, error}}
 *   status: 'idle' | 'live' | 'waiting' | 'denied' | 'unsupported'
 *   reference: 'true' | 'magnetic' — which north the reading is measured from,
 *              after correction. 'magnetic' means we had no model to correct with.
 */
export function useCompass(location) {
  const [heading, setHeading] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [reference, setReference] = useState('true')
  const [status, setStatus] = useState('idle')

  // Declination changes by a fraction of a degree over hundreds of kilometres, so
  // it is computed once per location rather than per sensor event.
  //
  // The model is fetched, so this has to wait for it. Computing the declination
  // only on mount looks right and is not: the first run lands before the fetch
  // resolves, leaves the correction at zero, and then never runs again — the
  // compass silently reports magnetic north while claiming it is true.
  const [decl, setDecl] = useState(null)
  const declRef = useRef(0)
  const declApplied = useRef(false)
  const everRead = useRef(false)

  useEffect(() => {
    let alive = true
    const apply = () => {
      if (!alive || !location || !hasModel()) return
      const d = declination(location.lat, location.lng, decimalYear())
      const v = Number.isFinite(d) ? d : 0
      declRef.current = v
      declApplied.current = true
      setDecl(v)
    }
    if (hasModel()) apply()
    else geomagModel().then(m => { if (alive) { loadModel(m); apply() } }).catch(() => {})
    return () => { alive = false }
  }, [location?.lat, location?.lng])

  useEffect(() => {
    if (status !== 'live' && status !== 'waiting') return

    function onOrient(e) {
      let h = null
      let ref = 'true'

      if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
        // iOS: already true north.
        h = e.webkitCompassHeading
        if (typeof e.webkitCompassAccuracy === 'number') {
          setAccuracy(e.webkitCompassAccuracy < 0 ? null : e.webkitCompassAccuracy)
        }
      } else if (e.alpha != null && (e.absolute || e.type === 'deviceorientationabsolute')) {
        // Android: magnetic north, so apply the declination for where we are.
        const magnetic = 360 - e.alpha
        if (declApplied.current) {
          h = magnetic + declRef.current
        } else {
          // No correction available yet — say so rather than passing a magnetic
          // reading off as a true one.
          h = magnetic
          ref = 'magnetic'
        }
      }

      if (h == null || Number.isNaN(h)) return
      // Compensate for the screen being rotated relative to the sensor frame.
      h = norm360(h + screenAngle())

      if (!everRead.current) { everRead.current = true; setStatus('live') }
      setReference(ref)
      setHeading(h)
    }

    window.addEventListener('deviceorientationabsolute', onOrient, true)
    window.addEventListener('deviceorientation', onOrient, true)
    const onRotate = () => {}
    window.addEventListener('orientationchange', onRotate)

    // If nothing ever arrives, say so rather than spinning forever. This must be
    // judged on whether a reading has EVER been seen, not on this subscription:
    // the effect re-runs when the location changes, and resetting the flag each
    // time would declare a perfectly good compass missing the moment the sensor
    // went quiet for three seconds.
    const timer = setTimeout(() => {
      if (!everRead.current) setStatus(s => (s === 'live' ? s : 'unsupported'))
    }, 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('deviceorientationabsolute', onOrient, true)
      window.removeEventListener('deviceorientation', onOrient, true)
      window.removeEventListener('orientationchange', onRotate)
    }
  }, [status, location?.lat, location?.lng])

  async function enable() {
    const D = window.DeviceOrientationEvent
    if (!D) { setStatus('unsupported'); return }
    if (typeof D.requestPermission === 'function') {
      try {
        const res = await D.requestPermission()
        setStatus(res === 'granted' ? 'waiting' : 'denied')
      } catch { setStatus('denied') }
    } else {
      setStatus('waiting')
    }
  }

  return { heading, accuracy, reference, status, enable, declination: decl }
}
