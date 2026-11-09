import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../public/js/lib/router.js';

test('liens internes #route-param et ancien format', () => {
  assert.deepEqual(parseHash(''), { name: 'accueil', params: [] });
  assert.deepEqual(parseHash('#achat'), { name: 'achat', params: [] });
  assert.deepEqual(parseHash('#carnet-1b2c-33d4-aa'), { name: 'carnet', params: ['1b2c-33d4-aa'] });
  assert.deepEqual(parseHash('#atelier-tutos'), { name: 'atelier', params: ['tutos'] });
  assert.deepEqual(parseHash('#atelier-tuto-filtre-habitacle'), { name: 'atelier', params: ['tuto', 'filtre-habitacle'] });
  assert.deepEqual(parseHash('#/carnet/abc'), { name: 'carnet', params: ['abc'] });
  assert.deepEqual(parseHash('#/'), { name: 'accueil', params: [] });
});
