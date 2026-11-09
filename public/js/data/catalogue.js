// Catalogue de pièces et accessoires, organisé par famille.
// Chaque article renvoie vers une recherche sur le site Carter-Cash (lien externe) et vers
// les tutos de montage associés. Les prix et la disponibilité sont ceux du site marchand :
// l'application n'affiche aucun prix qu'elle ne peut pas garantir.

export const CATALOGUE = [
  {
    id: 'entretien',
    title: 'Entretien moteur',
    icon: '🛢️',
    items: [
      { id: 'huile', name: 'Huile moteur', query: 'huile moteur', tip: 'Respecter la norme constructeur (ex. PSA B71 2290, VW 504.00/507.00, Renault RN0720) et la viscosité (ex. 0W-20, 5W-30) indiquées dans le carnet.', tutos: ['vidange'] },
      { id: 'filtre-huile', name: 'Filtre à huile', query: 'filtre a huile', tip: 'À changer à chaque vidange. Choisir selon le moteur exact (cartouche ou filtre vissé).', tutos: ['vidange'] },
      { id: 'filtre-air', name: 'Filtre à air moteur', query: 'filtre a air', tip: 'Environ tous les 20 000 à 30 000 km, plus souvent en milieu poussiéreux.', tutos: ['filtre-air'] },
      { id: 'filtre-habitacle', name: 'Filtre d’habitacle', query: 'filtre habitacle', tip: 'Une fois par an. Version charbon actif recommandée en ville (odeurs, pollens).', tutos: ['filtre-habitacle'] },
      { id: 'filtre-gasoil', name: 'Filtre à carburant', query: 'filtre a gasoil', tip: 'Surtout sur diesel : purge et amorçage parfois nécessaires après remplacement.', tutos: [] },
      { id: 'bougies', name: 'Bougies d’allumage', query: 'bougie allumage', tip: 'Référence selon moteur (écartement pré-réglé). Remplacer le jeu complet.', tutos: ['bougies'] },
    ],
  },
  {
    id: 'freinage',
    title: 'Freinage',
    icon: '🛑',
    items: [
      { id: 'plaquettes', name: 'Plaquettes de frein', query: 'plaquettes de frein', tip: 'Toujours par essieu complet (gauche + droite). Vérifier le système de freinage (Bosch, TRW, ATE…) et la présence d’un témoin d’usure.', tutos: ['plaquettes'] },
      { id: 'disques', name: 'Disques de frein', query: 'disques de frein', tip: 'Remplacer si l’épaisseur est sous le minimum gravé sur le disque, toujours avec des plaquettes neuves.', tutos: ['plaquettes'] },
      { id: 'liquide-frein', name: 'Liquide de frein', query: 'liquide de frein dot 4', tip: 'DOT 4 le plus courant ; à renouveler environ tous les 2 ans. Ne jamais mélanger avec du DOT 5 (silicone).', tutos: [] },
    ],
  },
  {
    id: 'electricite',
    title: 'Batterie & électricité',
    icon: '🔋',
    items: [
      { id: 'batterie', name: 'Batterie', query: 'batterie voiture', tip: 'Respecter la capacité (Ah), le courant de démarrage (A), les dimensions et la polarité. Start & Stop : batterie EFB ou AGM obligatoire.', tutos: ['batterie'] },
      { id: 'ampoules', name: 'Ampoules (H7, H4, H1, W5W…)', query: 'ampoule h7', tip: 'Le type est indiqué dans le manuel ou sur l’ampoule. Changer par paire pour un éclairage homogène.', tutos: ['ampoule'] },
      { id: 'fusibles', name: 'Fusibles', query: 'fusibles voiture', tip: 'Toujours remplacer par un fusible de même calibre (couleur).', tutos: [] },
      { id: 'booster', name: 'Booster / chargeur de batterie', query: 'booster batterie', tip: 'Utile en hiver ou pour un véhicule peu utilisé.', tutos: ['batterie'] },
    ],
  },
  {
    id: 'visibilite',
    title: 'Visibilité',
    icon: '🌧️',
    items: [
      { id: 'balais', name: 'Balais d’essuie-glace', query: 'balais essuie glace', tip: 'Longueur conducteur et passager souvent différentes ; vérifier le type de fixation.', tutos: ['essuie-glace'] },
      { id: 'lave-glace', name: 'Liquide lave-glace', query: 'lave glace', tip: 'Version hiver (antigel) dès l’automne.', tutos: ['niveaux'] },
    ],
  },
  {
    id: 'pneus',
    title: 'Pneus & roues',
    icon: '🛞',
    items: [
      { id: 'pneu', name: 'Pneus', query: 'pneu', tip: 'Dimension sur le flanc (ex. 205/55 R16 91V). Pneus 4 saisons ou hiver selon les obligations « loi Montagne ».', tutos: ['roue', 'pression'] },
      { id: 'chaines', name: 'Chaînes / chaussettes neige', query: 'chaussettes neige', tip: 'Choisir selon la dimension exacte des pneus.', tutos: [] },
      { id: 'compresseur', name: 'Compresseur / manomètre', query: 'compresseur pneu', tip: 'Pour vérifier la pression à froid chaque mois.', tutos: ['pression'] },
    ],
  },
  {
    id: 'liquides',
    title: 'Liquides',
    icon: '💧',
    items: [
      { id: 'refroidissement', name: 'Liquide de refroidissement', query: 'liquide de refroidissement', tip: 'Respecter le type (couleur / norme) préconisé. Ne jamais ouvrir le vase d’expansion moteur chaud.', tutos: ['niveaux'] },
      { id: 'adblue', name: 'AdBlue', query: 'adblue', tip: 'Pour les diesels équipés SCR. Ne jamais verser dans le réservoir de carburant.', tutos: [] },
    ],
  },
  {
    id: 'outillage',
    title: 'Outillage & diagnostic',
    icon: '🧰',
    items: [
      { id: 'obd', name: 'Adaptateur OBD2 ELM327 Bluetooth LE', query: 'valise diagnostic obd', tip: 'Pour l’application : choisir un modèle « Bluetooth LE / BLE » (compatible iPhone/Android) ou USB. Les modèles Bluetooth « classique » ne fonctionnent pas depuis un navigateur.', tutos: [] },
      { id: 'cric', name: 'Cric et chandelles', query: 'chandelles', tip: 'Ne jamais travailler sous un véhicule uniquement posé sur un cric : chandelles obligatoires.', tutos: ['roue', 'plaquettes'] },
      { id: 'cle-dynamo', name: 'Clé dynamométrique', query: 'cle dynamometrique', tip: 'Indispensable pour serrer roues et étriers au bon couple.', tutos: ['roue', 'plaquettes'] },
      { id: 'cle-filtre', name: 'Clé à filtre à huile', query: 'cle filtre a huile', tip: 'Modèle à sangle ou à cloche selon le filtre.', tutos: ['vidange'] },
    ],
  },
];

export const DEFAULT_SHOP_URL = 'https://www.google.com/search?q=site%3Acarter-cash.com+{q}';

export function shopSearchUrl(template, query, vehicle) {
  const q = [query, vehicle?.brand, vehicle?.model].filter(Boolean).join(' ');
  return (template || DEFAULT_SHOP_URL).replace('{q}', encodeURIComponent(q));
}
