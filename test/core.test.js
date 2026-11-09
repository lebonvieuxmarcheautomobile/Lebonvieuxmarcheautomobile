import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlate, formatPlateAsTyped, extractPlate } from '../public/js/lib/plate.js';
import { normalizeVin, decodeVinLocally } from '../public/js/lib/vin.js';
import { matchDefects } from '../public/js/lib/defects.js';
import { KNOWN_DEFECTS } from '../public/js/data/known-defects.js';
import { nextTechnicalInspection, serviceReminders, addMonths, toIsoDate } from '../public/js/lib/maintenance.js';
import { buildRecallsUrl, normalizeRecall, isVehicleRecall, rankRecalls } from '../public/js/lib/recalls.js';
import { BUYING_GUIDE } from '../public/js/data/buying-guide.js';
import { CATALOGUE, shopSearchUrl } from '../public/js/data/catalogue.js';
import { TUTORIALS } from '../public/js/data/tutorials.js';
import { mapRegCheck } from '../server/providers.js';

test('plaques SIV et FNI', () => {
  assert.equal(normalizePlate('ab123cd').formatted, 'AB-123-CD');
  assert.equal(normalizePlate(' ab - 123 - cd ').format, 'SIV');
  assert.equal(normalizePlate('AO-123-CD').valid, false); // lettre O interdite
  assert.equal(normalizePlate('SS-123-CD').valid, false);
  assert.equal(normalizePlate('AB-000-CD').valid, false);
  assert.equal(normalizePlate('123 ABC 45').formatted, '123 ABC 45');
  assert.equal(normalizePlate('1234 AB 2A').formatted, '1234 AB 2A');
  assert.equal(normalizePlate('12 AB 974').formatted, '12 AB 974');
  assert.equal(normalizePlate('hello').valid, false);
  assert.equal(normalizePlate('').valid, false);
  assert.equal(formatPlateAsTyped('ab12'), 'AB-12');
  assert.equal(formatPlateAsTyped('ab123c'), 'AB-123-C');
});

test('VIN', () => {
  assert.equal(normalizeVin('VF3CCHNSEJT000000').valid, true);
  assert.equal(normalizeVin('VF3CCHNSEJT00000').valid, false);
  assert.equal(normalizeVin('VF3CCHNSEJT00000O').valid, false);
  const d = decodeVinLocally('VF3CCHNSEJT000000', new Date('2026-01-01'));
  assert.equal(d.brand, 'Peugeot');
  assert.equal(d.yearHint, 2018); // J = 2018
});

test('défauts connus : PureTech détecté, moteur différent exclu', () => {
  const ids = (v) => matchDefects(v, KNOWN_DEFECTS).map((m) => m.defect.id);
  assert.ok(ids({ brand: 'Peugeot', model: '208', engine: '1.2 PureTech 110', year: 2018 }).includes('psa-puretech-belt'));
  assert.ok(!ids({ brand: 'Peugeot', model: '208', engine: '1.5 BlueHDi 100', year: 2018 }).includes('psa-puretech-belt'));
  assert.ok(ids({ brand: 'Peugeot', model: '208', engine: '1.5 BlueHDi 100', year: 2018 }).includes('psa-bluehdi-adblue'));
  // Hors période
  assert.ok(!ids({ brand: 'Peugeot', model: '208', engine: '1.2 PureTech', year: 2010 }).includes('psa-puretech-belt'));
  // Motorisation inconnue -> "à vérifier"
  const m = matchDefects({ brand: 'Renault', model: 'Captur', year: 2015 }, KNOWN_DEFECTS).find((x) => x.defect.id === 'renault-tce-h5ft');
  assert.equal(m.confidence, 'a-verifier');
  // Alias et accents
  assert.ok(ids({ brand: 'VW', model: 'Golf', engine: '1.4 TSI', gearbox: 'DSG7', year: 2010 }).includes('vag-dq200'));
  assert.ok(ids({ brand: 'Citroen', model: 'C3', engine: '1.6 BlueHDi', year: 2017 }).includes('takata-c3-ds3'));
  // Tri : critique en premier
  assert.equal(matchDefects({ brand: 'Citroën', model: 'C3', engine: '1.2 PureTech 82', year: 2017 }, KNOWN_DEFECTS)[0].defect.severity, 'critique');
});

