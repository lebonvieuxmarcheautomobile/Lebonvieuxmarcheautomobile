import { html, mount, fmtDate } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { nextTechnicalInspection, serviceReminders } from '../lib/maintenance.js';

const SECTIONS = [
  { href: '#achat', icon: '✅', title: 'Acheter une voiture', text: 'Check-list complète : documents, points à contrôler, essai, paiement, formalités.' },
  { href: '#vehicule', icon: '🔎', title: 'Infos par immatriculation', text: 'Caractéristiques techniques, campagnes de rappel et défauts connus du modèle.' },
  { href: '#diagnostic', icon: '🔌', title: 'Diagnostic OBD', text: 'Avec un adaptateur ELM327 à ~20 € : codes défaut, données moteur, contrôle avant achat.' },
  { href: '#carnet', icon: '📘', title: 'Carnet d’entretien', text: 'Entretiens, réparations, contrôles techniques et rappels d’échéances.' },
  { href: '#atelier', icon: '🧰', title: 'Pièces & tutos', text: 'Catalogue de pièces Carter-Cash et tutos pour le montage soi-même.' },
];

export function render(el) {
  const vehicles = store.vehicles();
  const alerts = [];
  for (const v of vehicles) {
    const entries = store.entries(v.id);
    const ct = nextTechnicalInspection(v, entries.filter((e) => e.type === 'ct').map((e) => e.ct || {}).filter((c) => c.date));
    if (ct.status === 'depasse' || ct.status === 'bientot') alerts.push({ v, label: ct.label, status: ct.status, when: fmtDate(ct.due) });
    for (const r of serviceReminders(v, entries)) {
      if (r.status === 'depasse' || r.status === 'bientot') alerts.push({ v, label: r.label, status: r.status, when: r.due ? fmtDate(r.due) : `${r.dueKm} km` });
    }
  }

  mount(
    el,
    html`
      <section class="hero">
        <h1>Votre voiture, de l’achat à l’entretien</h1>
        <p>Vérifiez avant d’acheter, comprenez les voyants, suivez l’entretien et réparez vous-même.</p>
      </section>

      ${alerts.length
        ? html`<section class="card">
            <h2>À prévoir</h2>
            <ul class="list">
              ${alerts.map(
                (a) => html`<li>
                  <a href="#carnet-${a.v.id}" class="row">
                    <span class="pill ${a.status}">${a.status === 'depasse' ? 'Dépassé' : 'Bientôt'}</span>
                    <span><strong>${a.label}</strong><br /><small>${a.v.name || a.v.model} · ${a.when}</small></span>
                  </a>
                </li>`,
              )}
            </ul>
          </section>`
        : ''}

      <section class="grid">
        ${SECTIONS.map(
          (s) => html`<a class="tile" href="${s.href}">
            <span class="tile-icon" aria-hidden="true">${s.icon}</span>
            <strong>${s.title}</strong>
            <span>${s.text}</span>
          </a>`,
        )}
      </section>

      <p class="fineprint">
        Les informations fournies sont indicatives et ne remplacent pas l’avis d’un professionnel. Les données de
        votre carnet restent sur votre appareil.
      </p>
    `,
  );
}
