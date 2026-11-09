import { html, raw, mount, $, formData, toast, uid } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { normalizePlate, formatPlateAsTyped, extractPlate } from '../lib/plate.js';
import { normalizeVin, decodeVinLocally, decodeVinOnline } from '../lib/vin.js';
import { fetchRecalls } from '../lib/recalls.js';
import { matchDefects } from '../lib/defects.js';
import { KNOWN_DEFECTS } from '../data/known-defects.js';
import { DEMO_VEHICLES } from '../data/demo-vehicles.js';

const SEVERITY = { critique: 'Critique', elevee: 'Élevée', moyenne: 'Moyenne', faible: 'Faible' };
const EXT = raw('target="_blank" rel="noopener"');

async function lookupPlate(formatted) {
  try {
    const res = await fetch(`/api/vehicle?plate=${encodeURIComponent(formatted)}`);
    const type = res.headers.get('content-type') || '';
    if (type.includes('json')) {
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error || 'Recherche impossible.'), { handled: true });
      return data.vehicle;
    }
  } catch (err) {
    if (err.handled) throw err;
  }
  // Pas de serveur (hébergement statique) : mode démo local.
  const demo = DEMO_VEHICLES[formatted];
  if (demo) return { ...demo, plate: formatted, source: 'Démo' };
  throw new Error('Recherche par plaque indisponible sur cette installation. Utilisez l’identification manuelle ci-dessous.');
}

const specRows = (v) =>
  [
    ['Marque', v.brand],
    ['Modèle', v.model],
    ['Version', v.version],
    ['Motorisation', v.engine],
    ['Énergie', v.fuel],
    ['Cylindrée', v.engineSize && /^\d+$/.test(v.engineSize) ? `${v.engineSize} cm³` : v.engineSize],
    ['Puissance', v.powerHp ? `${v.powerHp} ch` : undefined],
    ['Puissance fiscale', v.fiscalHp ? `${v.fiscalHp} CV` : undefined],
    ['Boîte', v.gearbox],
    ['Carrosserie', v.body],
    ['Année', v.year],
    ['1re immatriculation', v.firstRegistration],
    ['CO₂', v.co2 ? `${v.co2} g/km` : undefined],
    ['VIN', v.vin],
  ].filter(([, val]) => val);

function defectCard({ defect: d, confidence }) {
  return html`<article class="defect sev-${d.severity}">
    <header>
      <span class="pill sev-${d.severity}">${SEVERITY[d.severity]}</span>
      ${confidence === 'a-verifier' ? html`<span class="pill">À vérifier</span>` : ''}
      <h3>${d.title}</h3>
    </header>
    <p class="muted">${d.component}${d.years ? ` · ${d.years[0]}–${d.years[1]}` : ''}</p>
    <details>
      <summary>Symptômes, contrôles et solution</summary>
      <h4>Symptômes</h4>
      <ul>${d.symptoms.map((s) => html`<li>${s}</li>`)}</ul>
      <h4>À contrôler avant d’acheter</h4>
      <ul>${d.checks.map((s) => html`<li>${s}</li>`)}</ul>
      <h4>Solution</h4>
      <p>${d.remedy}</p>
    </details>
  </article>`;
}

function recallCard(r) {
  return html`<article class="recall">
    <header>
      ${r.mentionsModel ? html`<span class="pill depasse">Modèle cité</span>` : html`<span class="pill">Même marque</span>`}
      <strong>${r.brand || ''} ${r.models || ''}</strong>
    </header>
    ${r.reason ? html`<p><strong>Motif :</strong> ${r.reason}</p>` : ''}
    ${r.risks ? html`<p><strong>Risques :</strong> ${r.risks}</p>` : ''}
    ${r.action ? html`<p><strong>Que faire :</strong> ${r.action}</p>` : ''}
    <p class="muted">${r.date ? `Publié le ${new Date(r.date).toLocaleDateString('fr-FR')}` : ''}
      ${r.url ? html` · <a href="${r.url}" ${EXT}>Fiche officielle →</a>` : ''}</p>
  </article>`;
}

