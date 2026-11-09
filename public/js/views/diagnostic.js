import { html, mount, $, toast, ask } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { Elm327, PIDS } from '../lib/obd/elm327.js';
import { BleTransport, SerialTransport, SimulatedTransport, capabilities } from '../lib/obd/transports.js';
import { describeDtc } from '../data/dtc-codes.js';
import { store } from '../lib/store.js';

const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isAndroid = () => /Android/i.test(UA);
const isIOS = () => /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
/** Lien Android qui rouvre la page actuelle dans Chrome. */
export const chromeIntentUrl = (href = location.href) => {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
};

const LIVE_PIDS = ['0C', '0D', '05', '04', '11', '0F', '2F', '0B', '06', '07'];
const SEVERITY = {
  1: ['À surveiller', 'ok'],
  2: ['À faire contrôler', 'bientot'],
  3: ['Arrêt conseillé', 'depasse'],
};

// La session survit à la navigation entre onglets.
const session = { elm: null, transport: null, info: null, log: [] };

export function render(el) {
  const caps = capabilities();
  let polling = null;
  let busy = false;

  const draw = () => {
    const connected = !!session.elm;
    mount(
      el,
      html`
        <header class="page-head">
          <h1>Diagnostic OBD</h1>
          <p>Branchez un adaptateur <strong>ELM327</strong> (≈ 20 €) sur la prise OBD (sous le volant), mettez le contact, puis connectez-vous.</p>
        </header>

        <section class="card">
          ${connected
            ? html`<div class="result-head">
                <div>
                  <h2><span class="dot on"></span> Connecté</h2>
                  <p class="muted">${session.transport.name} · ${session.info?.adapter || ''} · ${session.info?.can ? 'CAN' : 'protocole ancien'}</p>
                </div>
                <button class="btn ghost" data-act="disconnect">Déconnecter</button>
              </div>`
            : html`
                <h2><span class="dot"></span> Connexion</h2>
                <div class="actions">
                  <button class="btn primary" data-act="ble" ${caps.ble ? '' : 'disabled'}>Bluetooth (BLE)</button>
                  <button class="btn" data-act="serial" ${caps.serial ? '' : 'disabled'}>USB</button>
                  <button class="btn ghost" data-act="sim">Mode démo</button>
                </div>
                ${!caps.ble
                  ? isIOS()
                    ? html`<div class="notice"><p><strong>Bluetooth indisponible sur iPhone et iPad.</strong> Apple ne le permet dans aucun navigateur, Google Chrome compris : la connexion à l’adaptateur OBD n’est pas possible sur cet appareil. Utilisez un téléphone Android ou un ordinateur avec Chrome. Le mode démo reste disponible.</p></div>`
                    : html`<div class="notice">
                        <p><strong>Ouvrez AUTOnomie dans Google Chrome</strong> pour connecter l’adaptateur en Bluetooth (Android, ordinateur Windows, Mac ou Chromebook).</p>
                        ${isAndroid()
                          ? html`<a class="btn primary" href="${chromeIntentUrl()}">Ouvrir dans Chrome</a>`
                          : html`<a class="btn" href="https://www.google.com/chrome/" target="_blank" rel="noopener">Télécharger Chrome ↗</a>`}
                      </div>`
                  : ''}
                <details>
                  <summary>Quel adaptateur acheter ?</summary>
                  <ul>
                    <li>Choisir un ELM327 marqué <strong>« Bluetooth 4.0 / BLE »</strong> (ex. Vgate iCar Pro BLE, Veepeak BLE) : environ 15 à 30 €.</li>
                    <li>Les modèles « Bluetooth classique » (appairage avec code 1234) et Wi-Fi ne sont pas accessibles depuis un navigateur.</li>
                    <li>Toutes les voitures essence depuis 2001 et diesel depuis 2004 vendues en Europe ont une prise OBD2.</li>
                  </ul>
                </details>
              `}
        </section>

        ${connected
          ? html`
              <section class="card">
                <h2>Codes défaut</h2>
                <div class="actions">
                  <button class="btn primary" data-act="dtc">Lire les codes</button>
                  <button class="btn danger" data-act="clear">Effacer les codes</button>
                </div>
                <div id="dtc-out" aria-live="polite"></div>
              </section>

              <section class="card">
                <h2>Contrôle avant achat</h2>
                <p class="muted small">Détecte un effacement récent des codes (pratique courante avant une vente) et compare le VIN.</p>
                <button class="btn" data-act="precheck">Lancer le contrôle</button>
                <div id="pre-out" aria-live="polite"></div>
              </section>

              <section class="card">
                <div class="result-head">
                  <h2>Données en temps réel</h2>
                  <button class="btn" data-act="live">${polling ? 'Arrêter' : 'Démarrer'}</button>
                </div>
                <div class="gauges" id="live">
                  ${LIVE_PIDS.map(
                    (p) => html`<div class="gauge" data-pid="${p}"><span class="v">—</span><span class="u">${PIDS[p].unit}</span><span class="l">${PIDS[p].label}</span></div>`,
                  )}
                  <div class="gauge" data-pid="RV"><span class="v">—</span><span class="u">V</span><span class="l">Tension batterie</span></div>
                </div>
              </section>
            `
          : ''}

        <details class="card">
          <summary>Journal technique</summary>
          <pre class="log" id="log">${session.log.slice(-60).join('\n\n')}</pre>
        </details>
      `,
    );
  };

  const log = (s) => {
    session.log.push(s);
    const l = $('#log', el);
    if (l) l.textContent = session.log.slice(-60).join('\n\n');
  };

  async function connect(kind) {
    try {
      const Transport = { ble: BleTransport, serial: SerialTransport, sim: SimulatedTransport }[kind];
      toast('Connexion…');
      const transport = await Transport.connect();
      transport.onDisconnect = () => {
        session.elm = null;
        toast('Adaptateur déconnecté', 'error');
        if (el.isConnected) draw();
      };
      const elm = new Elm327(transport, { log });
      session.info = await elm.init();
      session.elm = elm;
      session.transport = transport;
      toast('Connecté au véhicule');
    } catch (err) {
      if (err.name !== 'NotFoundError') toast(err.message, 'error');
      log(`Erreur : ${err.message}`);
    }
    draw();
  }

  async function readDtcs() {
    const out = $('#dtc-out', el);
    mount(out, html`<p class="loading">Lecture…</p>`);
    const { stored, pending } = await session.elm.readDtcs();
    const list = (codes, title) =>
      codes.length
        ? html`<h3>${title}</h3><ul class="dtc-list">${codes.map((c) => {
            const d = describeDtc(c);
            const [label, cls] = SEVERITY[d.severity];
            return html`<li>
              <code>${c}</code>
              <div><strong>${d.text}</strong><br /><span class="pill ${cls}">${label}</span>
                <a class="link" href="https://www.google.com/search?q=${encodeURIComponent(c + ' ' + (store.lastLookup()?.vehicle?.brand || ''))}" target="_blank" rel="noopener">En savoir plus →</a></div>
            </li>`;
          })}</ul>`
        : '';
    mount(
      out,
      stored.length || pending.length
        ? html`${list(stored, 'Codes mémorisés')}${list(pending, 'Codes en attente (pas encore confirmés)')}
            <p class="muted small">Un code indique le circuit en défaut, pas forcément la pièce à changer. En cas de voyant orange clignotant ou de voyant rouge, arrêtez-vous.</p>`
        : html`<p class="ok-msg">${icon('check-circle')} Aucun code défaut moteur.</p>`,
    );
  }

  async function preCheck() {
    const out = $('#pre-out', el);
    mount(out, html`<p class="loading">Analyse…</p>`);
    const status = await session.elm.readStatus();
    const dist = await session.elm.readPid('31');
    const mins = await session.elm.readPid('4E');
    const vin = await session.elm.readVin().catch(() => null);
    const cardVin = store.lastLookup()?.vehicle?.vin;
    const warnings = [];
    if (status?.mil) warnings.push('Voyant moteur allumé.');
    if (status?.notReady >= 2) warnings.push(`${status.notReady} moniteurs antipollution non prêts : codes probablement effacés récemment.`);
    if (dist !== null && dist < 200) warnings.push(`Seulement ${dist} km depuis le dernier effacement des codes.`);
    if (vin && cardVin && vin !== cardVin) warnings.push('Le VIN lu par l’OBD ne correspond pas à celui du véhicule recherché.');

    mount(
      out,
      html`
        <ul class="list">
          <li><strong>Voyant moteur :</strong> ${status ? (status.mil ? 'allumé' : 'éteint') : 'non lu'}${status ? ` · ${status.dtcCount} code(s) signalé(s)` : ''}</li>
          <li><strong>Moniteurs :</strong> ${status ? `${status.monitors.length - status.notReady}/${status.monitors.length} prêts` : 'non lus'}
            ${status?.notReady ? html`<br /><small>Non prêts : ${status.monitors.filter((m) => !m.ready).map((m) => m.name).join(', ')}</small>` : ''}</li>
          <li><strong>Distance depuis effacement :</strong> ${dist !== null ? `${dist} km` : 'non supporté'}${mins !== null ? ` · ${Math.round(mins / 60)} h moteur` : ''}</li>
          <li><strong>VIN (OBD) :</strong> ${vin || 'non disponible'} ${vin ? html`<a class="link" href="#vehicule">Rechercher →</a>` : ''}</li>
        </ul>
        ${warnings.length
          ? html`<div class="notice warn"><strong>Points d’attention</strong><ul>${warnings.map((w) => html`<li>${w}</li>`)}</ul></div>`
          : html`<p class="ok-msg">${icon('check-circle')} Rien d’anormal détecté par l’OBD.</p>`}
      `,
    );
  }

  async function pollOnce(token) {
    for (const pid of LIVE_PIDS) {
      if (polling !== token || !session.elm) return;
      const v = await session.elm.readPid(pid).catch(() => null);
      const g = el.querySelector(`[data-pid="${pid}"] .v`);
      if (g) g.textContent = v ?? '—';
    }
    const rv = await session.elm.readVoltage().catch(() => null);
    const g = el.querySelector('[data-pid="RV"] .v');
    if (g) g.textContent = rv ?? '—';
  }

  async function startLive() {
    const token = {};
    polling = token;
    draw();
    while (polling === token && session.elm && el.isConnected) {
      await pollOnce(token);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  draw();

  const onClick = async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || busy) return;
    if (['ble', 'serial', 'sim'].includes(act)) return connect(act);
    if (act === 'live') {
      if (polling) {
        polling = null;
        return draw();
      }
      return startLive();
    }
    if (act === 'disconnect') {
      polling = null;
      await session.transport?.close();
      session.elm = null;
      session.transport = null;
      return draw();
    }
    const wasPolling = polling;
    polling = null;
    busy = true;
    try {
      if (act === 'dtc') await readDtcs();
      if (act === 'precheck') await preCheck();
      if (act === 'clear') {
        if (!(await ask('Effacer les codes éteint le voyant mais ne répare rien : le défaut reviendra s’il est toujours présent. Moteur arrêté, contact mis.', { ok: 'Effacer les codes' }))) return;
        toast((await session.elm.clearDtcs()) ? 'Codes effacés' : 'Effacement refusé par le véhicule', 'info');
        await readDtcs();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      busy = false;
      if (wasPolling) startLive();
    }
  };

  el.addEventListener('click', onClick);
  return () => {
    polling = null;
    el.removeEventListener('click', onClick);
  };
}
