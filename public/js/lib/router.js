/**
 * Liens internes au format « #route-paramètre » (ex. #carnet-<id>, #atelier-tuto-vidange),
 * seul format transmis par certains hébergeurs. L'ancien format « #/route/param » reste accepté.
 */
export function parseHash(hash) {
  const h = decodeURIComponent(String(hash || '').replace(/^#/, ''));
  if (h.startsWith('/')) {
    const [name = '', ...params] = h.slice(1).split('/');
    return { name: name || 'accueil', params };
  }
  const i = h.indexOf('-');
  const name = (i < 0 ? h : h.slice(0, i)) || 'accueil';
  const rest = i < 0 ? '' : h.slice(i + 1);
  if (!rest) return { name, params: [] };
  if (name === 'atelier') {
    const j = rest.indexOf('-');
    return { name, params: j < 0 ? [rest] : [rest.slice(0, j), rest.slice(j + 1)] };
  }
  return { name, params: [rest] };
}
