import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePurchase, priceScore, CONTROL_IDS, CHECK_IMPACT } from '../public/js/lib/scoring.js';
import { BUYING_GUIDE } from '../public/js/data/buying-guide.js';

const today = new Date(2026, 10, 9);
const allOk = Object.fromEntries(CONTROL_IDS.map((id) => [id, 'ok']));
const cleanHistovec = { owners: 1, sinistre: 'aucun', gage: 'non', opposition: 'non', kmCoherent: 'oui', lastCt: 'favorable' };

test('chaque point noté existe dans le guide d’achat', () => {
  const ids = new Set(BUYING_GUIDE.flatMap((s) => s.items.map((i) => i.id)));
  for (const id of CONTROL_IDS) assert.ok(ids.has(id), id);
});

test('véhicule sain, prix sous le marché : bonne affaire', () => {
  const r = scorePurchase({
    vehicle: { brand: 'Toyota', model: 'Yaris', engine: '1.5 Hybride', year: 2019, mileage: 60000, price: 13000, marketPrice: 14500 },
    histovec: cleanHistovec,
    checks: allOk,
  }, today);
  assert.equal(r.fiab, 20);
  assert.ok(r.global >= 15, String(r.global));
  assert.equal(r.verdict, 'Bonne affaire');
  assert.equal(r.provisional, false);
  assert.ok(r.positives.includes('Première main'));
});

test('défaut rédhibitoire : note plafonnée et « À éviter »', () => {
  const r = scorePurchase({ vehicle: { price: 9000, marketPrice: 12000 }, histovec: { ...cleanHistovec, gage: 'oui' }, checks: allOk }, today);
  assert.ok(r.global <= 4);
  assert.equal(r.verdict, 'À éviter');
  assert.ok(r.blocking.some((b) => /Gage/.test(b)));
});

test('compteur trafiqué bloquant', () => {
  const r = scorePurchase({ histovec: { kmCoherent: 'non' }, checks: allOk }, today);
  assert.equal(r.verdict, 'À éviter');
});

test('défauts constatés et moteur à risque font baisser la fiabilité', () => {
  const r = scorePurchase({
    vehicle: { brand: 'Peugeot', model: '308', engine: '1.2 PureTech 130', year: 2017, mileage: 95000, price: 11000, marketPrice: 11000 },
    histovec: cleanHistovec,
    checks: { ...allOk, fumee: 'ko', courroie: 'ko' },
  }, today);
  assert.ok(r.fiab < 15, String(r.fiab));
  assert.ok(r.negatives.some((n) => n.source === 'defauts'));
  assert.ok(r.negotiation.includes(CHECK_IMPACT.courroie.label));
  assert.ok(['À négocier', 'Achat correct', 'Risqué'].includes(r.verdict), r.verdict);
});

test('prix anormalement bas : avertissement', () => {
  assert.equal(priceScore(5000, 10000).suspicious, true);
  const r = scorePurchase({ vehicle: { price: 5000, marketPrice: 10000 }, checks: allOk }, today);
  assert.ok(r.warnings.some((w) => /anormalement bas/.test(w)));
});

test('note provisoire tant que peu de points ou pas de prix', () => {
  const r = scorePurchase({ checks: { huile: 'ok' } }, today);
  assert.equal(r.provisional, true);
  assert.equal(r.qp, null);
  assert.equal(r.verdict, 'Évaluation en cours');
  const empty = scorePurchase({}, today);
  assert.equal(empty.global, 20);
  assert.equal(empty.provisional, true);
});

test('notes toujours entre 0 et 20', () => {
  const allKo = Object.fromEntries(CONTROL_IDS.map((id) => [id, 'ko']));
  const r = scorePurchase({
    vehicle: { brand: 'Citroën', model: 'C3', engine: '1.2 PureTech', year: 2009, mileage: 300000, price: 20000, marketPrice: 5000 },
    histovec: { owners: 6, sinistre: 'grave', lastCt: 'critique' },
    checks: allKo,
  }, today);
  for (const v of [r.global, r.fiab, r.qp]) assert.ok(v >= 0 && v <= 20, String(v));
});
