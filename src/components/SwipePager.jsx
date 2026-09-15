import { useCallback, useEffect, useRef, useState } from 'react'

// Turning a muṣḥaf page by swiping it.
//
// The page follows the finger rather than waiting for a fling to end, because
// that is what makes it feel like paper instead of a gesture being detected.
// Release past a quarter of the screen (or with enough speed) and it completes;
// otherwise it springs back.
//
// Direction follows the book, not the browser. A muṣḥaf is bound on the right,
// so the free edge of the page you are reading is on its left: you lift that
// edge and carry it rightwards to move on. Dragging RIGHT therefore turns to the
// next page, and dragging LEFT goes back — the opposite of an English book, and
// the opposite of what this did until someone who reads Arabic tried it.
//
// Vertical scrolling is untouched — a drag only takes over once it is clearly
// horizontal.

const START_THRESHOLD = 12     // px of horizontal movement before we take over
const COMPLETE_FRACTION = 0.25 // of the screen width
const FLICK_VELOCITY = 0.45    // px per ms

/**
 * What a finished drag means. Pure, so the direction can be tested directly
 * rather than by trying to drive a real gesture and hoping the events arrive.
 *
 * Right is forward: a muṣḥaf is bound on the right, so the free edge of the page
 * is on its left and you carry that edge rightwards to move on.
 *
 * @returns 'next' | 'prev' | null  (null = spring back)
 */
export function decideSwipe({ deltaX, width, elapsed, canNext, canPrev }) {
  const distance = Math.abs(deltaX)
  const velocity = distance / Math.max(1, elapsed)
  const far = distance > width * COMPLETE_FRACTION
  const quick = velocity > FLICK_VELOCITY && distance > 40
  if (!far && !quick) return null
  if (deltaX > 0) return canNext ? 'next' : null
  if (deltaX < 0) return canPrev ? 'prev' : null
  return null
}

export default function SwipePager({
  pageKey, onNext, onPrev, canNext = true, canPrev = true, className = '', children, fill}) {
  const [dx, setDx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [enter, setEnter] = useState(null)   // 'next' | 'prev' — direction we arrived from

  const drag = useRef(null)
  const width = useRef(1)
  const node = useRef(null)

  // When the page actually changes, slide the new one in from the side the old
  // one left towards.
  useEffect(() => {
    setDx(0)
    setAnimating(false)
    if (!enter) return
    const from = enter === 'next' ? -width.current : width.current
    setDx(from)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => { setAnimating(true); setDx(0) })
    })
    const done = setTimeout(() => { setAnimating(false); setEnter(null) }, 260)
    return () => { cancelAnimationFrame(id); clearTimeout(done) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  const finish = useCallback((dir) => {
    // Advancing sends the page off to the right, the way the paper goes.
    const target = dir === 'next' ? width.current : -width.current
    setAnimating(true)
    setDx(target)
    setTimeout(() => {
      setEnter(dir)
      if (dir === 'next') onNext?.()
      else onPrev?.()
    }, 180)
  }, [onNext, onPrev])

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    width.current = node.current?.offsetWidth || window.innerWidth || 1
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), active: false, id: e.pointerId }
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d || animating) return
    const deltaX = e.clientX - d.x
    const deltaY = e.clientY - d.y

    if (!d.active) {
      // Let vertical scrolling win unless the gesture is clearly sideways.
      if (Math.abs(deltaY) > Math.abs(deltaX)) { drag.current = null; return }
      if (Math.abs(deltaX) < START_THRESHOLD) return
      d.active = true
      node.current?.setPointerCapture?.(d.id)
    }

    // Resist at the ends so the muṣḥaf feels bounded rather than broken. Right
    // is forward here, so it is a rightward drag that is blocked on the last
    // page — getting this the wrong way round rubber-bands the wrong edge.
    const blocked = (deltaX > 0 && !canNext) || (deltaX < 0 && !canPrev)
    setDx(blocked ? deltaX * 0.18 : deltaX)
  }

  function springBack() {
    setAnimating(true)
    setDx(0)
    setTimeout(() => setAnimating(false), 200)
  }

  function onPointerUp(e) {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    node.current?.releasePointerCapture?.(d.id)

    const decision = decideSwipe({
      deltaX: e.clientX - d.x,
      width: width.current,
      elapsed: Date.now() - d.t,
      canNext,
      canPrev
    })
    if (decision) return finish(decision)
    springBack()
  }

  // A cancel is the gesture being taken away — the system claiming it, a call
  // arriving, the browser deciding it owns the scroll. It is not a finished
  // swipe, and treating it as one is worse than ignoring it: the cancel event
  // carries its own coordinates, often 0, so a drag that was going one way
  // completes as a page turn the other way. It springs back instead.
  function onPointerCancel() {
    const d = drag.current
    drag.current = null
    if (!d?.active) return
    node.current?.releasePointerCapture?.(d.id)
    springBack()
  }

  const progress = Math.min(1, Math.abs(dx) / (width.current || 1))

  return (
    <div
      ref={node}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`relative ${className}`}
      // Let the browser own vertical scrolling; we only ever take the X axis.
      style={{ touchAction: 'pan-y' }}
    >
      <div
        // The inner wrapper is a plain block by default, which silently breaks a
        // height chain running through the pager. `fill` lets a caller that needs
        // its child to be exactly the pager's height say so.
        className={fill ? 'h-full' : undefined}
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: animating ? 'transform .2s cubic-bezier(.22,.61,.36,1)' : 'none',
          // A touch of lift as the page leaves, so the turn reads as a turn.
          opacity: 1 - progress * 0.25,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  )
}
