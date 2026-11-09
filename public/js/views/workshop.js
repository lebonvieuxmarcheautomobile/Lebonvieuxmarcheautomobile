import { html, raw, mount, $ } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { CATALOGUE, shopSearchUrl } from '../data/catalogue.js';
import { TUTORIALS, DIFFICULTY_LABEL } from '../data/tutorials.js';

const EXT = raw('target="_blank" rel="noopener"');
const itemsById = Object.fromEntries(CATALOGUE.flatMap((c) => c.items).map((i) => [i.id, i]));
const tutoById = Object.fromEntries(TUTORIALS.map((t) => [t.id, t]));

const stars = (n) => html`<span class="difficulty" aria-label="Difficulté ${DIFFICULTY_LABEL[n]}">${'●'.repeat(n)}${'○'.repeat(3 - n)} ${DIFFICULTY_LABEL[n]}</span>`;

function currentVehicle() {
  const id = store.get('workshopVehicle', '');
  const vehicles = store.vehicles();
  return vehicles.find((v) => v.id === id) || (id === 'none' ? undefined : vehicles[0]);
}

function tutoView(el, t) {
  const v = currentVehicle();
  const template = store.settings().shopUrl;
  mount(
    el,
    html`
      <header class="page-head">
        <a href="#atelier-tutos" class="link">← Tous les tutos</a>
        <h1>${t.title}</h1>
        <p>${stars(t.difficulty)} · ⏱ ${t.duration}</p>
      </header>

      ${t.safety.length ? html`<section class="notice warn"><strong>Sécurité</strong><ul>${t.safety.map((s) => html`<li>${s}</li>`)}</ul></section>` : ''}

      <section class="card">
        <h2>Pièces</h2>
        <ul class="list">
          ${t.parts.map((pid) => {
            const p = itemsById[pid];
            return p
              ? html`<li class="row between"><span>${p.name}</span><a class="btn small" href="${shopSearchUrl(template, p.query, v)}" ${EXT}>Carter-Cash ↗</a></li>`
              : '';
          })}
        </ul>
        <h2>Outillage</h2>
        <ul>${t.tools.map((s) => html`<li>${s}</li>`)}</ul>
      </section>

      <section class="card">
        <h2>Étapes</h2>
        <ol class="steps">${t.steps.map((s) => html`<li><label><input type="checkbox" /> <span>${s}</span></label></li>`)}</ol>
      </section>

      ${t.tips.length ? html`<section class="card"><h2>Astuces</h2><ul>${t.tips.map((s) => html`<li>${s}</li>`)}</ul></section>` : ''}

      <div class="actions">
        <a class="btn ghost" href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${v ? `${v.brand} ${v.model}` : ''}`)}" ${EXT}>Voir des vidéos ↗</a>
        <a class="btn primary" href="#carnet${v ? `-${v.id}` : ''}">Noter dans le carnet</a>
      </div>
      <p class="fineprint">Travaux réalisés sous votre responsabilité. Respectez les couples de serrage du constructeur ; en cas de doute sur un organe de sécurité (freins, direction), faites contrôler par un professionnel.</p>
    `,
  );
}

function mainView(el, tab, filter = '') {
  const vehicles = store.vehicles();
  const v = currentVehicle();
  const template = store.settings().shopUrl;
  const f = filter.toLowerCase();
  const matches = (s) => !f || s.toLowerCase().includes(f);

  mount(
    el,
    html`
      <header class="page-head">
        <h1>Pièces & tutos</h1>
        <p>Trouvez la bonne pièce chez Carter-Cash et montez-la vous-même.</p>
      </header>

      <div class="tabs" role="tablist">
        <a role="tab" href="#atelier" aria-selected="${tab === 'catalogue'}">Catalogue</a>
        <a role="tab" href="#atelier-tutos" aria-selected="${tab === 'tutos'}">Tutos montage</a>
      </div>

      <section class="card toolbar">
        <label>Véhicule
          <select id="veh">
            <option value="none" ${!v ? 'selected' : ''}>Aucun (recherche générique)</option>
            ${vehicles.map((x) => html`<option value="${x.id}" ${v?.id === x.id ? 'selected' : ''}>${x.name || `${x.brand} ${x.model}`}</option>`)}
          </select>
        </label>
        <label>Filtrer<input id="filter" type="search" value="${filter}" placeholder="${tab === 'catalogue' ? 'plaquettes, batterie…' : 'vidange, roue…'}" /></label>
      </section>

      ${tab === 'catalogue'
        ? CATALOGUE.map((cat) => {
            const items = cat.items.filter((i) => matches(`${i.name} ${i.tip} ${cat.title}`));
            if (!items.length) return '';
            return html`<section class="card">
              <h2><span aria-hidden="true">${cat.icon}</span> ${cat.title}</h2>
              <ul class="catalogue">
                ${items.map(
                  (i) => html`<li>
                    <div>
                      <strong>${i.name}</strong>
                      <p class="small muted">${i.tip}</p>
                      ${i.tutos.length ? html`<p class="small">${i.tutos.map((tid) => html`<a class="link" href="#atelier-tuto-${tid}">🔧 ${tutoById[tid]?.title}</a> `)}</p>` : ''}
                    </div>
                    <a class="btn small" href="${shopSearchUrl(template, i.query, v)}" ${EXT}>Voir chez Carter-Cash ↗</a>
                  </li>`,
                )}
              </ul>
            </section>`;
          })
        : html`<ul class="tuto-grid">
            ${TUTORIALS.filter((t) => matches(`${t.title} ${t.steps.join(' ')}`)).map(
              (t) => html`<li><a class="card tuto" href="#atelier-tuto-${t.id}">
                <strong>${t.title}</strong>
                <span class="small">${stars(t.difficulty)}</span>
                <span class="small muted">⏱ ${t.duration}</span>
              </a></li>`,
            )}
          </ul>`}

      <p class="fineprint">Les liens ouvrent une recherche sur le site carter-cash.com, où se trouvent prix, stock et compatibilité exacte. Le Bon Vieux Marché Automobile n’est pas affilié à Carter-Cash.</p>
    `,
  );
}

export function render(el, params) {
  const [sub, id] = params;
  if (sub === 'tuto') {
    const t = tutoById[id];
    if (!t) {
      location.hash = '#atelier-tutos';
      return;
    }
    tutoView(el, t);
    return;
  }
  const tab = sub === 'tutos' ? 'tutos' : 'catalogue';
  let filter = '';
  mainView(el, tab, filter);

  const onInput = (e) => {
    if (e.target.id === 'filter') {
      filter = e.target.value;
      mainView(el, tab, filter);
      const input = $('#filter', el);
      input.focus();
      input.setSelectionRange(filter.length, filter.length);
    }
  };
  const onChange = (e) => {
    if (e.target.id === 'veh') {
      store.set('workshopVehicle', e.target.value);
      mainView(el, tab, filter);
    }
  };
  el.addEventListener('input', onInput);
  el.addEventListener('change', onChange);
  return () => {
    el.removeEventListener('input', onInput);
    el.removeEventListener('change', onChange);
  };
}
