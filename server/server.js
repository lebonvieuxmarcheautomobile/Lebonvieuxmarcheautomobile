// Serveur minimal (aucune dépendance) :
//  - sert l'application (dossier public/)
//  - GET /api/config                 -> capacités du serveur
//  - GET /api/vehicle?plate=AB123CD  -> caractéristiques techniques (fournisseur configuré)
//  - GET /api/recalls?brand=&model=  -> proxy vers l'open data RappelConso
//
// Variables d'environnement :
//  PORT                (défaut 8080)
//  PLATE_API_PROVIDER  demo | regcheck   (défaut demo)
//  REGCHECK_USERNAME   identifiant RegCheck si PLATE_API_PROVIDER=regcheck
//  RAPPELCONSO_DATASET identifiant du jeu de données (défaut rappelconso-v2-gtin-espaces)

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVehicleProvider, LookupError } from './providers.js';
import { normalizePlate } from '../public/js/lib/plate.js';
import { buildRecallsUrl, normalizeRecall, isVehicleRecall } from '../public/js/lib/recalls.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'serial=(self), camera=(), microphone=()',
};

// Limitation de débit très simple pour protéger l'API payante.
const hits = new Map();
function rateLimited(ip, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(data));
}

let provider;
try {
  provider = createVehicleProvider();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/config') {
    return sendJson(res, 200, { plateProvider: provider.name, recalls: true });
  }

  if (url.pathname === '/api/vehicle') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return sendJson(res, 429, { error: 'Trop de recherches, réessayez dans une minute.' });
    const plate = normalizePlate(url.searchParams.get('plate'));
    if (!plate.valid) return sendJson(res, 400, { error: plate.error });
    try {
      const vehicle = await provider.lookup(plate.formatted);
      return sendJson(res, 200, { vehicle });
    } catch (err) {
      const status = err instanceof LookupError ? err.status : 502;
      if (!(err instanceof LookupError)) console.error('lookup', err);
      return sendJson(res, status, { error: err instanceof LookupError ? err.message : 'Recherche indisponible.' });
    }
  }

  if (url.pathname === '/api/recalls') {
    const brand = url.searchParams.get('brand') || '';
    const model = url.searchParams.get('model') || '';
    if (!brand) return sendJson(res, 400, { error: 'Marque requise.' });
    try {
      const upstream = await fetch(buildRecallsUrl({ brand, model }, process.env.RAPPELCONSO_DATASET), {
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) return sendJson(res, 502, { error: `RappelConso a répondu ${upstream.status}.` });
      const data = await upstream.json();
      const recalls = (data.results || []).filter(isVehicleRecall).map(normalizeRecall);
      return sendJson(res, 200, { recalls });
    } catch (err) {
      console.error('recalls', err);
      return sendJson(res, 502, { error: 'RappelConso est injoignable pour le moment.' });
    }
  }

  return sendJson(res, 404, { error: 'Route inconnue.' });
}

async function serveStatic(res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.resolve(ROOT, '.' + rel);
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end();
  }
  try {
    const st = await stat(filePath);
    if (!st.isFile()) throw new Error('not a file');
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || filePath.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300',
      ...SECURITY_HEADERS,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': MIME['.txt'], ...SECURITY_HEADERS });
    res.end('Introuvable');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, SECURITY_HEADERS);
    return res.end();
  }
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(res, url);
});

server.listen(PORT, () => {
  console.log(`AUTOnomie -> http://localhost:${PORT} (fournisseur plaque : ${provider.name})`);
});
