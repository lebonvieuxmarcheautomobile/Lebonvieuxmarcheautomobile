// Fournisseurs de données "immatriculation -> caractéristiques techniques".
//
// En France il n'existe pas d'API publique gratuite qui donne les caractéristiques
// d'un véhicule à partir de sa plaque : il faut passer par un fournisseur payant
// (agréé SIV). La clé reste côté serveur, jamais dans le navigateur.
//
// Seules des données TECHNIQUES du véhicule sont renvoyées au client. Les
// éventuels champs relatifs au titulaire sont volontairement ignorés.

import { DEMO_VEHICLES } from '../public/js/data/demo-vehicles.js';

export class LookupError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && String(v).trim() !== '');

/** Convertit la réponse RegCheck (CheckFrance) en fiche véhicule normalisée. */
export function mapRegCheck(json, plate) {
  const x = json.ExtendedData || {};
  const year = Number.parseInt(pick(json.RegistrationYear, x.datePremiereMiseencirculation?.slice(-4)), 10);
  return {
    plate,
    source: 'RegCheck',
    brand: pick(json.CarMake?.CurrentTextValue, json.MakeDescription?.CurrentTextValue, x.marque),
    model: pick(json.CarModel?.CurrentTextValue, json.ModelDescription?.CurrentTextValue, x.modele),
    version: pick(x.version, json.Description),
    year: Number.isFinite(year) ? year : undefined,
    firstRegistration: pick(x.datePremiereMiseencirculation),
    fuel: pick(json.FuelType?.CurrentTextValue, x.energieNGC),
    engine: pick(x.libVersion, json.Description),
    engineSize: pick(json.EngineSize?.CurrentTextValue, x.cylindree),
    powerHp: pick(x.puissanceDyn),
    fiscalHp: pick(x.puissance),
    gearbox: pick(x.boiteDeVitesse),
    body: pick(x.carrosserieCG, json.BodyStyle?.CurrentTextValue),
    vin: pick(json.VechileIdentificationNumber, x.vin),
    co2: pick(x.co2),
    color: pick(x.couleur),
    doors: pick(x.nbPortes, json.NumberOfDoors?.CurrentTextValue),
  };
}

async function regcheckLookup(plate, { username, fetchImpl = fetch }) {
  if (!username) throw new LookupError('REGCHECK_USERNAME non configuré sur le serveur.', 500);
  const url = new URL('https://www.regcheck.org.uk/api/reg.asmx/CheckFrance');
  url.searchParams.set('RegistrationNumber', plate);
  url.searchParams.set('username', username);
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
  const body = await res.text();
  if (!res.ok) throw new LookupError(`Le fournisseur a répondu ${res.status}.`, res.status === 404 ? 404 : 502);
  const m = body.match(/<vehicleJson>([\s\S]*?)<\/vehicleJson>/);
  if (!m) throw new LookupError('Véhicule introuvable chez le fournisseur.', 404);
  let json;
  try {
    json = JSON.parse(decodeXmlEntities(m[1]));
  } catch {
    throw new LookupError('Réponse du fournisseur illisible.');
  }
  return mapRegCheck(json, plate);
}

function demoLookup(plate) {
  const v = DEMO_VEHICLES[plate];
  if (!v) {
    throw new LookupError(
      `Mode démo : seules les plaques d'exemple sont reconnues (${Object.keys(DEMO_VEHICLES).join(', ')}).`,
      404,
    );
  }
  return { ...v, plate, source: 'Démo' };
}

export function createVehicleProvider(env = process.env, fetchImpl = fetch) {
  const name = (env.PLATE_API_PROVIDER || 'demo').toLowerCase();
  switch (name) {
    case 'regcheck':
      return { name, lookup: (plate) => regcheckLookup(plate, { username: env.REGCHECK_USERNAME, fetchImpl }) };
    case 'demo':
      return { name, lookup: async (plate) => demoLookup(plate) };
    default:
      throw new Error(`PLATE_API_PROVIDER inconnu : ${name}`);
  }
}
