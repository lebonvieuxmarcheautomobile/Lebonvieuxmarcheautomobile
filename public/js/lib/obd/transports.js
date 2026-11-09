// Transports vers l'adaptateur ELM327.
//  - BLE  : Web Bluetooth (Chrome / Edge sur Android, Windows, macOS, ChromeOS).
//           Les adaptateurs "Bluetooth classique" (SPP) ne sont PAS accessibles depuis un navigateur.
//  - USB  : Web Serial (Chrome / Edge sur ordinateur).
//  - Démo : simulateur intégré pour découvrir l'outil sans adaptateur.

// Services GATT utilisés par les clones ELM327 BLE les plus répandus.
const BLE_SERVICES = [
  0xfff0, // nombreux clones (FFF1 notify / FFF2 write)
  0xffe0, // module type HM-10 (FFE1 notify+write)
  0x18f0, // Vgate iCar Pro BLE (2AF0 notify / 2AF1 write)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // OBDLink / certains Vgate
  0xbeef,
];

export const capabilities = () => ({
  ble: typeof navigator !== 'undefined' && !!navigator.bluetooth,
  serial: typeof navigator !== 'undefined' && !!navigator.serial,
});

export class BleTransport {
  static async connect() {
    if (!navigator.bluetooth) throw new Error('Web Bluetooth n’est pas disponible sur ce navigateur.');
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES });
    const server = await device.gatt.connect();
    let notifyChar;
    let writeChar;
    for (const uuid of BLE_SERVICES) {
      let service;
      try {
        service = await server.getPrimaryService(uuid);
      } catch {
        continue;
      }
      for (const c of await service.getCharacteristics()) {
        if (!notifyChar && (c.properties.notify || c.properties.indicate)) notifyChar = c;
        if (!writeChar && (c.properties.write || c.properties.writeWithoutResponse)) writeChar = c;
      }
      if (notifyChar && writeChar) break;
    }
    if (!notifyChar || !writeChar) {
      device.gatt.disconnect();
      throw new Error('Adaptateur non reconnu : vérifiez qu’il s’agit bien d’un modèle Bluetooth LE (BLE).');
    }
    const t = new BleTransport(device, notifyChar, writeChar);
    await notifyChar.startNotifications();
    return t;
  }

  constructor(device, notifyChar, writeChar) {
    this.name = device.name || 'Adaptateur BLE';
    this.device = device;
    this.writeChar = writeChar;
    this.listeners = [];
    const dec = new TextDecoder();
    notifyChar.addEventListener('characteristicvaluechanged', (e) => {
      const s = dec.decode(e.target.value);
      this.listeners.forEach((fn) => fn(s));
    });
    device.addEventListener('gattserverdisconnected', () => this.onDisconnect?.());
  }

  onData(fn) {
    this.listeners.push(fn);
  }

  async write(s) {
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < bytes.length; i += 20) {
      const chunk = bytes.slice(i, i + 20);
      if (this.writeChar.properties.writeWithoutResponse) await this.writeChar.writeValueWithoutResponse(chunk);
      else await this.writeChar.writeValue(chunk);
    }
  }

  async close() {
    if (this.device.gatt.connected) this.device.gatt.disconnect();
  }
}

export class SerialTransport {
  static async connect(baudRate = 38400) {
    if (!navigator.serial) throw new Error('Web Serial n’est pas disponible sur ce navigateur.');
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate });
    return new SerialTransport(port);
  }

  constructor(port) {
    this.name = 'Adaptateur USB';
    this.port = port;
    this.listeners = [];
    this.writer = port.writable.getWriter();
    this.reading = this.readLoop();
  }

  async readLoop() {
    const dec = new TextDecoder();
    while (this.port.readable) {
      this.reader = this.port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) return;
          const s = dec.decode(value);
          this.listeners.forEach((fn) => fn(s));
        }
      } catch {
        return;
      } finally {
        this.reader.releaseLock();
      }
    }
  }

  onData(fn) {
    this.listeners.push(fn);
  }

  async write(s) {
    await this.writer.write(new TextEncoder().encode(s));
  }

  async close() {
    try {
      await this.reader?.cancel();
      this.writer.releaseLock();
      await this.port.close();
    } catch {
      /* déjà fermé */
    }
  }
}

/** Simulateur d'ELM327 : moteur au ralenti qui monte en température, 2 codes défaut. */
export class SimulatedTransport {
  static async connect() {
    return new SimulatedTransport();
  }

  constructor() {
    this.name = 'Simulateur (démo)';
    this.listeners = [];
    this.start = Date.now();
    this.dtcs = ['0301', '0420'];
    this.pending = ['0171'];
  }

  onData(fn) {
    this.listeners.push(fn);
  }

  reply(s) {
    setTimeout(() => this.listeners.forEach((fn) => fn(s + '\r\r>')), 40 + Math.random() * 60);
  }

  async write(raw) {
    const cmd = raw.trim().toUpperCase();
    const t = (Date.now() - this.start) / 1000;
    const b = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).toUpperCase().padStart(2, '0');
    const w = (n) => b(Math.floor(n / 256)) + b(n % 256);
    const rpm = 780 + Math.sin(t / 2) * 40 + (Math.sin(t / 9) > 0.7 ? 1500 : 0);
    const speed = Math.max(0, Math.sin(t / 9) * 50);

    if (cmd === 'ATZ') return this.reply('ELM327 v1.5');
    if (cmd === 'ATI') return this.reply('ELM327 v1.5 (simulé)');
    if (cmd === 'ATDPN') return this.reply('A6');
    if (cmd === 'ATRV') return this.reply(`${(14.1 + Math.sin(t) * 0.1).toFixed(1)}V`);
    if (cmd.startsWith('AT')) return this.reply('OK');

    const map = {
      '0100': '4100BE3FA813',
      '0101': `4101${b(0x80 | this.dtcs.length)}076500`,
      '010C': `410C${w(rpm * 4)}`,
      '010D': `410D${b(speed)}`,
      '0105': `4105${b(40 + Math.min(90, 20 + t * 2))}`,
      '010F': `410F${b(40 + 24)}`,
      '0104': `4104${b(60 + Math.sin(t) * 20)}`,
      '0111': `4111${b(35 + Math.sin(t / 3) * 10)}`,
      '012F': `412F${b(255 * 0.42)}`,
      '0142': `4142${w(14100 + Math.sin(t) * 100)}`,
      '0106': `4106${b(128 + Math.sin(t * 2) * 6)}`,
      '0107': `4107${b(138)}`,
      '010B': `410B${b(35 + Math.sin(t) * 5)}`,
      '0131': `4131${w(this.dtcs.length ? 12840 : 0)}`,
      '0121': `4121${w(this.dtcs.length ? 152 : 0)}`,
      '014E': `414E${w(this.dtcs.length ? 9000 : 1)}`,
      '0902': '014\r0:490201564633\r1:4343484E53454A\r2:54303030303030',
    };
    if (cmd === '03') return this.reply(`43${b(this.dtcs.length)}${this.dtcs.join('')}`);
    if (cmd === '07') return this.reply(`47${b(this.pending.length)}${this.pending.join('')}`);
    if (cmd === '04') {
      this.dtcs = [];
      this.pending = [];
      return this.reply('44');
    }
    return this.reply(map[cmd] ?? 'NO DATA');
  }

  async close() {}
}