export function render(el) {
  let current = store.lastLookup();

  const draw = () => {
    mount(
      el,
      html`
        <header class="page-head">
          <h1>Infos véhicule</h1>
          <p>Saisissez l’immatriculation pour obtenir les caractéristiques techniques, les rappels et les défauts connus.
            <strong>Aucune information sur le propriétaire n’est consultée ni affichée.</strong></p>
        </header>

        <form class="card plate-form" id="plate-form" autocomplete="off">
          <label for="plate" class="sr-only">Immatriculation</label>
          <div class="plate-input">
            <span class="eu" aria-hidden="true">F</span>
            <input id="plate" name="plate" inputmode="text" autocapitalize="characters" spellcheck="false"
              placeholder="AB-123-CD" maxlength="12" value="${current?.vehicle?.plate || ''}" />
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">Rechercher</button>
            <button class="btn" type="button" data-act="paste">Coller depuis Immat Scanner</button>
          </div>
          <p class="muted small">Démo : ${Object.keys(DEMO_VEHICLES).join(' · ')}</p>
          <details>
            <summary class="small"><strong>Utiliser avec Immat Scanner</strong></summary>
            <ol class="small">
              <li>Installez cette application sur l’écran d’accueil (menu de Chrome → « Installer l’application »).</li>
              <li>Dans Immat Scanner, scannez la plaque puis touchez <strong>Partager</strong> et choisissez <strong>AUTOnomie</strong> : la recherche se lance automatiquement.</li>
              <li>Ou copiez le résultat dans Immat Scanner, revenez ici et touchez <strong>Coller depuis Immat Scanner</strong>.</li>
            </ol>
          </details>
        </form>

        <details class="card" id="manual">
          <summary><strong>Pas de résultat ? Identifier manuellement ou par VIN</strong></summary>
          <form id="vin-form" class="stack">
            <label>VIN (champ E de la carte grise)
              <input name="vin" maxlength="17" autocapitalize="characters" spellcheck="false" placeholder="17 caractères" />
            </label>
            <button class="btn" type="submit">Décoder le VIN</button>
          </form>
          <hr />
          <form id="manual-form" class="stack">
            <div class="two">
              <label>Marque<input name="brand" required placeholder="Peugeot" /></label>
              <label>Modèle<input name="model" required placeholder="308" /></label>
            </div>
            <div class="two">
              <label>Année<input name="year" type="number" min="1950" max="2100" placeholder="2016" /></label>
              <label>Énergie
                <select name="fuel"><option value="">—</option><option>Essence</option><option>Diesel</option><option>Hybride</option><option>Électrique</option><option>GPL</option></select>
              </label>
            </div>
            <label>Motorisation / version<input name="engine" placeholder="1.2 PureTech 130, 1.6 BlueHDi 120…" /></label>
            <label>Boîte<input name="gearbox" placeholder="Manuelle, EAT8, DSG7, EDC…" /></label>
            <button class="btn primary" type="submit">Afficher rappels et défauts connus</button>
          </form>
        </details>

        <div id="result">${current ? resultView(current.vehicle) : ''}</div>
      `,
    );
    if (current) loadRecalls(current.vehicle);
  };

  const resultView = (v) => {
    const defects = matchDefects(v, KNOWN_DEFECTS);
    return html`
      <section class="card">
        <div class="result-head">
          <div>
            <h2>${v.brand} ${v.model}</h2>
            <p class="muted">${v.version || v.engine || ''}${v.plate ? ` · ${v.plate}` : ''}${v.source ? ` · source : ${v.source}` : ''}</p>
          </div>
          <button class="btn" data-act="add">+ Carnet</button>
        </div>
        <dl class="specs">${specRows(v).map(([k, val]) => html`<div><dt>${k}</dt><dd>${val}</dd></div>`)}</dl>
        <div class="actions">
          <a class="btn ghost" href="#atelier">Pièces pour ce véhicule</a>
          <a class="btn ghost" href="#achat">Check-list d’achat</a>
        </div>
      </section>

      <section class="card">
        <h2>Campagnes de rappel</h2>
        <p class="muted small">Source : RappelConso (open data officiel). La correspondance est faite par marque et modèle : confirmez avec le VIN auprès d’un concessionnaire de la marque.</p>
        <div id="recalls" aria-live="polite"><p class="loading">Recherche des rappels…</p></div>
      </section>

      <section class="card">
        <h2>Défauts connus</h2>
        ${defects.length
          ? html`<p class="muted small">${defects.length} défaut(s) documenté(s) pour cette marque / motorisation / période.</p>${defects.map(defectCard)}`
          : html`<p>Aucun défaut majeur répertorié dans notre base pour ce véhicule. Cela ne garantit pas son état : faites les contrôles de la check-list.</p>`}
      </section>
    `;
  };

  async function loadRecalls(v) {
    const box = $('#recalls', el);
    if (!box || !v.brand) return;
    try {
      const recalls = await fetchRecalls({ brand: v.brand, model: v.model });
      if (!$('#recalls', el)) return;
      mount(
        box,
        recalls.length
          ? html`${recalls.slice(0, 15).map(recallCard)}${recalls.length > 15 ? html`<p class="muted">+ ${recalls.length - 15} autres rappels pour la marque.</p>` : ''}`
          : html`<p>Aucune campagne de rappel publiée trouvée pour ${v.brand} ${v.model}.</p>`,
      );
    } catch (err) {
      mount(box, html`<p class="error">Rappels indisponibles : ${err.message}</p>
        <p><a href="https://rappel.conso.gouv.fr/" ${EXT}>Consulter RappelConso directement →</a></p>`);
    }
  }

  const show = (vehicle) => {
    current = { vehicle, at: Date.now() };
    store.saveLastLookup(current);
    mount($('#result', el), resultView(vehicle));
    loadRecalls(vehicle);
    $('#result', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Lance une recherche à partir d'un texte venant d'une autre application.
  const searchFromText = (text, origin) => {
    const p = extractPlate(text);
    if (!p) return toast(`Aucune immatriculation trouvée dans le texte ${origin}.`, 'error');
    const form = $('#plate-form', el);
    form.plate.value = p.formatted;
    form.requestSubmit();
  };

  draw();

  const onInput = (e) => {
    if (e.target.id === 'plate') e.target.value = formatPlateAsTyped(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('[type=submit]');

    if (form.id === 'plate-form') {
      const p = normalizePlate(form.plate.value);
      if (!p.valid) return toast(p.error, 'error');
      btn.disabled = true;
      btn.textContent = 'Recherche…';
      try {
        show(await lookupPlate(p.formatted));
      } catch (err) {
        toast(err.message, 'error');
        $('#manual', el).open = true;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Rechercher';
      }
    }

    if (form.id === 'vin-form') {
      const r = normalizeVin(form.vin.value);
      if (!r.valid) return toast(r.error, 'error');
      const local = decodeVinLocally(r.vin);
      const mf = $('#manual-form', el);
      if (local.brand) mf.brand.value = local.brand;
      btn.disabled = true;
      try {
        const online = await decodeVinOnline(r.vin);
        if (online.brand && !local.brand) mf.brand.value = online.brand;
        if (online.model) mf.model.value = online.model;
        if (online.year) mf.year.value = online.year;
        else if (local.yearHint) mf.year.value = local.yearHint;
        toast('VIN décodé : complétez la motorisation si besoin.');
      } catch {
        if (local.yearHint) mf.year.value = local.yearHint;
        toast(local.brand ? `Constructeur : ${local.brand}. Complétez le modèle.` : 'VIN non reconnu, complétez à la main.');
      } finally {
        btn.disabled = false;
      }
      mf.dataset.vin = r.vin;
    }

    if (form.id === 'manual-form') {
      const d = formData(form);
      show({ ...d, year: d.year ? Number(d.year) : undefined, vin: form.dataset.vin, source: 'Saisie manuelle' });
    }
  };

  const onClick = async (e) => {
    if (e.target.closest('[data-act="paste"]')) {
      try {
        searchFromText(await navigator.clipboard.readText(), 'copié');
      } catch {
        toast('Accès au presse-papiers refusé : collez la plaque dans le champ.', 'error');
        $('#plate', el).focus();
      }
      return;
    }
    if (e.target.closest('[data-act="add"]') && current) {
      const v = current.vehicle;
      const vehicles = store.vehicles();
      if (v.plate && vehicles.some((x) => x.plate === v.plate)) return toast('Ce véhicule est déjà dans votre carnet.');
      const id = uid();
      const fr = String(v.firstRegistration || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      vehicles.push({
        id,
        name: `${v.brand} ${v.model}`,
        brand: v.brand,
        model: v.model,
        version: v.version || v.engine,
        engine: v.engine,
        gearbox: v.gearbox,
        fuel: v.fuel,
        year: v.year,
        plate: v.plate,
        vin: v.vin,
        firstRegistration: fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : '',
        mileage: '',
      });
      store.saveVehicles(vehicles);
      toast('Ajouté au carnet');
      location.hash = `#carnet-${id}`;
    }
  };

  el.addEventListener('input', onInput);
  el.addEventListener('submit', onSubmit);
  el.addEventListener('click', onClick);

  // Plaque partagée depuis une autre application : recherche une fois les écouteurs en place.
  let pendingShare;
  try {
    pendingShare = sessionStorage.getItem('lbvma:shared');
    sessionStorage.removeItem('lbvma:shared');
  } catch {
    /* stockage indisponible */
  }
  if (pendingShare) searchFromText(pendingShare, 'partagé');

  return () => {
    el.removeEventListener('input', onInput);
    el.removeEventListener('submit', onSubmit);
    el.removeEventListener('click', onClick);
  };
}
