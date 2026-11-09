import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, sceneSvg } from '../public/js/data/scenes.js';
import { TUTORIALS } from '../public/js/data/tutorials.js';

const ANIMS = new Set(['', 'ccw', 'cw', 'down', 'up', 'left', 'right', 'out', 'in', 'drip', 'flow', 'blink', 'press', 'swing', 'spin']);

test('chaque tuto a un schéma animé, une animation par étape', () => {
  for (const t of TUTORIALS) {
    const s = SCENES[t.id];
    assert.ok(s, `scène manquante : ${t.id}`);
    assert.equal(s.steps.length, t.steps.length, `${t.id} : ${s.steps.length} animations pour ${t.steps.length} étapes`);
  }
  assert.equal(Object.keys(SCENES).length, TUTORIALS.length);
});

test('les pièces animées existent dans le schéma et les animations sont connues', () => {
  for (const [id, s] of Object.entries(SCENES)) {
    const svg = sceneSvg(id);
    s.steps.forEach((step, i) => {
      for (const [part, anim] of Object.entries(step)) {
        assert.ok(svg.includes(`data-part="${part}"`), `${id} étape ${i + 1} : pièce « ${part} » absente`);
        assert.ok(ANIMS.has(anim), `${id} étape ${i + 1} : animation « ${anim} » inconnue`);
      }
    });
  }
});

test('SVG bien formé (balises équilibrées)', () => {
  for (const id of Object.keys(SCENES)) {
    const svg = sceneSvg(id);
    const open = (svg.match(/<g[\s>]/g) || []).length;
    const close = (svg.match(/<\/g>/g) || []).length;
    assert.equal(open, close, `${id} : <g> non équilibrés`);
    assert.ok(!svg.includes('undefined') && !svg.includes('NaN'), `${id} : valeur invalide`);
  }
});

test('caméra : cadre 16:9 dans la scène, plein cadre sans pièce', async () => {
  const { cameraFor } = await import('../public/js/lib/scene-player.js');
  assert.deepEqual(cameraFor(null), [0, 0, 640, 360]);
  const [x, y, w, h] = cameraFor({ x: 380, y: 200, width: 30, height: 30 });
  assert.ok(Math.abs(w / h - 16 / 9) < 1e-9);
  assert.ok(x >= 0 && y >= 0 && x + w <= 640 + 1e-9 && y + h <= 360 + 1e-9);
  assert.ok(w < 640, 'zoom effectif');
  assert.deepEqual(cameraFor({ x: 0, y: 0, width: 600, height: 340 }), [0, 0, 640, 360]);
});
