// VIN (numéro de série, champ E de la carte grise).

const WMI = {
  VF3: 'Peugeot', VR3: 'Peugeot', VF7: 'Citroën', VR7: 'Citroën', VR1: 'DS',
  VF1: 'Renault', VF6: 'Renault Trucks', UU1: 'Dacia', VF8: 'Matra',
  WVW: 'Volkswagen', WVG: 'Volkswagen', WV1: 'Volkswagen Utilitaires', WV2: 'Volkswagen Utilitaires',
  WAU: 'Audi', WUA: 'Audi', TRU: 'Audi', VSS: 'Seat', VSE: 'Seat', TMB: 'Skoda',
  WBA: 'BMW', WBS: 'BMW M', WBY: 'BMW i', WMW: 'Mini',
  WDD: 'Mercedes-Benz', W1K: 'Mercedes-Benz', WDB: 'Mercedes-Benz', WDC: 'Mercedes-Benz', W1N: 'Mercedes-Benz', WME: 'Smart',
  W0L: 'Opel', W0V: 'Opel', WF0: 'Ford', WF1: 'Ford',
  ZFA: 'Fiat', ZAR: 'Alfa Romeo', ZLA: 'Lancia', ZFF: 'Ferrari',
  VNK: 'Toyota', SB1: 'Toyota', JTD: 'Toyota', JTN: 'Toyota', JTE: 'Toyota', JTM: 'Toyota',
  SJN: 'Nissan', VSK: 'Nissan', JN1: 'Nissan', VNV: 'Nissan',
  KNA: 'Kia', KNE: 'Kia', U5Y: 'Kia', KMH: 'Hyundai', TMA: 'Hyundai', NLH: 'Hyundai',
  JMZ: 'Mazda', JMB: 'Mitsubishi', JSA: 'Suzuki', TSM: 'Suzuki', JHM: 'Honda', SHH: 'Honda',
  YV1: 'Volvo', YS3: 'Saab', SAL: 'Land Rover', SAJ: 'Jaguar', LRW: 'Tesla', '5YJ': 'Tesla', XP7: 'Tesla',
  VSX: 'Opel', VXK: 'Opel', LSJ: 'MG', TSJ: 'Lynk & Co',
};

const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

export function normalizeVin(input) {
  const vin = String(input ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (vin.length !== 17) return { valid: false, vin, error: 'Un VIN comporte 17 caractères.' };
  if (/[IOQ]/.test(vin)) return { valid: false, vin, error: 'Les lettres I, O et Q n’existent pas dans un VIN.' };
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return { valid: false, vin, error: 'Caractères non autorisés.' };
  return { valid: true, vin };
}

/** Décodage local (sans réseau) : constructeur et année indicative. */
export function decodeVinLocally(vin, now = new Date()) {
  const wmi = vin.slice(0, 3);
  const brand = WMI[wmi];
  // En Europe le 10e caractère (année) n'est pas obligatoire : résultat indicatif.
  const idx = YEAR_CODES.indexOf(vin[9]);
  let year;
  if (idx >= 0) {
    const maxYear = now.getFullYear() + 1;
    year = 1980 + idx;
    while (year + 30 <= maxYear) year += 30;
  }
  return { wmi, brand, yearHint: year };
}

/** Décodage en ligne via l'API publique et gratuite vPIC (NHTSA). */
export async function decodeVinOnline(vin, fetchImpl = fetch) {
  const res = await fetchImpl(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
  if (!res.ok) throw new Error(`Décodage VIN indisponible (${res.status}).`);
  const data = await res.json();
  const r = data.Results?.[0] || {};
  const clean = (v) => (v && v !== 'Not Applicable' && v !== '0' ? v : undefined);
  return {
    brand: clean(r.Make),
    model: clean(r.Model),
    year: clean(r.ModelYear) ? Number(r.ModelYear) : undefined,
    engineSize: clean(r.DisplacementL) ? `${Number(r.DisplacementL).toFixed(1)} L` : undefined,
    fuel: clean(r.FuelTypePrimary),
    body: clean(r.BodyClass),
    manufacturer: clean(r.Manufacturer),
    plantCountry: clean(r.PlantCountry),
  };
}
