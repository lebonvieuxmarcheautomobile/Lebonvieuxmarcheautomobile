// Lecteur de tuto animé : affiche le schéma technique et anime, étape par étape,
// les pièces concernées (mise en évidence + mouvement). Lecture automatique ou manuelle.

import { html, raw, $, $$ } from './dom.js';
import { icon } from './icons.js';
import { SCENES, sceneSvg } from '../data/scenes.js';

const STEP_MS = 5000;

export const hasScene = (id) => !!SCENES[id];

export function playerMarkup(t) {
  const svg = sceneSvg(t.id);
  if (!svg) return '';
  return html`<section class="card player" data-player aria-label="Tuto animé">
    <div class="card-head">
      <span class="chip-icon">${icon('pulse', { size: 20 })}</span>
      <div><h2>Tuto animé</h2><p class="small muted">${SCENES[t.id].title}</p></div>
    </div>
    <div class="stage">${raw(svg)}</div>
    <div class="player-progress" role="tablist" aria-label="Étapes">
      ${t.steps.map((_, i) => html`<button type="button" role="tab" class="pdot" data-goto="${i}" aria-label="Étape ${i + 1}"></button>`)}
    </div>
    <p class="caption" aria-live="polite"><strong class="cap-num"></strong> <span class="cap-text"></span></p>
    <div class="player-ctrl">
      <button type="button" class="btn ghost" data-pl="prev" aria-label="Étape précédente">${icon('arrow-left', { size: 20 })}</button>
      <button type="button" class="btn brand" data-pl="play">${icon('pulse', { size: 20 })} <span class="play-label">Lecture</span></button>
      <button type="button" class="btn ghost" data-pl="next" aria-label="Étape suivante"><span class="flip">${icon('arrow-left', { size: 20 })}</span></button>
    </div>
  </section>`;
}

/** Applique l'état d'une étape à la scène : pièces en évidence et animations. */
export function applyStep(svgRoot, map = {}) {
  for (const el of svgRoot.querySelectorAll('[data-part]')) {
    el.classList.remove('focus');
    for (const c of [...el.classList]) if (c.startsWith('a-')) el.classList.remove(c);
  }
  const keys = Object.keys(map);
  svgRoot.classList.toggle('has-focus', keys.length > 0);
  for (const k of keys) {
    for (const el of svgRoot.querySelectorAll(`[data-part="${k}"]`)) {
      el.classList.add('focus');
      if (map[k]) el.classList.add(`a-${map[k]}`);
    }
  }
}

const FULL = [0, 0, 640, 360];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cadre de caméra (viewBox) centré sur les pièces de l'étape, au format 16:9. */
export function cameraFor(bb) {
  if (!bb) return [...FULL];
  let w = Math.max(bb.width * 2, 300);
  let h = (w * 9) / 16;
  if (bb.height * 1.7 > h) {
    h = bb.height * 1.7;
    w = (h * 16) / 9;
  }
  if (w >= 640) return [...FULL];
  const x = Math.min(Math.max(bb.x + bb.width / 2 - w / 2, 0), 640 - w);
  const y = Math.min(Math.max(bb.y + bb.height / 2 - h / 2, 0), 360 - h);
  return [x, y, w, h];
}

function unionBBox(els) {
  let bb = null;
  for (const el of els) {
    const b = el.getBBox();
    if (!b.width && !b.height) continue;
    bb = bb
      ? (() => {
          const x = Math.min(bb.x, b.x);
          const y = Math.min(bb.y, b.y);
          return { x, y, width: Math.max(bb.x + bb.width, b.x + b.width) - x, height: Math.max(bb.y + bb.height, b.y + b.height) - y };
        })()
      : { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  return bb;
}

export function attachPlayer(root, t) {
  const box = $('[data-player]', root);
  if (!box) return () => {};
  const scene = SCENES[t.id];
  const svgRoot = $('.stage svg', box);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  let timer = null;
  let vb = [...FULL];
  let raf = 0;

  const setViewBox = (v) => svgRoot.setAttribute('viewBox', v.map((n) => n.toFixed(1)).join(' '));
  const moveCamera = (target) => {
    cancelAnimationFrame(raf);
    if (reduced) {
      vb = target;
      return setViewBox(vb);
    }
    const from = [...vb];
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 900);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      vb = from.map((f, n) => f + (target[n] - f) * e);
      setViewBox(vb);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  const frame = () => {
    svgRoot.querySelector('.callout')?.remove();
    const focused = [...svgRoot.querySelectorAll('.focus')].filter((el) => !el.parentElement.closest('.focus'));
    const bb = focused.length ? unionBBox(focused) : null;
    moveCamera(cameraFor(bb));
    if (bb) {
      const ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('class', 'callout');
      ring.setAttribute('cx', bb.x + bb.width / 2);
      ring.setAttribute('cy', bb.y + bb.height / 2);
      ring.setAttribute('r', Math.min(Math.max(bb.width, bb.height) / 2 + 8, 90));
      svgRoot.append(ring);
    }
  };

  const stepItems = $$('.steps li', root);
  const show = (n) => {
    i = (n + t.steps.length) % t.steps.length;
    applyStep(svgRoot, scene.steps[i]);
    frame();
    $('.cap-num', box).textContent = `Étape ${i + 1}/${t.steps.length}`;
    $('.cap-text', box).textContent = t.steps[i];
    $$('.pdot', box).forEach((d, k) => {
      d.classList.toggle('on', k === i);
      d.classList.toggle('done', k < i);
      d.setAttribute('aria-selected', String(k === i));
    });
    stepItems.forEach((li, k) => li.classList.toggle('current', k === i));
  };
  const setPlaying = (on) => {
    clearInterval(timer);
    timer = on ? setInterval(() => show(i + 1), STEP_MS) : null;
    $('.play-label', box).textContent = on ? 'Pause' : 'Lecture';
    box.classList.toggle('playing', on);
  };

  const onClick = (e) => {
    const goto = e.target.closest('[data-goto]');
    const ctl = e.target.closest('[data-pl]')?.dataset.pl;
    if (goto) {
      setPlaying(false);
      show(Number(goto.dataset.goto));
    } else if (ctl === 'prev' || ctl === 'next') {
      setPlaying(false);
      show(i + (ctl === 'next' ? 1 : -1));
    } else if (ctl === 'play') {
      setPlaying(!timer);
    }
  };

  show(0);
  root.addEventListener('click', onClick);
  return () => {
    cancelAnimationFrame(raf);
    clearInterval(timer);
    root.removeEventListener('click', onClick);
  };
}
