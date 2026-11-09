// Protocole ELM327 (adaptateurs OBD2 "low cost" ~20 €) : commandes AT, PID du mode 01,
// lecture/effacement des codes défaut (modes 03, 07, 04), VIN (mode 09).
// Les fonctions de décodage sont pures et testées (test/obd.test.js).

const ERRORS = ['NO DATA', 'UNABLE TO CONNECT', 'ERROR', 'STOPPED', 'BUS INIT', 'CAN ERROR', 'BUS BUSY', 'FB ERROR', 'DATA ERROR', '?'];

/** Découpe la réponse brute en lignes utiles. */
export function cleanLines(raw) {
  return String(raw ?? '')
    .replace(/>/g, '')
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l && !/^SEARCHING/i.test(l) && !/^BUS INIT/i.test(l));
}

export function isErrorResponse(raw) {
  const lines = cleanLines(raw);
  if (!lines.length) return true;
  return lines.every((l) => ERRORS.some((e) => l.toUpperCase().includes(e)) && !/^[0-9A-F\s:]+$/i.test(l));
}

const hex = (l) => l.replace(/\s+/g, '').toUpperCase();

/** Concatène les octets de données (gère les trames CAN multiples "0:", "1:" ...). */
function joinedHex(raw) {
  const lines = cleanLines(raw).map(hex);
  const framed = lines.filter((l) => /^[0-9A-F]:/.test(l));
  if (framed.length) return framed.map((l) => l.slice(2)).join('');
  return lines.filter((l) => /^[0-9A-F]+$/.test(l)).join('');
}

/** Extrait les octets A, B, C... d'une réponse mode 01 pour un PID donné. */
export function parsePidBytes(raw, pid) {
  const h = joinedHex(raw);
  const marker = '41' + pid.toUpperCase();
  for (let i = h.indexOf(marker); i !== -1; i = h.indexOf(marker, i + 1)) {
    if (i % 2 === 0) {
      const data = h.slice(i + marker.length).match(/../g) || [];
      return data.map((b) => parseInt(b, 16));
    }
  }
  return null;
}

/** PID temps réel les plus utiles et largement supportés. */
export const PIDS = {
  '0C': { label: 'Régime moteur', unit: 'tr/min', bytes: 2, decode: ([a, b]) => Math.round((a * 256 + b) / 4) },
  '0D': { label: 'Vitesse', unit: 'km/h', bytes: 1, decode: ([a]) => a },
  '05': { label: 'Température liquide de refroidissement', unit: '°C', bytes: 1, decode: ([a]) => a - 40 },
  '0F': { label: 'Température air d’admission', unit: '°C', bytes: 1, decode: ([a]) => a - 40 },
  '04': { label: 'Charge moteur', unit: '%', bytes: 1, decode: ([a]) => Math.round((a * 100) / 255) },
  '11': { label: 'Position papillon', unit: '%', bytes: 1, decode: ([a]) => Math.round((a * 100) / 255) },
  '2F': { label: 'Niveau de carburant', unit: '%', bytes: 1, decode: ([a]) => Math.round((a * 100) / 255) },
  '42': { label: 'Tension calculateur', unit: 'V', bytes: 2, decode: ([a, b]) => Math.round((a * 256 + b) / 10) / 100 },
  '06': { label: 'Correction carburant court terme', unit: '%', bytes: 1, decode: ([a]) => Math.round(((a - 128) * 100) / 128) },
  '07': { label: 'Correction carburant long terme', unit: '%', bytes: 1, decode: ([a]) => Math.round(((a - 128) * 100) / 128) },
  '0B': { label: 'Pression collecteur', unit: 'kPa', bytes: 1, decode: ([a]) => a },
  '31': { label: 'Distance depuis effacement des codes', unit: 'km', bytes: 2, decode: ([a, b]) => a * 256 + b },
  '21': { label: 'Distance parcourue voyant allumé', unit: 'km', bytes: 2, decode: ([a, b]) => a * 256 + b },
  '4E': { label: 'Temps depuis effacement des codes', unit: 'min', bytes: 2, decode: ([a, b]) => a * 256 + b },
};

