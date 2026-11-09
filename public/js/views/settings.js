import { html, mount, toast, ask, isEmbedded } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { DEFAULT_SHOP_URL } from '../data/catalogue.js';

export function render(el) {
  const draw = (serverInfo) => {
    const s = store.settings();
    mount(
      el,
      html`
        <header class="page-head">
          <h1>Réglages & sauvegarde</h1>
        </header>

        <section class="card">
          <h2>Sauvegarde du carnet</h2>
          <p>Vos véhicules et interventions sont enregistrés uniquement sur cet appareil. Exportez-les régulièrement ou pour les transférer sur un autre téléphone.</p>
          ${isEmbedded ? html`<p class="notice">L’export de fichier n’est pas disponible dans cet aperçu : ouvrez l’application installée pour exporter.</p>` : ''}
          <div class="actions">
            ${isEmbedded ? '' : html`<button class="btn primary" data-act="export">Exporter (.json)</button>`}
            <label class="btn">Importer<input type="file" accept="application/json,.json" id="import" hidden /></label>
          </div>
        </section>

        <section class="card">
          <h2>Recherche de pièces</h2>
          <form id="shop-form" class="stack">
            <label>Modèle d’adresse de recherche ({q} = mots-clés)
              <input name="shopUrl" value="${s.shopUrl || DEFAULT_SHOP_URL}" />
            </label>
            <div class="actions">
              <button class="btn">Enregistrer</button>
              <button class="btn ghost" type="button" data-act="reset-shop">Valeur par défaut</button>
            </div>
          </form>
        </section>

        <section class="card">
          <h2>Serveur</h2>
          <p>${serverInfo
            ? html`Recherche par plaque : <strong>${serverInfo.plateProvider === 'demo' ? 'mode démo' : serverInfo.plateProvider}</strong>`
            : 'Application hébergée sans serveur : recherche par plaque en mode démo uniquement.'}</p>
        </section>

        <section class="card">
          <h2>Données</h2>
          <button class="btn danger" data-act="wipe">Effacer toutes les données de l’application</button>
        </section>
      `,
    );
  };

  draw();
  fetch('/api/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((info) => info && el.isConnected && draw(info))
    .catch(() => {});

  const onClick = async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `carnet-auto-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (act === 'reset-shop') {
      store.saveSettings({ shopUrl: '' });
      draw();
      toast('Adresse réinitialisée');
    }
    if (act === 'wipe' && (await ask('Effacer définitivement véhicules, historique et check-list ?', { ok: 'Tout effacer' }))) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('lbvma:'))
        .forEach((k) => localStorage.removeItem(k));
      toast('Données effacées');
      draw();
    }
  };

  const onChange = async (e) => {
    if (e.target.id !== 'import' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!(await ask('Remplacer le carnet actuel par cette sauvegarde ?', { ok: 'Remplacer' }))) return;
      store.importAll(data);
      toast('Sauvegarde importée');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const onSubmit = (e) => {
    if (e.target.id !== 'shop-form') return;
    e.preventDefault();
    const url = e.target.shopUrl.value.trim();
    if (!/^https:\/\/.+\{q\}/.test(url)) return toast('L’adresse doit commencer par https:// et contenir {q}.', 'error');
    store.saveSettings({ shopUrl: url });
    toast('Enregistré');
  };

  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  el.addEventListener('submit', onSubmit);
  return () => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('change', onChange);
    el.removeEventListener('submit', onSubmit);
  };
}