test('addMonths sans débordement', () => {
  assert.equal(toIsoDate(addMonths(new Date(2024, 0, 31), 1)), '2024-02-29');
  assert.equal(toIsoDate(addMonths(new Date(2023, 0, 31), 1)), '2023-02-28');
});

test('contrôle technique', () => {
  const today = new Date(2026, 10, 9);
  const v = { firstRegistration: '2023-03-14' };
  let r = nextTechnicalInspection(v, [], today);
  assert.equal(r.kind, 'premier');
  assert.equal(r.due, '2027-03-14');
  assert.equal(r.status, 'ok');

  r = nextTechnicalInspection({ firstRegistration: '2015-01-01' }, [{ date: '2025-01-10', result: 'favorable' }], today);
  assert.equal(r.due, '2027-01-10');

  r = nextTechnicalInspection({}, [{ date: '2026-10-01', result: 'contre-visite' }], today);
  assert.equal(r.kind, 'contre-visite');
  assert.equal(r.due, '2026-12-01');
  assert.equal(r.status, 'bientot');

  r = nextTechnicalInspection({}, [
    { date: '2026-10-01', result: 'contre-visite' },
    { date: '2026-10-20', result: 'favorable', counterVisit: true },
  ], today);
  assert.equal(r.due, '2028-10-01'); // à partir de la visite initiale

  r = nextTechnicalInspection({ firstRegistration: '2010-01-01' }, [{ date: '2023-06-01', result: 'favorable' }], today);
  assert.equal(r.status, 'depasse');

  assert.equal(nextTechnicalInspection({}, [undefined], today).status, 'inconnu');
});

test('rappels d’entretien', () => {
  const today = new Date(2026, 10, 9);
  const v = { mileage: 59500, oilIntervalKm: 15000, oilIntervalMonths: 12 };
  const r = serviceReminders(v, [{ type: 'vidange', date: '2026-03-01', mileage: 45000 }], today);
  const oil = r.find((x) => x.type === 'vidange');
  assert.equal(oil.dueKm, 60000);
  assert.equal(oil.status, 'bientot');
  assert.equal(serviceReminders(v, [], today).find((x) => x.type === 'vidange').status, 'inconnu');
  // Distribution non renseignée : pas de rappel
  assert.equal(serviceReminders(v, [], today).some((x) => x.type === 'distribution'), false);
  const late = serviceReminders(v, [{ type: 'vidange', date: '2025-01-01', mileage: 50000 }], today).find((x) => x.type === 'vidange');
  assert.equal(late.status, 'depasse');
});

test('RappelConso : construction de requête et normalisation', () => {
  const url = new URL(buildRecallsUrl({ brand: 'Peugeot', model: '208' }));
  assert.equal(url.searchParams.get('where'), 'search("Peugeot") AND search("208")');
  const rec = {
    categorie_produit: 'Automobiles et moyens de déplacement',
    sous_categorie_produit: 'Automobiles',
    marque_produit: 'PEUGEOT',
    modeles_ou_references: ['208', '2008'],
    motif_rappel: 'Risque de défaillance',
    date_publication: '2024-05-01',
    lien_vers_la_fiche_rappel: 'https://rappel.conso.gouv.fr/fiche-rappel/1/Interne',
  };
  assert.ok(isVehicleRecall(rec));
  assert.ok(!isVehicleRecall({ categorie_produit: 'Alimentation' }));
  const n = normalizeRecall(rec);
  assert.equal(n.models, '208, 2008');
  assert.equal(rankRecalls([{ ...n, models: '3008' }, n], '208')[0].models, '208, 2008');
});

test('cohérence des contenus', () => {
  const ids = BUYING_GUIDE.flatMap((s) => s.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length, 'identifiants de check-list uniques');
  const partIds = new Set(CATALOGUE.flatMap((c) => c.items.map((i) => i.id)));
  const tutoIds = new Set(TUTORIALS.map((t) => t.id));
  for (const c of CATALOGUE) for (const i of c.items) for (const t of i.tutos) assert.ok(tutoIds.has(t), `tuto ${t} (pièce ${i.id})`);
  for (const t of TUTORIALS) for (const p of t.parts) assert.ok(partIds.has(p), `pièce ${p} (tuto ${t.id})`);
  for (const d of KNOWN_DEFECTS) assert.ok(d.brands.length && d.title && d.severity && d.remedy, d.id);
  assert.equal(
    shopSearchUrl(undefined, 'plaquettes de frein', { brand: 'Peugeot', model: '208' }),
    'https://www.google.com/search?q=site%3Acarter-cash.com+plaquettes%20de%20frein%20Peugeot%20208',
  );
});

