// Rapprochement véhicule <-> base de défauts connus (public/js/data/known-defects.js).

const BRAND_ALIASES = {
  vw: 'volkswagen',
  'mercedes-benz': 'mercedes',
  'mercedes benz': 'mercedes',
  'ds automobiles': 'ds',
  'mini cooper': 'mini',
};

export const normText = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function normBrand(s) {
  const b = normText(s);
  return BRAND_ALIASES[b] || b;
}

const SEVERITY_ORDER = { critique: 0, elevee: 1, moyenne: 2, faible: 3 };

/**
 * @param {{brand?:string, model?:string, version?:string, engine?:string, gearbox?:string, year?:number}} vehicle
 * @returns {{defect:object, confidence:'probable'|'a-verifier'}[]}
 */
export function matchDefects(vehicle, db) {
  const brand = normBrand(vehicle.brand);
  if (!brand) return [];
  const model = normText(vehicle.model);
  const technical = normText([vehicle.version, vehicle.engine, vehicle.gearbox].filter(Boolean).join(' '));
  const haystack = `${model} ${technical}`;
  const year = Number(vehicle.year) || undefined;

  const out = [];
  for (const d of db) {
    if (!d.brands.some((b) => normBrand(b) === brand)) continue;
    if (d.models?.length && !d.models.some((m) => model.includes(normText(m)))) continue;
    if (year && d.years && (year < d.years[0] || year > d.years[1])) continue;

    let confidence = 'probable';
    if (d.keywords?.length) {
      const hit = d.keywords.some((k) => haystack.includes(normText(k)));
      if (!hit) {
        // Motorisation/boîte inconnue : on garde l'alerte mais "à vérifier".
        if (technical) continue;
        confidence = 'a-verifier';
      }
    }
    if (!year && d.years) confidence = 'a-verifier';
    out.push({ defect: d, confidence });
  }
  return out.sort(
    (a, b) =>
      (SEVERITY_ORDER[a.defect.severity] ?? 9) - (SEVERITY_ORDER[b.defect.severity] ?? 9) ||
      (a.confidence === b.confidence ? 0 : a.confidence === 'probable' ? -1 : 1),
  );
}
