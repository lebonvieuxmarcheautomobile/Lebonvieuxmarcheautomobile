import { html, raw, mount, $$, toast } from '../lib/dom.js';
import { store } from '../lib/store.js';
import { BUYING_GUIDE } from '../data/buying-guide.js';

const total = BUYING_GUIDE.reduce((n, s) => n + s.items.length, 0);

export function render(el) {
  const state = store.checklist();

  const progress = () => {
    const done = Object.values(state).filter(Boolean).length;
    return { done, pct: Math.round((done / total) * 100) };
  };

  const draw = () => {
    const p = progress();
    const criticalOpen = BUYING_GUIDE.flatMap((s) => s.items).filter((i) => i.critical && !state[i.id]).length;
    mount(
      el,
      html`
        <header class="page-head">
          <h1>Acheter une voiture d’occasion</h1>
          <p>Cochez chaque point au fur et à mesure. Les points <span class="pill depasse">essentiel</span> sont bloquants s’ils ne sont pas conformes.</p>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}">
            <span style="width:${p.pct}%"></span>
          </div>
          <p class="muted">${p.done} / ${total} points vérifiés · ${criticalOpen} essentiel(s) restant(s)</p>
          <div class="actions">
            <button class="btn ghost" data-act="print">Imprimer</button>
            <button class="btn ghost" data-act="reset">Recommencer</button>
          </div>
        </header>

        ${BUYING_GUIDE.map((section) => {
          const sDone = section.items.filter((i) => state[i.id]).length;
          return html`<details class="card section" ${sDone < section.items.length ? 'open' : ''}>
            <summary>
              <span aria-hidden="true">${section.icon}</span>
              <strong>${section.title}</strong>
              <span class="muted">${sDone}/${section.items.length}</span>
            </summary>
            <ul class="checklist">
              ${section.items.map(
                (i) => html`<li class="${state[i.id] ? 'done' : ''}">
                  <label>
                    <input type="checkbox" data-id="${i.id}" ${state[i.id] ? 'checked' : ''} />
                    <span>
                      ${i.critical ? html`<span class="pill depasse">essentiel</span> ` : ''}${i.text}
                      ${i.detail ? html`<small>${i.detail}</small>` : ''}
                    </span>
                  </label>
                  ${i.link
                    ? html`<a class="link" href="${i.link.url}" ${i.link.url.startsWith('http') ? raw('target="_blank" rel="noopener"') : ''}>${i.link.label} →</a>`
                    : ''}
                </li>`,
              )}
            </ul>
          </details>`;
        })}
      `,
    );
  };

  draw();

  const onChange = (e) => {
    const id = e.target.dataset?.id;
    if (!id) return;
    state[id] = e.target.checked;
    store.saveChecklist(state);
    const open = $$('details', el).map((d) => d.open);
    draw();
    $$('details', el).forEach((d, i) => (d.open = open[i]));
  };
  const onClick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'print') window.print();
    if (act === 'reset' && confirm('Effacer toutes les cases cochées ?')) {
      Object.keys(state).forEach((k) => delete state[k]);
      store.saveChecklist(state);
      draw();
      toast('Check-list réinitialisée');
    }
  };
  el.addEventListener('change', onChange);
  el.addEventListener('click', onClick);
  return () => {
    el.removeEventListener('change', onChange);
    el.removeEventListener('click', onClick);
  };
}
