// The icon drawings offered to the reader. Kept apart from the icon component so
// a settings screen can list them without pulling the whole set in.
//
// The first four are weights of one vector family. "Illustrated" is a different
// thing entirely — rendered, full-colour art for the handful of icons you
// navigate by, falling back to Duotone everywhere else.
export const ICON_STYLES = [
  { id: 'illustrated', label: 'Illustrated' },
  { id: 'duotone', label: 'Duotone' },
  { id: 'solid', label: 'Solid' },
  { id: 'bold', label: 'Bold' },
  { id: 'line', label: 'Line' }
]
