// Note d'achat sur 20 : fiabilité, rapport qualité-prix et verdict « bonne affaire ».
// Calcul pur, indicatif et transparent : chaque point perdu est listé avec sa raison.

import { matchDefects } from './defects.js';
import { KNOWN_DEFECTS } from '../data/known-defects.js';

/**
 * Impact d'un point de contrôle jugé « Défaut » :
 *  fiab  = points de fiabilité perdus, qp = points de rapport qualité-prix perdus,
 *  block = défaut rédhibitoire (la note globale est plafonnée).
 */
export const CHECK_IMPACT = {
  // Documents
  cg: { label: 'Carte grise / VIN non conformes', block: 'Carte grise pas au nom du vendeur ou VIN différent du véhicule' },
  ct: { label: 'Contrôle technique absent ou trop ancien', fiab: 3 },
  csa: { label: 'Situation administrative non conforme', block: 'Véhicule gagé ou frappé d’opposition : immatriculation impossible' },
  carnet: { label: 'Pas d’historique d’entretien', fiab: 2 },
  doubles: { label: 'Double de clé ou accessoires manquants', qp: 0.5 },
  // Extérieur
  teintes: { label: 'Traces de réparation carrosserie', fiab: 1.5 },
  jeux: { label: 'Jeux de carrosserie irréguliers', fiab: 1.5 },
  rouille: { label: 'Corrosion', fiab: 2.5 },
  pneus: { label: 'Pneus à remplacer / usure anormale', qp: 1, fiab: 0.5 },
  freins: { label: 'Freins à refaire', qp: 1 },
  vitrage: { label: 'Pare-brise ou optiques abîmés', qp: 0.5 },
  fuites: { label: 'Fuites sous le véhicule', fiab: 2.5 },
  // Intérieur
  usure: { label: 'Usure intérieure incohérente avec le kilométrage', fiab: 3 },
  voyants: { label: 'Voyant d’alerte allumé', fiab: 4 },
  clim: { label: 'Climatisation / chauffage défaillants', qp: 1 },
  elec: { label: 'Équipements électriques défaillants', qp: 0.5, fiab: 0.5 },
  humidite: { label: 'Humidité / infiltration', fiab: 3 },
  // Moteur
  huile: { label: 'Huile suspecte (joint de culasse ?)', fiab: 6 },
  lr: { label: 'Liquide de refroidissement anormal', fiab: 2 },
  demarrage: { label: 'Démarrage difficile ou bruit moteur', fiab: 3 },
  fumee: { label: 'Fumée anormale à l’échappement', fiab: 4 },
  courroie: { label: 'Distribution à faire', qp: 2 },
  // Essai
  embrayage: { label: 'Embrayage usé', qp: 1.5, fiab: 0.5 },
  boite: { label: 'Boîte de vitesses défaillante', fiab: 3 },
  direction: { label: 'Tenue de route / freinage anormaux', fiab: 1.5 },
  bruits: { label: 'Bruits de train avant', fiab: 1.5 },
  temp: { label: 'Température moteur instable', fiab: 4 },
  puissance: { label: 'Perte de puissance', fiab: 2.5 },
  // OBD
  codes: { label: 'Codes défaut présents', fiab: 2 },
  readiness: { label: 'Codes effacés récemment', fiab: 3 },
  vinobd: { label: 'VIN OBD différent', block: 'VIN lu par l’OBD différent de la carte grise' },
};

export const CONTROL_IDS = Object.keys(CHECK_IMPACT);

const DEFECT_PENALTY = { critique: 4, elevee: 2.5, moyenne: 1.2, faible: 0.4 };

const clamp = (n) => Math.max(0, Math.min(20, n));
const round1 = (n) => Math.round(n * 10) / 10;
const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** Note du prix seul (0-20) d'après le rapport prix demandé / prix du marché. */
export function priceScore(price, market) {
  const r = price / market;
  if (r < 0.7) return { score: 15, ratio: r, suspicious: true };
  if (r < 0.85) return { score: 18, ratio: r };
  if (r < 0.95) return { score: 16, ratio: r };
  if (r < 1.05) return { score: 13, ratio: r };
  if (r < 1.15) return { score: 10, ratio: r };
  if (r < 1.3) return { score: 7, ratio: r };
  return { score: 4, ratio: r };
}

/**
 * @param {{
 *   vehicle?: {brand?,model?,engine?,gearbox?,year?,mileage?,price?,marketPrice?},
 *   histovec?: {owners?, sinistre?: 'aucun'|'repare'|'grave', gage?: 'oui'|'non', opposition?: 'oui'|'non',
 *               kmCoherent?: 'oui'|'non', lastCt?: 'favorable'|'contre-visite'|'critique'},
 *   checks?: Record<string,'ok'|'ko'>,
 * }} input
 */
