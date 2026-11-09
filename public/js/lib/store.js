// Stockage local (sur l'appareil uniquement). Aucune donnée n'est envoyée à un serveur.

const PREFIX = 'lbvma:v1:';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const store = {
  get: read,
  set: write,

  vehicles: () => read('vehicles', []),
  saveVehicles: (list) => write('vehicles', list),
  entries: (vehicleId) => read('entries', []).filter((e) => !vehicleId || e.vehicleId === vehicleId),
  allEntries: () => read('entries', []),
  saveEntries: (list) => write('entries', list),

  checklist: () => read('checklist', {}),
  saveChecklist: (c) => write('checklist', c),

  settings: () => read('settings', {}),
  saveSettings: (s) => write('settings', { ...read('settings', {}), ...s }),

  lastLookup: () => read('lastLookup', null),
  saveLastLookup: (v) => write('lastLookup', v),

  exportAll() {
    return { app: 'lebonvieuxmarcheautomobile', version: 1, exportedAt: new Date().toISOString(), vehicles: read('vehicles', []), entries: read('entries', []) };
  },

  importAll(data) {
    if (!data || data.app !== 'lebonvieuxmarcheautomobile' || !Array.isArray(data.vehicles) || !Array.isArray(data.entries)) {
      throw new Error('Fichier de sauvegarde non reconnu.');
    }
    write('vehicles', data.vehicles);
    write('entries', data.entries);
  },
};
