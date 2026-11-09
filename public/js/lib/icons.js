// Jeu d'icônes au trait (24 × 24), cohérent sur tous les écrans.
// Décoratives par défaut (aria-hidden) : le texte voisin porte le sens.

import { raw } from './dom.js';

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 12.5 2 2 4-4.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  plate: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7v10"/><path d="M10 12h8"/>',
  pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2.1 2.1 0 0 0 3 3l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  car: '<path d="M5 16.5H3.8a.8.8 0 0 1-.8-.8V13l1.8-4.6A2 2 0 0 1 6.7 7h10.6a2 2 0 0 1 1.9 1.4L21 13v2.7a.8.8 0 0 1-.8.8H19"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5"/>',
  seat: '<path d="M8 3.5h3.5a2 2 0 0 1 2 2.2L12.6 14H7.4L6.6 5.7a2 2 0 0 1 1.4-2.2z"/><path d="M5 14h10.5a2 2 0 0 1 2 2v2H5z"/><path d="M7.5 18v3M15 18v3"/>',
  engine: '<path d="M4 10h2l1-2h6l1 2h3v2h2v-2h1v6h-1v-2h-2v3h-3l-2 2H8l-2-2H4z"/><path d="M9 8V6h4v2"/>',
  road: '<path d="M6 21 9.5 3M18 21 14.5 3"/><path d="M12 5v2.5M12 11v2.5M12 17v2.5"/>',
  plug: '<path d="M9 3v4M15 3v4"/><path d="M6 7h12v3a6 6 0 0 1-12 0z"/><path d="M12 16v5"/>',
  euro: '<path d="M17.5 6.5a7 7 0 1 0 0 11"/><path d="M4 10.5h9M4 13.5h9"/>',
  oil: '<path d="M3 10h8l3 3h3.5l3.5-2.5v2.5l-3 4.5H6a3 3 0 0 1-3-3z"/><path d="M7 10V7h4"/><path d="M20.5 16.5c0 .8-.5 1.5-1 1.5s-1-.7-1-1.5.5-1.8 1-2.5c.5.7 1 1.7 1 2.5z"/>',
  brake: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M5.5 6.5A9 9 0 0 1 10 3.8"/><path d="M12 6.5v.01M17.5 12v.01M12 17.5v.01M6.5 12v.01"/>',
  battery: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h2v2M15 7V5h2v2"/><path d="M6.5 13h3M15 11.5v3M13.5 13h3"/>',
  wiper: '<path d="M3.5 18a10 10 0 0 1 17 0"/><path d="m12 18 5.5-9.5"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
  toolbox: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8"/><path d="M3 13h18M10 13v2h4v-2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4.5"/><circle cx="12" cy="13" r="1.3"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
};

/** Icône SVG (HTML sûr). */
export function icon(name, { size = 24, label } = {}) {
  const body = P[name] || P.car;
  const a11y = label ? `role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return raw(
    `<svg class="i i-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`,
  );
}

export const ICON_NAMES = Object.keys(P);
