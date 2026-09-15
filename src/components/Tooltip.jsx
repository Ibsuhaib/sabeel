import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// A tooltip that also works on a touch screen.
//
// The native `title` attribute is a desktop-only affordance: phones have no
// hover, so on the platform this app is mainly used on it shows nothing at all.
// An icon-only button therefore has no way of explaining itself — which is
// exactly the complaint that prompted this.
//
// So: hover and keyboard focus on a pointer device, long-press on a touch one.
// A long press that opens the tooltip swallows the click that would follow, so
// asking what a button does never also presses it.
//
// Rendered through a portal into <body>. The reader header uses backdrop-filter,
// which makes it a containing block for fixed positioning in some browsers, and
// a tooltip laid out inside it would be clipped by the header's own bounds.

const HOVER_DELAY = 350
const PRESS_DELAY = 400
const GAP = 8
const EDGE = 8

// Only one tooltip is ever on screen. Relying on each one to hide itself when the
// pointer leaves is not enough: a pointerleave can be missed — moving quickly
// between two buttons, or a pointer that jumps rather than travels — and the
// tooltip then sits there describing something the pointer is no longer on.
let openTooltip = null

export default function Tooltip({ label, children, placement = 'bottom', disabled }) {
  const [box, setBox] = useState(null)
  const holder = useRef(null)
  const timer = useRef(null)
  const suppressClick = useRef(false)
  const hideSelf = useRef(null)
  const bubble = useRef(null)
  const [shift, setShift] = useState(0)

  const clear = () => { clearTimeout(timer.current); timer.current = null }

  const closeOthers = useCallback(() => {
    if (openTooltip && openTooltip !== hideSelf.current) openTooltip()
  }, [])

  const show = useCallback(() => {
    // The wrapper is `display: contents` so it does not disturb the layout of
    // whatever it wraps — which also means it has no box of its own, and its
    // own getBoundingClientRect is all zeros. Measure the child that actually
    // occupies space, or the tooltip pins itself to the top-left corner.
    const el = holder.current?.firstElementChild || holder.current
    if (!el || !label) return
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return
    closeOthers()
    openTooltip = hideSelf.current
    setBox({ x: r.left + r.width / 2, top: r.bottom + GAP, bottom: r.top - GAP })
  }, [label, closeOthers])

  const hide = useCallback(() => {
    clear()
    if (openTooltip === hideSelf.current) openTooltip = null
    setBox(null)
  }, [])

  hideSelf.current = hide

  useEffect(() => () => {
    clear()
    if (openTooltip === hideSelf.current) openTooltip = null
  }, [])

  // Clamp by measuring the bubble rather than assuming a width: a tooltip beside
  // the last button in a header would otherwise hang off the screen edge.
  useLayoutEffect(() => {
    if (!box || !bubble.current) { setShift(0); return }
    const r = bubble.current.getBoundingClientRect()
    let d = 0
    if (r.left < EDGE) d = EDGE - r.left
    else if (r.right > window.innerWidth - EDGE) d = window.innerWidth - EDGE - r.right
    setShift(v => (Math.abs(d) < 0.5 ? v : v + d))
  }, [box, label])

  // Any scroll or resize invalidates the measured position.
  useEffect(() => {
    if (!box) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [box, hide])

  if (disabled || !label) return children

  const onPointerEnter = e => {
    if (e.pointerType === 'touch') return
    clear()
    timer.current = setTimeout(show, HOVER_DELAY)
  }

  const onPointerDown = e => {
    if (e.pointerType !== 'touch') return
    clear()
    timer.current = setTimeout(() => {
      suppressClick.current = true
      show()
    }, PRESS_DELAY)
  }

  const endPress = () => {
    clear()
    // Leave it up briefly after the finger lifts so it can actually be read.
    if (box) setTimeout(hide, 1400)
  }

  return (
    <>
      <span
        ref={holder}
        className="contents"
        onPointerEnter={onPointerEnter}
        onPointerLeave={hide}
        onPointerDown={onPointerDown}
        onPointerUp={endPress}
        onPointerCancel={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
        onClickCapture={e => {
          if (!suppressClick.current) return
          suppressClick.current = false
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {children}
      </span>

      {box && createPortal(
        <span
          role="tooltip"
          className="fixed z-[100] pointer-events-none px-2.5 py-1.5 rounded-lg bg-ink text-bg text-[11px] leading-snug shadow-lg text-center"
          ref={bubble}
          style={{
            left: box.x,
            top: placement === 'top' ? undefined : box.top,
            bottom: placement === 'top' ? window.innerHeight - box.bottom : undefined,
            transform: `translateX(calc(-50% + ${shift}px))`,
            maxWidth: 'min(15rem, calc(100vw - 16px))'
          }}
        >
          {label}
        </span>,
        document.body
      )}
    </>
  )
}
