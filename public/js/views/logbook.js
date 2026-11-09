import { html, mount, $, formData, toast, uid, fmtDate, fmtKm, fmtEur } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { nextTechnicalInspection, serviceReminders, totalCost, toIsoDate } from '../lib/maintenance.js';

export const ENTRY_TYPES = {
  vidange: 'Vidange',
  distribution: 'Distribution',
  freins: 'Freinage',
  pneus: 'Pneus',
  batterie: 'Batterie',
  filtres: 'Filtres',
  reparation: 'Réparation',
  ct: 'Contrôle technique',
  autre: 'Autre',
};
const CT_RESULTS = { favorable: 'Favorable', 'contre-visite': 'Défavorable — contre-visite', critique: 'Défaillance critique' };
const STATUS_LABEL = { ok: 'OK', bientot: 'Bientôt', depasse: 'Dépassé', inconnu: 'À renseigner' };

const today = () => toIsoDate(new Date());

function vehicleForm(v = {}) {
  return html`<form method="dialog" class="stack" id="vehicle-form">
    <h2>${v.id ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h2>
    <label>Nom<input name="name" value="${v.name || ''}" placeholder="Ma 208" /></label>
    <div class="two">
      <label>Marque<input name="brand" required value="${v.brand || ''}" /></label>
      <label>Modèle<input name="model" required value="${v.model || ''}" /></label>
    </div>
    <label>Version / motorisation<input name="version" value="${v.version || ''}" /></label>
    <div class="two">
      <label>Immatriculation<input name="plate" value="${v.plate || ''}" autocapitalize="characters" /></label>
      <label>1re immatriculation<input name="firstRegistration" type="date" value="${v.firstRegistration || ''}" /></label>
    </div>
    <div class="two">
      <label>Kilométrage actuel<input name="mileage" type="number" min="0" inputmode="numeric" value="${v.mileage || ''}" /></label>
      <label>VIN<input name="vin" maxlength="17" value="${v.vin || ''}" autocapitalize="characters" /></label>
    </div>
    <fieldset>
      <legend>Intervalles d’entretien (voir carnet constructeur)</legend>
      <div class="two">
        <label>Vidange tous les (km)<input name="oilIntervalKm" type="number" min="0" value="${v.oilIntervalKm || 15000}" /></label>
        <label>ou tous les (mois)<input name="oilIntervalMonths" type="number" min="0" value="${v.oilIntervalMonths || 12}" /></label>
      </div>
      <div class="two">
        <label>Distribution (km)<input name="beltIntervalKm" type="number" min="0" value="${v.beltIntervalKm || ''}" placeholder="ex. 120000" /></label>
        <label>ou (mois)<input name="beltIntervalMonths" type="number" min="0" value="${v.beltIntervalMonths || ''}" placeholder="ex. 72" /></label>
      </div>
    </fieldset>
    <div class="actions end">
      <button class="btn ghost" value="cancel" formnovalidate>Annuler</button>
      <button class="btn primary" value="save">Enregistrer</button>
    </div>
  </form>`;
}

function entryForm(v, e = {}) {
  const ct = e.ct || {};
  return html`<form method="dialog" class="stack" id="entry-form">
    <h2>${e.id ? 'Modifier l’intervention' : 'Nouvelle intervention'}</h2>
    <div class="two">
      <label>Type
        <select name="type" required>
          ${Object.entries(ENTRY_TYPES).map(([k, label]) => html`<option value="${k}" ${e.type === k ? 'selected' : ''}>${label}</option>`)}
        </select>
      </label>
      <label>Date<input name="date" type="date" required value="${e.date || today()}" /></label>
    </div>
    <label>Intitulé<input name="title" value="${e.title || ''}" placeholder="Vidange + filtres, plaquettes AV, liquide de frein…" /></label>
    <div class="two">
      <label>Kilométrage<input name="mileage" type="number" min="0" inputmode="numeric" value="${e.mileage || v.mileage || ''}" /></label>
      <label>Coût (€)<input name="cost" type="number" min="0" step="0.01" inputmode="decimal" value="${e.cost || ''}" /></label>
    </div>
    <label>Garage / fait soi-même<input name="garage" value="${e.garage || ''}" /></label>
    <fieldset class="ct-only">
      <legend>Contrôle technique</legend>
      <div class="two">
        <label>Résultat
          <select name="ctResult">
            ${Object.entries(CT_RESULTS).map(([k, label]) => html`<option value="${k}" ${ct.result === k ? 'selected' : ''}>${label}</option>`)}
          </select>
        </label>
        <label class="check"><input type="checkbox" name="ctCounterVisit" ${ct.counterVisit ? 'checked' : ''} /> Contre-visite</label>
      </div>
      <label>Défaillances relevées<textarea name="ctDefects" rows="3" placeholder="Une par ligne">${ct.defects || ''}</textarea></label>
    </fieldset>
    <label>Notes<textarea name="notes" rows="3">${e.notes || ''}</textarea></label>
    <div class="actions end">
      ${e.id ? html`<button class="btn danger" value="delete" formnovalidate>Supprimer</button>` : ''}
      <button class="btn ghost" value="cancel" formnovalidate>Annuler</button>
      <button class="btn primary" value="save">Enregistrer</button>
    </div>
  </form>`;
}