export function decodePid(raw, pid) {
  const def = PIDS[pid];
  const bytes = parsePidBytes(raw, pid);
  if (!def || !bytes || bytes.length < def.bytes) return null;
  return def.decode(bytes);
}

/** "0133" -> "P0133", "C101" -> "U0101"... */
export function decodeDtc(word) {
  const n = parseInt(word[0], 16);
  return 'PCBU'[n >> 2] + (n & 3) + word.slice(1).toUpperCase();
}

/**
 * Codes défaut (mode 03 mémorisés, 07 en attente, 0A permanents).
 * @param {boolean} can  protocole CAN (ISO 15765) : l'octet après 43 est le nombre de codes.
 */
export function parseDtcResponse(raw, { can = true, mode = '03' } = {}) {
  if (isErrorResponse(raw)) return [];
  const resp = (0x40 + parseInt(mode, 16)).toString(16).toUpperCase();
  const lines = cleanLines(raw).map(hex);
  const codes = [];
  const push = (w) => {
    if (w.length === 4 && w !== '0000') codes.push(decodeDtc(w));
  };

  if (can) {
    const framed = lines.filter((l) => /^[0-9A-F]:/.test(l));
    const messages = framed.length ? [framed.map((l) => l.slice(2)).join('')] : lines;
    for (const m of messages) {
      if (!m.startsWith(resp)) continue;
      const count = parseInt(m.slice(2, 4), 16);
      const body = m.slice(4);
      for (let i = 0; i < count && (i + 1) * 4 <= body.length; i++) push(body.slice(i * 4, i * 4 + 4));
    }
  } else {
    for (const l of lines) {
      if (!l.startsWith(resp)) continue;
      const body = l.slice(2, 14);
      for (let i = 0; i + 4 <= body.length; i += 4) push(body.slice(i, i + 4));
    }
  }
  return [...new Set(codes)];
}

/** VIN via mode 09 PID 02 (CAN multi-trames ou ancien protocole ligne par ligne). */
export function parseVinResponse(raw) {
  if (isErrorResponse(raw)) return null;
  const lines = cleanLines(raw).map(hex);
  let data = '';
  const framed = lines.filter((l) => /^[0-9A-F]:/.test(l));
  if (framed.length) {
    data = framed.map((l) => l.slice(2)).join('');
    const i = data.indexOf('4902');
    if (i >= 0) data = data.slice(i + 6); // 49 02 + nombre d'éléments
  } else {
    data = lines.filter((l) => l.startsWith('4902')).map((l) => l.slice(6)).join('');
  }
  const ascii = (data.match(/../g) || [])
    .map((b) => parseInt(b, 16))
    .filter((c) => c >= 0x30 && c <= 0x5a)
    .map((c) => String.fromCharCode(c))
    .join('')
    .replace(/[^A-HJ-NPR-Z0-9]/g, '');
  return ascii.length >= 17 ? ascii.slice(-17) : null;
}

const SPARK_MONITORS = ['Catalyseur', 'Catalyseur chauffé', 'Système EVAP', 'Air secondaire', 'Climatisation', 'Sonde lambda', 'Chauffage sonde lambda', 'Vanne EGR / VVT'];
const DIESEL_MONITORS = ['Catalyseur NMHC', 'Système NOx / SCR', null, 'Pression de suralimentation', null, 'Capteur gaz d’échappement', 'Filtre à particules', 'Vanne EGR / VVT'];

/**
 * Mode 01 PID 01 : voyant moteur, nombre de codes et état des moniteurs ("readiness").
 * Des moniteurs "non prêts" sur une voiture d'occasion = codes effacés récemment.
 */
