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

export function attachPlayer(root, t) {
  const box = $('[data-player]', root);
  if (!box) return () => {};
  const scene = SCENES[t.id];
  const svgRoot = $('.stage svg', box);
  let i = 0;
  let timer = null;

  const stepItems = $$('.steps li', root);
  const show = (n) => {
    i = (n + t.steps.length) % t.steps.length;
    applyStep(svgRoot, scene.steps[i]);
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
    clearInterval(timer);
    root.removeEventListener('click', onClick);
  };
}