function openDialog(content, onClose) {
  let dlg = document.getElementById('dlg');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'dlg';
    document.body.append(dlg);
  }
  mount(dlg, content);
  const form = dlg.querySelector('form');
  const syncCt = () => form.querySelector('.ct-only')?.toggleAttribute('hidden', form.type?.value !== 'ct');
  form.addEventListener('change', syncCt);
  syncCt();
  dlg.returnValue = '';
  dlg.onclose = () => onClose(dlg.returnValue, form);
  dlg.showModal();
}

function listView(el) {
  const vehicles = store.vehicles();
  mount(
    el,
    html`
      <header class="page-head">
        <h1>Carnet d’entretien</h1>
        <p>Suivez vos entretiens, réparations et contrôles techniques. Les données restent sur cet appareil (pensez à exporter une sauvegarde dans les réglages).</p>
      </header>
      ${vehicles.length
        ? html`<ul class="vehicle-list">
            ${vehicles.map((v) => {
              const entries = store.entries(v.id);
              const ct = nextTechnicalInspection(v, entries.filter((e) => e.type === 'ct').map((e) => e.ct));
              return html`<li><a class="card vehicle" href="#/carnet/${v.id}">
                <strong>${v.name || `${v.brand} ${v.model}`}</strong>
                <span class="muted">${v.plate || ''} ${v.mileage ? `· ${fmtKm(v.mileage)}` : ''}</span>
                <span><span class="pill ${ct.status}">${ct.label || 'CT'} : ${ct.due ? fmtDate(ct.due) : STATUS_LABEL[ct.status]}</span></span>
              </a></li>`;
            })}
          </ul>`
        : html`<section class="card empty"><p>Aucun véhicule. Ajoutez-en un, ou recherchez-le par sa plaque puis « + Carnet ».</p></section>`}
      <div class="actions">
        <button class="btn primary" data-act="new-vehicle">+ Ajouter un véhicule</button>
        <a class="btn ghost" href="#/vehicule">Rechercher par plaque</a>
      </div>
    `,
  );
}

