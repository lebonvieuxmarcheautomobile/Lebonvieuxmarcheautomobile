// Campagnes de rappel : open data RappelConso (data.economie.gouv.fr, API Opendatasoft v2.1).
// Depuis 2021 les rappels de véhicules en France y sont publiés. La correspondance se fait
// par marque / modèle : la confirmation définitive se fait avec le VIN auprès de la marque.

export const DEFAULT_DATASET = 'rappelconso-v2-gtin-espaces';

const quote = (s) => String(s).replace(/["\\]/g, ' ').trim();

export function buildRecallsUrl({ brand, model }, dataset = DEFAULT_DATASET) {
  const url = new URL(`https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/${dataset || DEFAULT_DATASET}/records`);
  const terms = [brand, model].filter(Boolean).map((t) => `search("${quote(t)}")`);
  url.searchParams.set('where', terms.join(' AND '));
  url.searchParams.set('limit', '50');
  return url.toString();
}

const first = (o, ...keys) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== '') return Array.isArray(v) ? v.join(', ') : v;
  }
  return undefined;
};

export function isVehicleRecall(rec) {
  const cat = `${first(rec, 'categorie_produit', 'categorie_de_produit') || ''} ${first(rec, 'sous_categorie_produit', 'sous_categorie_de_produit') || ''}`;
  return /automobile|d[ée]placement|v[ée]hicule|voiture/i.test(cat);
}

export function normalizeRecall(rec) {
  return {
    id: first(rec, 'numero_fiche', 'reference_fiche', 'id', 'rappel_guid'),
    date: first(rec, 'date_publication', 'date_de_publication'),
    brand: first(rec, 'marque_produit', 'nom_de_la_marque_du_produit'),
    models: first(rec, 'modeles_ou_references', 'noms_des_modeles_ou_references'),
    subCategory: first(rec, 'sous_categorie_produit', 'sous_categorie_de_produit'),
    reason: first(rec, 'motif_rappel', 'motif_du_rappel'),
    risks: first(rec, 'risques_encourus', 'risques_encourus_par_le_consommateur'),
    action: first(rec, 'conduites_a_tenir_par_le_consommateur', 'conduite_a_tenir_par_le_consommateur'),
    period: first(rec, 'date_debut_commercialisation', 'date_debut_fin_de_commercialisation'),
    identification: first(rec, 'identification_produits', 'informations_complementaires'),
    url: first(rec, 'lien_vers_la_fiche_rappel'),
  };
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Classe les rappels : ceux qui citent explicitement le modèle en premier. */
export function rankRecalls(recalls, model) {
  const m = norm(model).split(/\s+/)[0];
  return [...recalls]
    .map((r) => ({ ...r, mentionsModel: !!m && norm(`${r.models} ${r.identification}`).includes(m) }))
    .sort((a, b) => Number(b.mentionsModel) - Number(a.mentionsModel) || String(b.date).localeCompare(String(a.date)));
}

/** Recherche via le serveur (/api/recalls), sinon directement auprès de l'open data. */
export async function fetchRecalls({ brand, model }, fetchImpl = fetch) {
  let viaServer;
  try {
    viaServer = await fetchImpl(`/api/recalls?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model || '')}`);
  } catch {
    /* serveur absent : on tente en direct */
  }
  if (viaServer && (viaServer.headers.get('content-type') || '').includes('json')) {
    const data = await viaServer.json();
    if (!viaServer.ok) throw new Error(data.error || 'Rappels indisponibles.');
    return rankRecalls(data.recalls, model);
  }
  let res;
  try {
    res = await fetchImpl(buildRecallsUrl({ brand, model }));
  } catch {
    throw new Error('RappelConso est injoignable (connexion ?).');
  }
  if (!res.ok) throw new Error(`RappelConso a répondu ${res.status}.`);
  const data = await res.json();
  return rankRecalls((data.results || []).filter(isVehicleRecall).map(normalizeRecall), model);
}