export function scorePurchase({ vehicle = {}, histovec = {}, checks = {} } = {}, today = new Date()) {
  const negatives = [];
  const positives = [];
  const warnings = [];
  const blocking = [];
  let fiab = 20;
  let qpPenalty = 0;

  const lose = (label, f = 0, q = 0, source = 'controle') => {
    fiab -= f;
    qpPenalty += q;
    negatives.push({ label, fiab: f, qp: q, source });
  };

  // 1. Points de contrôle
  let ok = 0;
  let evaluated = 0;
  for (const id of CONTROL_IDS) {
    const v = checks[id];
    if (v !== 'ok' && v !== 'ko') continue;
    evaluated++;
    if (v === 'ok') {
      ok++;
      continue;
    }
    const imp = CHECK_IMPACT[id];
    if (imp.block) blocking.push(imp.block);
    lose(imp.label, imp.fiab || 0, imp.qp || 0);
  }
  if (evaluated) positives.push(`${ok} point(s) de contrôle conforme(s) sur ${evaluated}`);

  // 2. HistoVec
  const h = histovec;
  if (h.gage === 'oui') blocking.push('Gage déclaré sur HistoVec');
  if (h.opposition === 'oui') blocking.push('Opposition / déclaration de vol sur HistoVec');
  if (h.kmCoherent === 'non') {
    blocking.push('Kilométrage incohérent avec l’historique des CT : compteur probablement modifié');
    lose('Kilométrage incohérent (HistoVec)', 6, 0, 'histovec');
  }
  if (h.sinistre === 'repare') lose('Sinistre déclaré puis réparé (HistoVec)', 2.5, 1, 'histovec');
  if (h.sinistre === 'grave') {
    lose('Véhicule gravement endommagé (VGE) par le passé', 6, 2, 'histovec');
    warnings.push('Ancien VGE : exiger le rapport d’expert et le certificat de conformité après réparation.');
  }
  const owners = num(h.owners);
  if (owners >= 4) lose(`${owners} propriétaires`, 1.5, 0, 'histovec');
  else if (owners === 3) lose('3 propriétaires', 0.5, 0, 'histovec');
  if (h.lastCt === 'contre-visite') lose('Dernier CT avec contre-visite', 2, 0, 'histovec');
  if (h.lastCt === 'critique') lose('Dernier CT avec défaillance critique', 4, 0, 'histovec');
  const histovecFilled = ['owners', 'sinistre', 'gage', 'opposition', 'kmCoherent', 'lastCt'].filter((k) => h[k] !== undefined && h[k] !== '').length;
  if (histovecFilled >= 4 && h.gage === 'non' && h.opposition === 'non' && h.kmCoherent === 'oui' && (h.sinistre === 'aucun' || !h.sinistre)) {
    positives.push('Rapport HistoVec sans anomalie');
  }
  if (owners === 1) positives.push('Première main');

  // 3. Âge et kilométrage
  const year = num(vehicle.year);
  const km = num(vehicle.mileage);
  const age = year ? Math.max(1, today.getFullYear() - year) : undefined;
  if (km !== undefined) {
    if (km > 250000) lose('Kilométrage très élevé (> 250 000 km)', 3, 0, 'usage');
    else if (km > 180000) lose('Kilométrage élevé (> 180 000 km)', 2, 0, 'usage');
    else if (km > 120000) lose('Kilométrage > 120 000 km', 1, 0, 'usage');
    if (age && km / age > 30000) lose(`Gros rouleur (${Math.round(km / age).toLocaleString('fr-FR')} km/an)`, 1, 0, 'usage');
    if (age && km / age < 3000 && age >= 4) warnings.push('Très faible kilométrage annuel : vérifier la cohérence (CT, factures) et l’état des pièces vieillissantes (pneus, durites, batterie).');
  }
  if (age > 15) lose('Véhicule de plus de 15 ans', 1.5, 0, 'usage');
  else if (age > 10) lose('Véhicule de plus de 10 ans', 0.5, 0, 'usage');

  // 4. Défauts connus du modèle
  let defectTotal = 0;
  const defects = vehicle.brand ? matchDefects(vehicle, KNOWN_DEFECTS) : [];
  for (const { defect, confidence } of defects) {
    const p = DEFECT_PENALTY[defect.severity] * (confidence === 'probable' ? 1 : 0.5);
    defectTotal += p;
  }
  if (defects.length) {
    const p = Math.min(6, defectTotal);
    fiab -= p;
    negatives.push({ label: `${defects.length} défaut(s) connu(s) sur ce modèle / moteur`, fiab: round1(p), qp: 0, source: 'defauts' });
  }

  fiab = clamp(fiab);

  // 5. Rapport qualité-prix
  const price = num(vehicle.price);
  const market = num(vehicle.marketPrice);
  let qp = null;
  let ratio;
  if (price > 0 && market > 0) {
    const ps = priceScore(price, market);
    ratio = ps.ratio;
    if (ps.suspicious) warnings.push('Prix anormalement bas (plus de 30 % sous le marché) : risque d’arnaque ou de vice caché.');
    const pct = Math.round((ratio - 1) * 100);
    if (pct <= -5) positives.push(`Prix ${-pct} % sous le marché`);
    else if (pct >= 10) negatives.push({ label: `Prix ${pct} % au-dessus du marché`, fiab: 0, qp: 0, source: 'prix' });
    qp = clamp(ps.score - qpPenalty + (fiab - 12) * 0.35);
  }

  // 6. Note globale et verdict
  let global = qp === null ? fiab : 0.55 * fiab + 0.45 * qp;
  if (blocking.length) global = Math.min(global, 4);
  global = round1(global);

  const completeness = evaluated / CONTROL_IDS.length;
  const provisional = completeness < 0.5 || qp === null;

  let verdict;
  let tone;
  if (blocking.length) [verdict, tone] = ['À éviter', 'depasse'];
  else if (global >= 15) [verdict, tone] = ['Bonne affaire', 'ok'];
  else if (global >= 12) [verdict, tone] = ['Achat correct', 'ok'];
  else if (global >= 9) [verdict, tone] = ['À négocier', 'bientot'];
  else if (global >= 6) [verdict, tone] = ['Risqué', 'depasse'];
  else [verdict, tone] = ['À éviter', 'depasse'];

  const negotiation = negatives.filter((n) => n.qp > 0 || n.fiab >= 2).map((n) => n.label);

  return {
    global,
    fiab: round1(fiab),
    qp: qp === null ? null : round1(qp),
    ratio,
    verdict,
    tone,
    blocking,
    negatives,
    positives,
    warnings,
    negotiation,
    defects,
    evaluated,
    totalControls: CONTROL_IDS.length,
    completeness,
    provisional,
  };
}
