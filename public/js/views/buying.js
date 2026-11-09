import { html, raw, mount, $, $$, toast, ask, isEmbedded, formData } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { BUYING_GUIDE } from '../data/buying-guide.js';
import { scorePurchase, CHECK_IMPACT } from '../lib/scoring.js';

const EXT = raw('target="_blank" rel="noopener"');
const ITEMS = BUYING_GUIDE.flatMap((s) => s.items);
const isControl = (id) => id in CHECK_IMPACT;

const HISTOVEC_FIELDS = {
  sinistre: { label: 'Sinistre déclaré', options: { aucun: 'Aucun', repare: 'Oui, réparé', grave: 'Véhicule gravement endommagé (VGE)' } },
  gage: { label: 'Gage', options: { non: 'Non', oui: 'Oui' } },
  opposition: { label: 'Opposition / vol', options: { non: 'Non', oui: 'Oui' } },
  kmCoherent: { label: 'Kilométrage cohérent avec les CT', options: { oui: 'Oui', non: 'Non' } },
  lastCt: { label: 'Dernier contrôle technique', options: { favorable: 'Favorable', 'contre-visite': 'Contre-visite', critique: 'Défaillance critique' } },
};

/** Charge le dossier d'achat (et reprend l'ancienne check-list cochée). */
function loadPurchase() {
  const saved = store.get('purchase', null);
  if (saved) return { vehicle: {}, histovec: {}, checks: {}, ...saved };
  const old = store.checklist();
  const checks = {};
  for (const [id, v] of Object.entries(old)) if (v) checks[id] = isControl(id) ? 'ok' : true;
  return { vehicle: {}, histovec: {}, checks };
}

const fmt = (n) => (n === null || n === undefined ? '—' : String(n).replace('.', ','));

function gauge(label, value, hint) {
  const pct = value === null ? 0 : (value / 20) * 100;
  const tone = value === null ? '' : value >= 14 ? 'ok' : value >= 10 ? 'bientot' : 'depasse';
  return html`<div class="subscore">
    <div class="row between"><span>${label}</span><strong>${fmt(value)}<small>/20</small></strong></div>
    <div class="bar ${tone}"><span style="width:${pct}%"></span></div>
    ${hint ? html`<small class="muted">${hint}</small>` : ''}
  </div>`;
}

function scoreCard(r, started) {
  if (!started) {
    return html`<section class="card score-card empty-score">
      <h2>Note du véhicule</h2>
      <p>Renseignez le véhicule, le rapport HistoVec et marquez chaque contrôle <strong>Conforme</strong> ou <strong>Défaut</strong> : l’application calcule une note sur 20 (fiabilité, rapport qualité-prix, bonne affaire).</p>
    </section>`;
  }
  return html`<section class="card score-card" aria-live="polite">
    <div class="score-head">
      <div class="score-big tone-${r.tone}"><strong>${fmt(r.global)}</strong><span>/20</span></div>
      <div>
        <span class="pill ${r.tone}">${r.verdict}</span>
        ${r.provisional ? html` <span class="pill">Note provisoire</span>` : ''}
        <p class="small muted">${r.evaluated}/${r.totalControls} contrôles évalués${r.qp === null ? ' · prix non renseigné' : ''}</p>
      </div>
    </div>
    ${gauge('Fiabilité', r.fiab, 'État constaté, HistoVec, kilométrage, défauts connus du modèle')}
    ${gauge('Rapport qualité-prix', r.qp, r.ratio ? `Prix demandé = ${Math.round(r.ratio * 100)} % du prix du marché` : 'Renseignez le prix demandé et le prix du marché')}
    ${r.blocking.length ? html`<div class="notice bad"><strong>Rédhibitoire</strong><ul>${r.blocking.map((b) => html`<li>${b}</li>`)}</ul></div>` : ''}
    ${r.warnings.length ? html`<div class="notice warn"><ul>${r.warnings.map((w) => html`<li>${w}</li>`)}</ul></div>` : ''}
    <details>
      <summary><strong>Détail de la note</strong></summary>
      ${r.negatives.length
        ? html`<h3>Points faibles</h3><ul class="reasons">${r.negatives.map(
            (n) => {
              const impact = [n.fiab ? `−${fmt(n.fiab)} fiabilité` : '', n.qp ? `−${fmt(n.qp)} prix` : ''].filter(Boolean).join(' · ');
              return html`<li>${n.label}${impact ? html` <small class="muted">(${impact})</small>` : ''}</li>`;
            },
          )}</ul>`
        : ''}
      ${r.positives.length ? html`<h3>Points forts</h3><ul>${r.positives.map((p) => html`<li>${p}</li>`)}</ul>` : ''}
      ${r.defects.length
        ? html`<h3>Défauts connus du modèle</h3><ul>${r.defects.map((d) => html`<li>${d.defect.title}${d.confidence === 'a-verifier' ? ' (à vérifier)' : ''}</li>`)}</ul>
            <p><a class="link" href="#vehicule">Voir les fiches détaillées →</a></p>`
        : ''}
      ${r.negotiation.length
        ? html`<h3>Arguments de négociation</h3><ul>${r.negotiation.map((n) => html`<li>${n}</li>`)}</ul>`
        : ''}
      <p class="fineprint">Note indicative calculée à partir de vos constats. Elle ne remplace pas l’avis d’un professionnel.</p>
    </details>
  </section>`;
}

