// Petits utilitaires d'affichage. Toute valeur interpolée dans html`` est échappée,
// sauf si elle provient elle-même de html`` ou de raw().

class SafeHtml {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const render = (v) => {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
};

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new SafeHtml(out);
}

export const raw = (s) => new SafeHtml(String(s));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function mount(el, content) {
  el.innerHTML = render(content);
}

let toastTimer;
export function toast(message, kind = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

export const fmtKm = (n) => (n || n === 0 ? `${Number(n).toLocaleString('fr-FR')} km` : '—');
export const fmtEur = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** Lit un formulaire en objet simple. */
export function formData(form) {
  const o = {};
  for (const [k, v] of new FormData(form).entries()) o[k] = typeof v === 'string' ? v.trim() : v;
  return o;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/**
 * Demande de confirmation dans la page (remplace window.confirm, bloqué dans certains
 * cadres intégrés). Résout true si l'utilisateur confirme.
 */
export function ask(message, { ok = 'Confirmer', danger = true } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm';
    dlg.innerHTML = `<form method="dialog" class="stack">
      <p></p>
      <div class="actions end">
        <button class="btn ghost" value="non">Annuler</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" value="oui"></button>
      </div>
    </form>`;
    dlg.querySelector('p').textContent = message;
    dlg.querySelector('[value=oui]').textContent = ok;
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'oui');
      dlg.remove();
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}

/** Vrai quand l'application tourne dans un cadre intégré (ex. aperçu Claude). */
export const isEmbedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
