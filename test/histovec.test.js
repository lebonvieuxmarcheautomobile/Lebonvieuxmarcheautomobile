import { test } from 'node:test';
import assert from 'node:assert/strict';
import { histovecUrl } from '../public/js/views/histovec.js';

test('seuls les liens du site officiel HistoVec sont affichés', () => {
  assert.equal(histovecUrl('https://histovec.interieur.gouv.fr/histovec/report?id=abc'), 'https://histovec.interieur.gouv.fr/histovec/report?id=abc');
  assert.equal(histovecUrl('  https://histovec.interieur.gouv.fr/  '), 'https://histovec.interieur.gouv.fr/');
  assert.equal(histovecUrl('http://histovec.interieur.gouv.fr/'), null);
  assert.equal(histovecUrl('https://histovec.interieur.gouv.fr.faux-site.com/'), null);
  assert.equal(histovecUrl('javascript:alert(1)'), null);
  assert.equal(histovecUrl(''), null);
});
