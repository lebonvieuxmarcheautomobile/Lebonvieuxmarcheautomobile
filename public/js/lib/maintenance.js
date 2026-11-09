// Calculs du carnet d'entretien : échéances de contrôle technique et rappels d'entretien.

export function parseDate(s) {
  if (!s) return undefined;
  if (s instanceof Date) return new Date(s.getTime());
  const fr = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return undefined;
}

export function toIsoDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Ajoute des mois sans débordement (31/01 + 1 mois = 28 ou 29/02). */
export function addMonths(date, months) {
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
}

const DAY = 86_400_000;
export const daysBetween = (a, b) => Math.round((b - a) / DAY);

/**
 * Prochaine échéance de contrôle technique (véhicule particulier, France) :
 *  - 1er CT dans les 6 mois précédant le 4e anniversaire de la 1re immatriculation ;
 *  - puis tous les 2 ans ;
 *  - contre-visite à réaliser dans les 2 mois ; l'échéance suivante court
 *    à partir de la date de la visite initiale.
 *
 * @param {{firstRegistration?:string}} vehicle
 * @param {{date:string, result:'favorable'|'contre-visite'|'critique', counterVisit?:boolean}[]} cts
 */
export function nextTechnicalInspection(vehicle, cts = [], today = new Date()) {
  const sorted = [...cts].filter((c) => c && parseDate(c.date)).sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const periodic = sorted.filter((c) => !c.counterVisit);
  const last = periodic.at(-1);

  let due;
  let kind = 'periodique';
  if (!last) {
    const reg = parseDate(vehicle.firstRegistration);
    if (!reg) return { status: 'inconnu', message: 'Renseignez la date de 1re immatriculation pour calculer l’échéance.' };
    due = addMonths(reg, 48);
    kind = 'premier';
  } else if (last.result === 'favorable') {
    due = addMonths(parseDate(last.date), 24);
  } else {
    const lastDate = parseDate(last.date);
    const passed = sorted.some((c) => c.counterVisit && parseDate(c.date) >= lastDate && c.result === 'favorable');
    if (passed) {
      due = addMonths(lastDate, 24);
    } else {
      due = addMonths(lastDate, 2);
      kind = 'contre-visite';
    }
  }

  const days = daysBetween(today, due);
  const status = days < 0 ? 'depasse' : days <= 60 ? 'bientot' : 'ok';
  const labels = { premier: '1er contrôle technique', periodique: 'Contrôle technique', 'contre-visite': 'Contre-visite' };
  return { status, kind, label: labels[kind], due: toIsoDate(due), days };
}

export const SERVICE_RULES = [
  { type: 'vidange', label: 'Vidange + filtre à huile', kmKey: 'oilIntervalKm', monthsKey: 'oilIntervalMonths', defaultKm: 15000, defaultMonths: 12 },
  { type: 'distribution', label: 'Courroie / kit de distribution', kmKey: 'beltIntervalKm', monthsKey: 'beltIntervalMonths' },
  { type: 'freins', label: 'Liquide de frein', kmKey: null, monthsKey: 'brakeFluidMonths', defaultMonths: 24, match: (e) => e.type === 'freins' && /liquide/i.test(e.title || '') },
];

/** Rappels d'entretien kilométriques et calendaires. */
export function serviceReminders(vehicle, entries = [], today = new Date()) {
  const km = Number(vehicle.mileage) || 0;
  const out = [];
  for (const rule of SERVICE_RULES) {
    const everyKm = rule.kmKey ? Number(vehicle[rule.kmKey]) || rule.defaultKm : undefined;
    const everyMonths = Number(vehicle[rule.monthsKey]) || rule.defaultMonths;
    if (!everyKm && !everyMonths) continue; // intervalle non renseigné (ex. distribution)

    const matches = entries.filter(rule.match || ((e) => e.type === rule.type)).filter((e) => parseDate(e.date));
    const last = matches.sort((a, b) => parseDate(b.date) - parseDate(a.date))[0];
    if (!last) {
      out.push({ type: rule.type, label: rule.label, status: 'inconnu', message: 'Aucune intervention enregistrée.' });
      continue;
    }
    const dueKm = everyKm && Number(last.mileage) ? Number(last.mileage) + everyKm : undefined;
    const dueDate = everyMonths ? addMonths(parseDate(last.date), everyMonths) : undefined;
    const kmLeft = dueKm !== undefined && km ? dueKm - km : undefined;
    const daysLeft = dueDate ? daysBetween(today, dueDate) : undefined;

    let status = 'ok';
    if ((kmLeft !== undefined && kmLeft < 0) || (daysLeft !== undefined && daysLeft < 0)) status = 'depasse';
    else if ((kmLeft !== undefined && kmLeft <= 1500) || (daysLeft !== undefined && daysLeft <= 30)) status = 'bientot';

    out.push({
      type: rule.type,
      label: rule.label,
      status,
      dueKm,
      kmLeft,
      due: dueDate ? toIsoDate(dueDate) : undefined,
      days: daysLeft,
    });
  }
  return out;
}

export function totalCost(entries = []) {
  return entries.reduce((s, e) => s + (Number(e.cost) || 0), 0);
}