function detailView(el, v) {
  const entries = store.entries(v.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cts = entries.filter((e) => e.type === 'ct');
  const ct = nextTechnicalInspection(v, cts.map((e) => e.ct));
  const reminders = serviceReminders(v, entries);

  mount(
    el,
    html`
      <header class="page-head">
        <a href="#/carnet" class="link">← Mes véhicules</a>
        <div class="result-head">
          <div>
            <h1>${v.name || `${v.brand} ${v.model}`}</h1>
            <p class="muted">${[v.brand, v.model, v.version].filter(Boolean).join(' · ')}${v.plate ? ` · ${v.plate}` : ''}</p>
          </div>
          <button class="btn ghost" data-act="edit-vehicle">Modifier</button>
        </div>
      </header>

      <section class="card">
        <form class="inline" id="km-form">
          <label>Kilométrage actuel <input name="mileage" type="number" min="0" inputmode="numeric" value="${v.mileage || ''}" /></label>
          <button class="btn">Mettre à jour</button>
        </form>
      </section>

      <section class="card">
        <h2>Échéances</h2>
        <ul class="list">
          <li class="row"><span class="pill ${ct.status}">${STATUS_LABEL[ct.status]}</span>
            <span><strong>${ct.label || 'Contrôle technique'}</strong><br /><small>${ct.due ? `avant le ${fmtDate(ct.due)}` : ct.message}</small></span></li>
          ${reminders.map(
            (r) => html`<li class="row"><span class="pill ${r.status}">${STATUS_LABEL[r.status]}</span>
              <span><strong>${r.label}</strong><br /><small>${r.message ||
              [r.due ? `avant le ${fmtDate(r.due)}` : '', r.dueKm ? `ou à ${fmtKm(r.dueKm)}` : ''].filter(Boolean).join(' ')}</small></span></li>`,
          )}
        </ul>
      </section>

      <section class="card">
        <div class="result-head">
          <h2>Historique</h2>
          <button class="btn primary" data-act="new-entry">+ Ajouter</button>
        </div>
        <p class="muted small">${entries.length} intervention(s) · total ${fmtEur(totalCost(entries))}</p>
        ${entries.length
          ? html`<ol class="timeline">
              ${entries.map(
                (e) => html`<li>
                  <button class="entry" data-entry="${e.id}">
                    <span class="date">${fmtDate(e.date)}</span>
                    <span>
                      <strong>${ENTRY_TYPES[e.type] || e.type}${e.title ? ` — ${e.title}` : ''}</strong>
                      ${e.type === 'ct' && e.ct ? html`<span class="pill ${e.ct.result === 'favorable' ? 'ok' : 'depasse'}">${e.ct.counterVisit ? 'Contre-visite : ' : ''}${CT_RESULTS[e.ct.result]}</span>` : ''}
                      <small class="muted">${[e.mileage ? fmtKm(e.mileage) : '', e.garage, e.cost ? fmtEur(e.cost) : ''].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                </li>`,
              )}
            </ol>`
          : html`<p class="empty">Aucune intervention enregistrée.</p>`}
      </section>

      <div class="actions">
        <a class="btn ghost" href="#/atelier">Pièces & tutos</a>
        <button class="btn danger ghost" data-act="delete-vehicle">Supprimer ce véhicule</button>
      </div>
    `,
  );
}

const numOrEmpty = (s) => (s === '' || s === undefined ? '' : Number(s));

export function render(el, [id]) {
  const draw = () => {
    const v = id && store.vehicles().find((x) => x.id === id);
    if (id && !v) {
      location.hash = '#/carnet';
      return;
    }
    if (v) detailView(el, v);
    else listView(el);
  };

  const saveVehicle = (data, existing) => {
    const vehicles = store.vehicles();
    const v = {
      ...existing,
      ...data,
      id: existing?.id || uid(),
      mileage: numOrEmpty(data.mileage),
      oilIntervalKm: numOrEmpty(data.oilIntervalKm),
      oilIntervalMonths: numOrEmpty(data.oilIntervalMonths),
      beltIntervalKm: numOrEmpty(data.beltIntervalKm),
      beltIntervalMonths: numOrEmpty(data.beltIntervalMonths),
      plate: (data.plate || '').toUpperCase(),
      vin: (data.vin || '').toUpperCase(),
    };
    const i = vehicles.findIndex((x) => x.id === v.id);
    if (i >= 0) vehicles[i] = v;
    else vehicles.push(v);
    store.saveVehicles(vehicles);
    return v;
  };

  const onClick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const entryId = e.target.closest('[data-entry]')?.dataset.entry;
    const v = id && store.vehicles().find((x) => x.id === id);

    if (act === 'new-vehicle' || act === 'edit-vehicle') {
      openDialog(vehicleForm(act === 'edit-vehicle' ? v : {}), (rv, form) => {
        if (rv !== 'save') return;
        const saved = saveVehicle(formData(form), act === 'edit-vehicle' ? v : undefined);
        toast('Véhicule enregistré');
        if (act === 'new-vehicle') location.hash = `#/carnet/${saved.id}`;
        else draw();
      });
    }

    if (act === 'delete-vehicle' && v && confirm(`Supprimer « ${v.name || v.model} » et tout son historique ?`)) {
      store.saveVehicles(store.vehicles().filter((x) => x.id !== v.id));
      store.saveEntries(store.allEntries().filter((x) => x.vehicleId !== v.id));
      toast('Véhicule supprimé');
      location.hash = '#/carnet';
    }

    if ((act === 'new-entry' || entryId) && v) {
      const existing = entryId ? store.allEntries().find((x) => x.id === entryId) : undefined;
      openDialog(entryForm(v, existing), (rv, form) => {
        let all = store.allEntries();
        if (rv === 'delete' && existing) {
          if (!confirm('Supprimer cette intervention ?')) return;
          store.saveEntries(all.filter((x) => x.id !== existing.id));
          toast('Intervention supprimée');
          return draw();
        }
        if (rv !== 'save') return;
        const d = formData(form);
        const entry = {
          id: existing?.id || uid(),
          vehicleId: v.id,
          type: d.type,
          date: d.date,
          title: d.title,
          mileage: numOrEmpty(d.mileage),
          cost: numOrEmpty(d.cost),
          garage: d.garage,
          notes: d.notes,
          ct: d.type === 'ct' ? { date: d.date, result: d.ctResult, counterVisit: d.ctCounterVisit === 'on', defects: d.ctDefects } : undefined,
        };
        all = existing ? all.map((x) => (x.id === entry.id ? entry : x)) : [...all, entry];
        store.saveEntries(all);
        // Le kilométrage du véhicule suit la dernière intervention.
        if (entry.mileage && (!v.mileage || entry.mileage > v.mileage)) saveVehicle({ ...v, mileage: entry.mileage }, v);
        toast('Intervention enregistrée');
        draw();
      });
    }
  };

  const onSubmit = (e) => {
    if (e.target.id !== 'km-form') return;
    e.preventDefault();
    const v = store.vehicles().find((x) => x.id === id);
    saveVehicle({ ...v, mileage: e.target.mileage.value }, v);
    toast('Kilométrage mis à jour');
    draw();
  };

  draw();
  el.addEventListener('click', onClick);
  el.addEventListener('submit', onSubmit);
  return () => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('submit', onSubmit);
    $('#dlg')?.close();
  };
}
