import { html, mount, fmtDate, fmtKm, toast } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { store } from '../lib/store.js';
import { normalizePlate, formatPlateAsTyped } from '../lib/plate.js';
import { nextTechnicalInspection, serviceReminders } from '../lib/maintenance.js';

const SECTIONS = [
  { href: '#achat', icon: 'clipboard', title: 'Acheter une voiture', text: 'Check-list, rapport HistoVec et note du véhicule sur 20.' },
  { href: '#vehicule', icon: 'search', title: 'Vérifier une plaque', text: 'Fiche technique, rappels constructeur et défauts connus.' },
  { href: '#diagnostic', icon: 'plug', title: 'Diagnostic OBD', text: 'Lire les voyants avec un adaptateur à 20 €.' },
  { href: '#carnet', icon: 'book', title: 'Carnet d’entretien', text: 'Entretiens, contrôles techniques et échéances.' },
  { href: '#atelier', icon: 'wrench', title: 'Pièces & tutos', text: 'Trouver la bonne pièce et la monter soi-même.' },
];

const TRUST = [
  { icon: 'shield', title: 'Vos données restent chez vous', text: 'Carnet et contrôles enregistrés sur votre appareil, sans compte.' },
  { icon: 'file', title: 'Sources officielles', text: 'HistoVec, RappelConso et normes OBD2.' },
  { icon: 'check-circle', title: 'Pensé pour tous', text: 'Explications simples, sans jargon, utilisables sur le terrain.' },
];

const STATUS = { depasse: 'Dépassé', bientot: 'Bientôt', ok: 'À jour', inconnu: 'À renseigner' };

function vehicleSummary(v) {
  const entries = store.entries(v.id);
  const ct = nextTechnicalInspection(v, entries.filter((e) => e.type === 'ct').map((e) => e.ct).filter(Boolean));
  const items = [
    { label: ct.label || 'Contrôle technique', status: ct.status, when: ct.due ? fmtDate(ct.due) : '' },
    ...serviceReminders(v, entries).map((r) => ({ label: r.label, status: r.status, when: r.due ? fmtDate(r.due) : r.dueKm ? fmtKm(r.dueKm) : '' })),
  ];
  const urgent = items.filter((i) => i.status === 'depasse' || i.status === 'bientot');
  return html`<a class="card vehicle-card" href="#carnet-${v.id}">
    <div class="card-head">
      <span class="chip-icon">${icon('car')}</span>
      <div>
        <strong class="vc-name">${v.name || `${v.brand} ${v.model}`}</strong>
        <div class="small muted">${[v.plate, v.mileage ? fmtKm(v.mileage) : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <span class="tile-go">${icon('chevron')}</span>
    </div>
    ${urgent.length
      ? html`<ul class="list compact">${urgent.map(
          (i) => html`<li class="row"><span class="pill ${i.status}">${STATUS[i.status]}</span><span>${i.label}${i.when ? html` <small class="muted">· ${i.when}</small>` : ''}</span></li>`,
        )}</ul>`
      : html`<p class="ok-msg small">${icon('check-circle', { size: 20 })} Tout est à jour</p>`}
  </a>`;
}

export function render(el) {
  const vehicles = store.vehicles();

  mount(
    el,
    html`
      <section class="hero" aria-labelledby="hero-title">
        <img class="hero-banner" src="assets/logo-banniere.jpg" width="1206" height="539" alt="AUTOnomie – Le garage solidaire pour une mobilité accessible et durable : entretien et réparation, mobilité solidaire, économie circulaire, insertion et formation" />
        <h1 id="hero-title">Achetez, vérifiez et entretenez votre voiture en confiance</h1>
        <p>Entrez une immatriculation pour connaître les rappels et les défauts connus du modèle.</p>
        <form class="hero-search" id="hero-search" autocomplete="off">
          <label for="hero-plate" class="sr-only">Immatriculation</label>
          <div class="plate-input">
            <span class="eu" aria-hidden="true">F</span>
            <input id="hero-plate" name="plate" placeholder="AB-123-CD" maxlength="12" autocapitalize="characters" spellcheck="false" />
          </div>
          <button class="btn primary" type="submit">${icon('search', { size: 20 })} Vérifier</button>
        </form>
      </section>

      ${vehicles.length
        ? html`<div class="section-title"><h2>Mon garage</h2><a class="link" href="#carnet">Tout voir ${icon('chevron', { size: 18 })}</a></div>
            <div class="grid">${vehicles.slice(0, 4).map(vehicleSummary)}</div>`
        : ''}

      <div class="section-title"><h2>Que voulez-vous faire ?</h2></div>
      <nav class="grid" aria-label="Rubriques">
        ${SECTIONS.map(
          (s) => html`<a class="tile" href="${s.href}">
            <span class="tile-icon">${icon(s.icon)}</span>
            <strong>${s.title}</strong>
            <span class="tile-text">${s.text}</span>
            <span class="tile-go">${icon('chevron')}</span>
          </a>`,
        )}
      </nav>

      <ul class="trust" aria-label="Nos engagements">
        ${TRUST.map(
          (t) => html`<li>
            <span class="chip-icon">${icon(t.icon, { size: 20 })}</span>
            <span><strong>${t.title}</strong><br /><small class="muted">${t.text}</small></span>
          </li>`,
        )}
      </ul>

      <p class="fineprint">Les informations fournies sont indicatives et ne remplacent pas l’avis d’un professionnel.</p>
    `,
  );

  const onInput = (e) => {
    if (e.target.id === 'hero-plate') e.target.value = formatPlateAsTyped(e.target.value);
  };
  const onSubmit = (e) => {
    if (e.target.id !== 'hero-search') return;
    e.preventDefault();
    const p = normalizePlate(e.target.plate.value);
    if (!p.valid) return toast(p.error, 'error');
    try {
      sessionStorage.setItem('lbvma:shared', p.formatted);
    } catch {
      /* stockage indisponible : la plaque sera à ressaisir */
    }
    location.hash = '#vehicule';
  };
  el.addEventListener('input', onInput);
  el.addEventListener('submit', onSubmit);
  return () => {
    el.removeEventListener('input', onInput);
    el.removeEventListener('submit', onSubmit);
  };
}
