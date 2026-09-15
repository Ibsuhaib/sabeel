// The letterforms, in a normalised box: u runs 0→1 left to right, v runs 0→1
// top to bottom. Arabic reads right to left, so the first letter of a word is
// the rightmost stroke here.
//
// These are drawn in a naskh-leaning hand: upright shafts, a level baseline, and
// the closed loops that let a word stay legible when it is 48 pixels wide.
import { quad, arc } from './calligraphy.mjs'

const BASE = 0.665        // the line the letters sit on
const TOP = 0.250         // where the tall shafts begin

// A shaft — alif or lam — leaning a hair right, as a written upright does.
const shaft = (x, top = TOP, bottom = BASE, lean = 0.006) =>
  [[x + lean, top], [x, bottom]]

/* ------------------------------- الله ------------------------------------ */
// alif · lam · lam · heh, with the shadda and dagger alif that sit above the
// lams. The final heh is the closed knot the ligature is recognised by.
export function lafzAlJalalah() {
  return [
    // The three shafts. The alif stands a little shorter than the lams, which is
    // what stops the group reading as a picket fence.
    { pts: shaft(0.800, 0.286) },
    { pts: shaft(0.676, TOP) },
    { pts: shaft(0.564, TOP) },

    // The baseline they stand on. It stops at the alif rather than running past
    // it, and runs left only as far as the mouth of the heh.
    { pts: [[0.806, BASE - 0.003], [0.452, BASE]], width: 0.050 },

    // The heh: a closed knot, not an open bowl. Drawn as a full ring so it reads
    // as a letter at 48px instead of turning into a crescent.
    { pts: arc(0.352, 0.578, 0.092, 0.097, 0, Math.PI * 2, 30), width: 0.046 },
    // …and the short stroke that ties it back to the lam above.
    { pts: [[0.444, 0.560], [0.470, 0.640]], width: 0.040 },

    // Shadda over the lams: the small w, drawn as one zigzag so it holds together
    // as a single mark instead of breaking into ticks at small sizes.
    { pts: [[0.548, 0.222], [0.578, 0.182], [0.608, 0.222], [0.638, 0.182], [0.668, 0.222]],
      width: 0.036, floor: 0.016 },

    // The dagger alif above it, kept clear of the ring the mark sits inside —
    // at 48px a stroke touching the ring reads as one blob, not two marks.
    { pts: [[0.612, 0.108], [0.608, 0.160]], width: 0.034, floor: 0.017 }
  ]
}

/* ------------------------------ محمد ------------------------------------- */
// mim · ha · mim · dal. The two mims are the small closed rings that give the
// name its rhythm; the ha is the open bowl between them.
export function muhammad() {
  const LINE = 0.620

  return [
    // mim (initial, rightmost): a small closed ring sitting on the line, with the
    // short tail that carries the hand into the next letter.
    { pts: arc(0.822, 0.556, 0.052, 0.050, 0, Math.PI * 2, 24), width: 0.038 },
    { pts: [[0.800, 0.602], [0.752, LINE]], width: 0.038 },

    // ha (ح): a flat shoulder, then the deep bowl that drops below the line and
    // swings back up. This descender is what identifies the letter.
    { pts: quad([0.752, LINE], [0.726, 0.516], [0.664, 0.520], 14), width: 0.044 },
    { pts: quad([0.664, 0.520], [0.600, 0.530], [0.596, 0.626], 16), width: 0.046 },
    { pts: quad([0.596, 0.626], [0.592, 0.724], [0.508, 0.722], 16), width: 0.044 },
    { pts: quad([0.508, 0.722], [0.452, 0.720], [0.446, 0.650], 12), width: 0.038 },

    // mim (medial): the second ring, a touch smaller than the first.
    { pts: arc(0.452, 0.570, 0.048, 0.046, 0, Math.PI * 2, 24), width: 0.036 },
    { pts: [[0.446, 0.616], [0.400, LINE]], width: 0.036 },

    // dal (final, leftmost): down from the shoulder, then the turn along the line.
    { pts: quad([0.352, 0.452], [0.268, 0.470], [0.258, 0.570], 14), width: 0.044 },
    { pts: quad([0.258, 0.570], [0.254, 0.622], [0.336, 0.628], 12), width: 0.040 },

    // shadda over the medial mim
    { pts: [[0.400, 0.442], [0.426, 0.404], [0.452, 0.442], [0.478, 0.404], [0.504, 0.442]],
      width: 0.030, floor: 0.014 }
  ]
}

export { BASE, TOP }
