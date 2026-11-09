import { html, raw, mount, $, toast, isEmbedded } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';

export const HISTOVEC_HOME = 'https://histovec.interieur.gouv.fr/';
const EXT = raw('target="_blank" rel="noopener"');

/** N'accepte que des adresses du site officiel HistoVec. */
export function histovecUrl(input) {
  try {
    const u = new URL(String(input || '').trim());
    return u.protocol === 'https:' && u.hostname === 'histovec.interieur.gouv.fr' ? u.href : null;
  } catch {
    return null;
  }
}

export function render(el) {
  const purchase = store.get('purchase', null) || { vehicle: {}, histovec: {}, checks: {} };
  let url = histovecUrl(purchase.histovec?.link) || HISTOVEC_HOME;

  const draw = () => {
    mount(
      el,
      html`
        <a class="back" href="#achat">${icon('arrow-left', { size: 20 })} Retour à l’achat</a>
        <header class="page-head">
          <span class="eyebrow">${icon('shield', { size: 16 })} Service officiel du ministère de l’Intérieur</span>
          <h1>Rapport HistoVec</h1>
          <p>Collez le lien envoyé par le vendeur : le rapport s’affiche ci-dessous, sans quitter l’application. Reportez ensuite ce qu’il indique dans la fiche HistoVec de l’onglet Achat.</p>
        </header>

        <form class="card hv-bar" id="hv-open" autocomplete="off">
          <label for="hv-url">Lien du rapport</label>
          <div class="hv-row">
            <input id="hv-url" name="url" type="url" inputmode="url" placeholder="https://histovec.interieur.gouv.fr/…" value="${url === HISTOVEC_HOME ? '' : url}" />
            <button class="btn primary" type="submit">Afficher</button>
          </div>
        </form>

        ${isEmbedded
          ? html`<section class="card notice warn">
              <strong>Affichage intégré indisponible ici.</strong>
              <p>Cet aperçu ne peut pas afficher d’autres sites. Dans l’application installée sur votre téléphone, le rapport s’affiche directement sur cet écran.</p>
              <a class="btn" href="${url}" ${EXT}>Ouvrir HistoVec ${icon('external', { size: 18 })}</a>
            </section>`
          : html`<section class="hv-frame-wrap">
              <iframe
                class="hv-frame"
                title="Rapport HistoVec"
                src="${url}"
                referrerpolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
              ></iframe>
            </section>
            <p class="small muted hv-help">
              La page reste vide ? Le site officiel peut refuser d’être affiché dans une autre application.
              <a class="link" href="${url}" ${EXT}>Ouvrir HistoVec ${icon('external', { size: 16 })}</a>
            </p>`}

        <div class="actions">
          <a class="btn brand" href="#achat">${icon('clipboard', { size: 20 })} Reporter dans la fiche HistoVec</a>
        </div>
      `,
    );
  };

  draw();

  const onSubmit = (e) => {
    if (e.target.id !== 'hv-open') return;
    e.preventDefault();
    const next = histovecUrl(e.target.url.value);
    if (!next) return toast('Collez un lien du site officiel histovec.interieur.gouv.fr.', 'error');
    url = next;
    purchase.histovec = { ...purchase.histovec, link: next };
    store.set('purchase', purchase);
    draw();
    $('.hv-frame', el)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  el.addEventListener('submit', onSubmit);
  return () => el.removeEventListener('submit', onSubmit);
}