export function parseMonitorStatus(raw) {
  const b = parsePidBytes(raw, '01');
  if (!b || b.length < 4) return null;
  const [A, B, C, D] = b;
  const diesel = (B & 0x08) !== 0;
  const monitors = [];
  const common = ['Ratés d’allumage', 'Système carburant', 'Composants'];
  common.forEach((name, i) => {
    if (B & (1 << i)) monitors.push({ name, ready: (B & (1 << (i + 4))) === 0 });
  });
  (diesel ? DIESEL_MONITORS : SPARK_MONITORS).forEach((name, i) => {
    if (name && C & (1 << i)) monitors.push({ name, ready: (D & (1 << i)) === 0 });
  });
  return { mil: (A & 0x80) !== 0, dtcCount: A & 0x7f, diesel, monitors, notReady: monitors.filter((m) => !m.ready).length };
}

/** Numéro de protocole (ATDPN) : 6 à C = CAN. */
export function isCanProtocol(dpn) {
  const p = (cleanLines(dpn)[0] || '').toUpperCase().replace(/^A/, '');
  return /^[6-9A-C]$/.test(p);
}

/**
 * Session ELM327 au-dessus d'un "transport" (Bluetooth BLE, USB série ou simulateur)
 * qui expose write(string) et onData(callback).
 */
export class Elm327 {
  constructor(transport, { log = () => {} } = {}) {
    this.t = transport;
    this.log = log;
    this.buffer = '';
    this.queue = Promise.resolve();
    this.pending = null;
    this.can = true;
    this.t.onData((chunk) => {
      this.buffer += chunk;
      if (this.pending && this.buffer.includes('>')) {
        const out = this.buffer;
        this.buffer = '';
        const p = this.pending;
        this.pending = null;
        p.resolve(out);
      }
    });
  }

  send(cmd, timeout = 6000) {
    const run = () =>
      new Promise((resolve, reject) => {
        this.buffer = '';
        const timer = setTimeout(() => {
          this.pending = null;
          reject(new Error(`Pas de réponse à ${cmd}`));
        }, timeout);
        this.pending = {
          resolve: (v) => {
            clearTimeout(timer);
            this.log(`> ${cmd}\n${cleanLines(v).join('\n')}`);
            resolve(v);
          },
        };
        this.t.write(cmd + '\r').catch((e) => {
          clearTimeout(timer);
          this.pending = null;
          reject(e);
        });
      });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  async init() {
    await this.send('ATZ', 8000).catch(() => this.send('ATZ', 8000));
    for (const c of ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATAT1', 'ATSP0']) await this.send(c);
    // La 1re requête déclenche la recherche automatique du protocole.
    const first = await this.send('0100', 20000);
    if (isErrorResponse(first)) throw new Error('Le véhicule ne répond pas. Contact mis ? Prise OBD bien enfoncée ?');
    this.can = isCanProtocol(await this.send('ATDPN'));
    const id = cleanLines(await this.send('ATI')).join(' ');
    return { adapter: id, can: this.can };
  }

  async readPid(pid) {
    return decodePid(await this.send('01' + pid), pid);
  }

  async readVoltage() {
    const v = cleanLines(await this.send('ATRV')).join('').match(/(\d+(?:\.\d+)?)V/i);
    return v ? Number(v[1]) : null;
  }

  async readDtcs() {
    const stored = parseDtcResponse(await this.send('03', 10000), { can: this.can, mode: '03' });
    const pending = parseDtcResponse(await this.send('07', 10000), { can: this.can, mode: '07' });
    return { stored, pending: pending.filter((c) => !stored.includes(c)) };
  }

  async clearDtcs() {
    const r = await this.send('04', 10000);
    return !isErrorResponse(r);
  }

  async readStatus() {
    return parseMonitorStatus(await this.send('0101'));
  }

  async readVin() {
    return parseVinResponse(await this.send('0902', 10000));
  }
}