const miniScore = (r) =>
  html`<span class="score-mini-note tone-${r.tone}">${fmt(r.global)}<small>/20</small></span><span class="pill ${r.tone}">${r.verdict}</span><span class="small muted">Fiabilité ${fmt(r.fiab)} · Prix ${fmt(r.qp)}</span>`;

function vehicleCard(v) {
  const f = (name, label, attrs = '') => html`<label>${label}<input id="pv-${name}" name="${name}" value="${v[name] ?? ''}" ${raw(attrs)} /></label>`;
  return html`<section class="card">
    <div class="result-head">
      <h2>Le véhicule</h2>
      <button class="btn small ghost" type="button" data-act="from-lookup">Reprendre la dernière plaque</button>
    </div>
    <form id="pv-form" class="stack" autocomplete="off">
      <div class="two">${f('brand', 'Marque')}${f('model', 'Modèle')}</div>
      <div class="two">${f('engine', 'Motorisation', 'placeholder="1.2 PureTech 130…"')}${f('gearbox', 'Boîte', 'placeholder="Manuelle, EAT8…"')}</div>
      <div class="two">${f('year', 'Année', 'type="number" min="1950" max="2100" inputmode="numeric"')}${f('mileage', 'Kilométrage', 'type="number" min="0" inputmode="numeric"')}</div>
      <div class="two">${f('price', 'Prix demandé (€)', 'type="number" min="0" inputmode="numeric"')}${f('marketPrice', 'Prix du marché (€)', 'type="number" min="0" inputmode="numeric"')}</div>
      <p class="small muted">Prix du marché : cote du véhicule ou moyenne d’annonces comparables (même année, kilométrage, finition).</p>
    </form>
  </section>`;
}

function histovecCard(h) {
  return html`<section class="card">
    <div class="result-head">
      <h2>Rapport HistoVec</h2>
      <a class="btn small" href="${h.link || 'https://histovec.interieur.gouv.fr/'}" ${EXT}>${h.link ? 'Ouvrir le rapport ↗' : 'Site HistoVec ↗'}</a>
    </div>
    <p class="small muted">Rapport officiel et gratuit du ministère de l’Intérieur. Demandez au vendeur de vous transmettre son lien, puis reportez ici ce qu’il indique.</p>
    <form id="hv-form" class="stack" autocomplete="off">
      <label>Lien du rapport reçu du vendeur<input id="hv-link" name="link" type="url" inputmode="url" placeholder="https://histovec.interieur.gouv.fr/…" value="${h.link || ''}" /></label>
      <div class="two">
        <label>Nombre de propriétaires<input id="hv-owners" name="owners" type="number" min="1" max="20" inputmode="numeric" value="${h.owners ?? ''}" /></label>
        ${Object.entries(HISTOVEC_FIELDS)
          .slice(0, 1)
          .map(([k, d]) => select(k, d, h[k]))}
      </div>
      <div class="two">${Object.entries(HISTOVEC_FIELDS)
        .slice(1, 3)
        .map(([k, d]) => select(k, d, h[k]))}</div>
      <div class="two">${Object.entries(HISTOVEC_FIELDS)
        .slice(3)
        .map(([k, d]) => select(k, d, h[k]))}</div>
    </form>
  </section>`;
}

function select(name, def, value) {
  return html`<label>${def.label}
    <select id="hv-${name}" name="${name}">
      <option value="">—</option>
      ${Object.entries(def.options).map(([k, l]) => html`<option value="${k}" ${value === k ? 'selected' : ''}>${l}</option>`)}
    </select>
  </label>`;
}

function itemView(i, checks) {
  const v = checks[i.id];
  const link = i.link
    ? html`<a class="link" href="${i.link.url}" ${i.link.url.startsWith('http') ? EXT : ''}>${i.link.label} →</a>`
    : '';
  const text = html`${i.critical ? html`<span class="pill depasse">essentiel</span> ` : ''}${i.text}${i.detail ? html`<small>${i.detail}</small>` : ''}`;
  if (isControl(i.id)) {
    return html`<li class="control ${v === 'ok' ? 'is-ok' : v === 'ko' ? 'is-ko' : ''}">
      <div class="control-text">${text}</div>
      <div class="verdict-btns" role="group" aria-label="Résultat du contrôle">
        <button type="button" class="vbtn ok" data-check="${i.id}" data-val="ok" aria-pressed="${v === 'ok'}">✓ Conforme</button>
        <button type="button" class="vbtn ko" data-check="${i.id}" data-val="ko" aria-pressed="${v === 'ko'}">✗ Défaut</button>
      </div>
      ${link}
    </li>`;
  }
  return html`<li class="${v ? 'done' : ''}">
    <label><input type="checkbox" data-step="${i.id}" ${v ? 'checked' : ''} /><span>${text}</span></label>
    ${link}
  </li>`;
}