test('RegCheck : uniquement des données techniques', () => {
  const v = mapRegCheck(
    {
      Description: 'PEUGEOT 208',
      RegistrationYear: '2018',
      CarMake: { CurrentTextValue: 'PEUGEOT' },
      CarModel: { CurrentTextValue: '208' },
      FuelType: { CurrentTextValue: 'Essence' },
      ExtendedData: { version: '1.2 PureTech 110', datePremiereMiseencirculation: '14/03/2018', nomProprietaire: 'NE PAS AFFICHER' },
    },
    'AB-123-CD',
  );
  assert.equal(v.brand, 'PEUGEOT');
  assert.equal(v.year, 2018);
  assert.ok(!JSON.stringify(v).includes('NE PAS AFFICHER'));
});

test('plaque extraite d’un texte partagé (Immat Scanner…)', () => {
  assert.equal(extractPlate('Plaque : ab-123-cd — Peugeot 208 1.2 PureTech').formatted, 'AB-123-CD');
  assert.equal(extractPlate('Résultat du scan\nAB 123 CD').formatted, 'AB-123-CD');
  assert.equal(extractPlate('vieille plaque 1234 AB 75 trouvée').formatted, '1234 AB 75');
  assert.equal(extractPlate('https://exemple.fr/v?p=GH789JK').formatted, 'GH-789-JK');
  assert.equal(extractPlate('Version 2.5.1 sans plaque'), null);
  assert.equal(extractPlate('AO-123-CD'), null); // lettre interdite
});

test('base de défauts : intégrité', () => {
  const ids = KNOWN_DEFECTS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants uniques');
  for (const d of KNOWN_DEFECTS) {
    assert.ok(['critique', 'elevee', 'moyenne', 'faible'].includes(d.severity), d.id);
    assert.ok(d.symptoms.length && d.checks.length && d.component, d.id);
    if (d.years) assert.ok(d.years[0] <= d.years[1], d.id);
    assert.ok(d.models?.length || d.keywords?.length, `${d.id} : trop large sans modèle ni mot-clé`);
  }
  const tIds = TUTORIALS.map((t) => t.id);
  assert.equal(new Set(tIds).size, tIds.length, 'tutos uniques');
});

test('nouveaux défauts : moteurs partagés et marques', () => {
  const ids = (v) => matchDefects(v, KNOWN_DEFECTS).map((m) => m.defect.id);
  assert.ok(ids({ brand: 'Ford', model: 'Focus', engine: '1.6 TDCi 110', year: 2008 }).includes('psa-dv6-hdi'));
  assert.ok(ids({ brand: 'Peugeot', model: '307', engine: '1.6 HDi 110 FAP', year: 2006 }).includes('psa-fap-additif'));
  assert.ok(ids({ brand: 'Toyota', model: 'Avensis', engine: '2.2 D-4D 150', year: 2008 }).includes('toyota-ad-d4d'));
  assert.ok(ids({ brand: 'BMW', model: '320i', engine: 'N20', year: 2013 }).includes('bmw-n13-n20'));
  assert.ok(ids({ brand: 'Fiat', model: '500', engine: '1.2 69', gearbox: 'Dualogic', year: 2012 }).includes('fiat-dualogic'));
  assert.ok(ids({ brand: 'Nissan', model: 'Leaf', year: 2013 }).includes('nissan-leaf-battery'));
  // Pas de faux positif : Ford 1.6 essence Duratec
  assert.ok(!ids({ brand: 'Ford', model: 'Focus', engine: '1.6 Duratec 100', year: 2008 }).includes('psa-dv6-hdi'));
});

test('chaque tuto renvoie vers un guide professionnel', () => {
  for (const t of TUTORIALS) {
    assert.ok(t.guide && /^https:\/\/www\.(carter-cash|mister-auto)\.com\//.test(t.guide.url) && t.guide.title && t.guide.source, t.id);
  }
});

test('chaque tuto a sa photo professionnelle', async () => {
  const { existsSync } = await import('node:fs');
  for (const t of TUTORIALS) assert.ok(existsSync(new URL(`../public/assets/tutos/${t.id}.jpg`, import.meta.url)), t.id);
});
