import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodePid,
  decodeDtc,
  parseDtcResponse,
  parseVinResponse,
  parseMonitorStatus,
  isCanProtocol,
  isErrorResponse,
  Elm327,
} from '../public/js/lib/obd/elm327.js';
import { SimulatedTransport } from '../public/js/lib/obd/transports.js';
import { describeDtc } from '../public/js/data/dtc-codes.js';

test('PID mode 01, avec ou sans espaces', () => {
  assert.equal(decodePid('41 0C 1A F8\r\r>', '0C'), 1726);
  assert.equal(decodePid('410C1AF8', '0C'), 1726);
  assert.equal(decodePid('SEARCHING...\r41 05 7B\r>', '05'), 83);
  assert.equal(decodePid('41 42 36 B0', '42'), 14);
  assert.equal(decodePid('41 0D 32', '0D'), 50);
  assert.equal(decodePid('NO DATA', '0D'), null);
});

test('décodage d’un code défaut', () => {
  assert.equal(decodeDtc('0133'), 'P0133');
  assert.equal(decodeDtc('4123'), 'C0123');
  assert.equal(decodeDtc('8100'), 'B0100');
  assert.equal(decodeDtc('C101'), 'U0101');
  assert.equal(decodeDtc('1234'), 'P1234');
});

test('mode 03 CAN (une trame)', () => {
  assert.deepEqual(parseDtcResponse('43 02 01 33 04 20\r\r>', { can: true }), ['P0133', 'P0420']);
  assert.deepEqual(parseDtcResponse('43 00\r>', { can: true }), []);
});

test('mode 03 CAN multi-trames', () => {
  const raw = '00A\r0: 43 04 01 33 02 21\r1: 03 01 04 20 00 00\r\r>';
  assert.deepEqual(parseDtcResponse(raw, { can: true }), ['P0133', 'P0221', 'P0301', 'P0420']);
});

test('mode 03 protocoles anciens (ISO 9141 / KWP)', () => {
  const raw = '43 01 33 00 00 00 00\r43 03 01 04 20 00 00\r>';
  assert.deepEqual(parseDtcResponse(raw, { can: false }), ['P0133', 'P0301', 'P0420']);
});

test('mode 07 et erreurs', () => {
  assert.deepEqual(parseDtcResponse('47 01 01 71', { can: true, mode: '07' }), ['P0171']);
  assert.deepEqual(parseDtcResponse('NO DATA\r>', { can: true }), []);
  assert.ok(isErrorResponse('UNABLE TO CONNECT\r>'));
  assert.ok(!isErrorResponse('41 0C 1A F8'));
});

test('VIN CAN multi-trames', () => {
  const raw = '014\r0: 49 02 01 56 46 33\r1: 43 43 48 4E 53 45 4A\r2: 54 30 30 30 30 30 30\r>';
  assert.equal(parseVinResponse(raw), 'VF3CCHNSEJT000000');
});

test('readiness : moniteurs non prêts', () => {
  // MIL allumé, 2 codes ; essence ; catalyseur + EVAP + sonde supportés, catalyseur et EVAP non prêts
  const s = parseMonitorStatus('41 01 82 07 25 05');
  assert.equal(s.mil, true);
  assert.equal(s.dtcCount, 2);
  assert.equal(s.diesel, false);
  assert.equal(s.notReady, 2);
  assert.deepEqual(s.monitors.filter((m) => !m.ready).map((m) => m.name), ['Catalyseur', 'Système EVAP']);
});

test('protocole CAN', () => {
  assert.ok(isCanProtocol('A6'));
  assert.ok(isCanProtocol('8'));
  assert.ok(!isCanProtocol('A3'));
});

test('descriptions de codes', () => {
  assert.equal(describeDtc('P0420').severity, 1);
  assert.match(describeDtc('P1234').text, /constructeur/);
  assert.match(describeDtc('P0399').text, /Allumage/);
});

test('session complète sur le simulateur', async () => {
  const elm = new Elm327(new SimulatedTransport());
  const info = await elm.init();
  assert.equal(info.can, true);
  const dtcs = await elm.readDtcs();
  assert.deepEqual(dtcs.stored, ['P0301', 'P0420']);
  assert.deepEqual(dtcs.pending, ['P0171']);
  assert.equal(await elm.readVin(), 'VF3CCHNSEJT000000');
  const rpm = await elm.readPid('0C');
  assert.ok(rpm > 500 && rpm < 3000);
  assert.ok((await elm.readVoltage()) > 13);
  const st = await elm.readStatus();
  assert.equal(st.mil, true);
  assert.ok(await elm.clearDtcs());
  assert.deepEqual((await elm.readDtcs()).stored, []);
});

test('lien « Ouvrir dans Chrome » sur Android', async () => {
  const { chromeIntentUrl } = await import('../public/js/views/diagnostic.js');
  assert.equal(
    chromeIntentUrl('https://exemple.fr/app/#diagnostic'),
    'intent://exemple.fr/app/#diagnostic#Intent;scheme=https;package=com.android.chrome;end',
  );
});