export function render(el) {
  const p = loadPurchase();
  const save = () => store.set('purchase', p);
  const started = () => Object.keys(p.checks).some((k) => isControl(k)) || Object.values(p.histovec).some((x) => x) || !!p.vehicle.price;

  const updateScore = () => {
    const r = scorePurchase(p);
    const box = $('#score', el);
    if (box) mount(box, scoreCard(r, started()));
    const mini = $('#score-mini', el);
    if (mini) {
      mount(mini, miniScore(r));
      mini.hidden = !started();
    }
  };

  const draw = () => {
    const done = ITEMS.filter((i) => p.checks[i.id]).length;
    const pct = Math.round((done / ITEMS.length) * 100);
    mount(
      el,
      html`
        <header class="page-head">
          <h1>Acheter une voiture d’occasion</h1>
          <p>Pour chaque contrôle, indiquez <strong>Conforme</strong> ou <strong>Défaut</strong>. La note sur 20 se met à jour au fur et à mesure.</p>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
          <p class="muted">${done} / ${ITEMS.length} points traités</p>
          <div class="actions">
            ${isEmbedded ? '' : html`<button class="btn ghost" data-act="print">Imprimer</button>`}
            <button class="btn ghost" data-act="reset">Nouveau véhicule</button>
          </div>
        </header>

        <div id="score">${scoreCard(scorePurchase(p), started())}</div>
        ${vehicleCard(p.vehicle)}
        ${histovecCard(p.histovec)}

        ${BUYING_GUIDE.map((section) => {
          const sDone = section.items.filter((i) => p.checks[i.id]).length;
          const kos = section.items.filter((i) => p.checks[i.id] === 'ko').length;
          return html`<details class="card section" data-section="${section.id}" ${sDone < section.items.length ? 'open' : ''}>
            <summary>
              <span aria-hidden="true">${section.icon}</span>
              <strong>${section.title}</strong>
              ${kos ? html`<span class="pill depasse">${kos} défaut(s)</span>` : ''}
              <span class="muted">${sDone}/${section.items.length}</span>
            </summary>
            <ul class="checklist">${section.items.map((i) => itemView(i, p.checks))}</ul>
          </details>`;
        })}

        <a id="score-mini" class="score-mini" href="#achat" data-act="to-score" ${started() ? '' : 'hidden'}>${miniScore(scorePurchase(p))}</a>
      `,
    );
  };

  const redraw = () => {
    const open = Object.fromEntries($$('details[data-section]', el).map((d) => [d.dataset.section, d.open]));
    const y = window.scrollY;
    draw();
    $$('details[data-section]', el).forEach((d) => (d.open = open[d.dataset.section] ?? d.open));
    window.scrollTo(0, y);
  };

  draw();

  const onInput = (e) => {
    const form = e.target.form;
    if (!form) return;
    if (form.id === 'pv-form') p.vehicle = formData(form);
    else if (form.id === 'hv-form') p.histovec = formData(form);
    else return;
    save();
    updateScore();
  };

  const onChange = (e) => {
    const id = e.target.dataset?.step;
    if (id) {
      p.checks[id] = e.target.checked || undefined;
      if (!p.checks[id]) delete p.checks[id];
      save();
      redraw();
    } else {
      onInput(e);
    }
  };

  const onClick = async (e) => {
    const btn = e.target.closest('[data-check]');
    if (btn) {
      const { check, val } = btn.dataset;
      if (p.checks[check] === val) delete p.checks[check];
      else p.checks[check] = val;
      save();
      redraw();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'to-score') {
      e.preventDefault();
      $('#score', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (act === 'print') window.print();
    if (act === 'from-lookup') {
      const v = store.lastLookup()?.vehicle;
      if (!v) return toast('Aucune plaque recherchée : utilisez d’abord l’onglet Plaque.', 'error');
      Object.assign(p.vehicle, {
        brand: v.brand || '',
        model: v.model || '',
        engine: v.engine || v.version || '',
        gearbox: v.gearbox || '',
        year: v.year || '',
      });
      save();
      redraw();
      toast(`${v.brand} ${v.model} repris`);
    }
    if (act === 'reset' && (await ask('Effacer le véhicule, le rapport HistoVec et tous les contrôles pour évaluer un nouveau véhicule ?', { ok: 'Tout effacer' }))) {
      p.vehicle = {};
      p.histovec = {};
      p.checks = {};
      save();
      store.saveChecklist({});
      draw();
      toast('Prêt pour un nouveau véhicule');
    }
  };

  el.addEventListener('input', onInput);
  el.addEventListener('change', onChange);
  el.addEventListener('click', onClick);
  return () => {
    el.removeEventListener('input', onInput);
    el.removeEventListener('change', onChange);
    el.removeEventListener('click', onClick);
  };
}
