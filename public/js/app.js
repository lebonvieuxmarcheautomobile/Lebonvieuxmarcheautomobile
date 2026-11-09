import { $, $$, html, mount } from './lib/dom.js';
import { parseHash } from './lib/router.js';
import * as home from './views/home.js';
import * as buying from './views/buying.js';
import * as vehicle from './views/vehicle.js';
import * as diagnostic from './views/diagnostic.js';
import * as logbook from './views/logbook.js';
import * as workshop from './views/workshop.js';
import * as settings from './views/settings.js';

const ROUTES = {
  accueil: home,
  achat: buying,
  vehicule: vehicle,
  diagnostic,
  carnet: logbook,
  atelier: workshop,
  reglages: settings,
};

let cleanup;


function route() {
  const { name, params } = parseHash(location.hash);
  const view = ROUTES[name] ?? home;
  const el = $('#view');

  if (typeof cleanup === 'function') cleanup();
  cleanup = undefined;

  $$('.tabbar a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === (ROUTES[name] ? name : 'accueil')));
  try {
    cleanup = view.render(el, params);
  } catch (err) {
    console.error(err);
    mount(el, html`<section class="card error"><h2>Oups</h2><p>${err.message}</p></section>`);
  }
  window.scrollTo(0, 0);
  el.focus({ preventScroll: true });
}

// Texte reçu via « Partager » depuis une autre application (ex. Immat Scanner) :
// on le garde pour l'onglet Plaque, qui en extrait l'immatriculation.
const shared = new URLSearchParams(location.search);
const sharedText = ['text', 'title', 'url'].map((k) => shared.get(k)).filter(Boolean).join(' ');
if (sharedText) {
  try {
    sessionStorage.setItem('lbvma:shared', sharedText);
  } catch {
    /* stockage indisponible */
  }
  history.replaceState(null, '', location.pathname + '#vehicule');
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
