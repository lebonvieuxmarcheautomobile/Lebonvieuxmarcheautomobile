// Guide d'achat d'un véhicule d'occasion entre particuliers (France).
// critical: true = point bloquant si non conforme.

export const BUYING_GUIDE = [
  {
    id: 'prep',
    title: 'Avant de se déplacer',
    icon: '🔎',
    items: [
      { id: 'cote', text: 'Comparer le prix à la cote et aux annonces similaires (même année, kilométrage, finition).', detail: 'Un prix nettement sous le marché est le premier signe d’arnaque.' },
      { id: 'histovec', text: 'Demander au vendeur le lien de son rapport HistoVec (gratuit, officiel).', detail: 'Il indique le nombre de propriétaires, les sinistres déclarés, l’historique des CT et du kilométrage, et la situation administrative (gage, opposition).', critical: true, link: { label: 'HistoVec', url: 'https://histovec.interieur.gouv.fr/' } },
      { id: 'defauts', text: 'Consulter les rappels et défauts connus du modèle dans l’onglet « Véhicule ».', link: { label: 'Rechercher le véhicule', url: '#vehicule' } },
      { id: 'questions', text: 'Questions au téléphone : nombre de propriétaires, factures, raison de la vente, accident, prochaines dépenses (distribution, pneus, CT).' },
      { id: 'jour', text: 'Prévoir la visite de jour, par temps sec, moteur FROID (demander de ne pas le faire tourner avant).', detail: 'Un moteur déjà chaud peut masquer un démarrage difficile, une fumée ou un bruit de chaîne.' },
    ],
  },
  {
    id: 'docs',
    title: 'Documents',
    icon: '📄',
    items: [
      { id: 'cg', text: 'Certificat d’immatriculation (carte grise) original au nom du vendeur.', detail: 'Comparer l’identité du vendeur (pièce d’identité) avec le titulaire. Vérifier le VIN (champ E) sur la carte grise ET sur le véhicule (pare-brise, frappe à froid, étiquette de portière).', critical: true },
      { id: 'ct', text: 'Procès-verbal de contrôle technique de moins de 6 mois (véhicule de plus de 4 ans).', detail: 'En cas de contre-visite, celle-ci doit dater de moins de 2 mois. Lire la liste des défaillances mineures : elles annoncent les dépenses.', critical: true },
      { id: 'csa', text: 'Certificat de situation administrative (non-gage) de moins de 15 jours.', detail: 'Inclus dans le rapport HistoVec. Un véhicule gagé ou avec opposition ne peut pas être immatriculé à votre nom.', critical: true },
      { id: 'carnet', text: 'Carnet d’entretien et factures (vidanges, distribution, embrayage, pneus).', detail: 'Vérifier la cohérence des dates et des kilométrages entre factures, CT et HistoVec.' },
      { id: 'doubles', text: 'Double des clés, code autoradio, écrou antivol de roue.' },
    ],
  },
  {
    id: 'ext',
    title: 'Carrosserie & extérieur',
    icon: '🚗',
    items: [
      { id: 'teintes', text: 'Différences de teinte ou de brillance entre éléments, traces de peinture sur les joints.', detail: 'Signe de réparation après choc : demander pourquoi.' },
      { id: 'jeux', text: 'Jeux entre éléments (capot, portes, hayon) réguliers des deux côtés.' },
      { id: 'rouille', text: 'Corrosion : bas de caisse, passages de roue, bas de portes, dessous du véhicule.' },
      { id: 'pneus', text: 'Pneus : même marque par essieu, usure régulière, profondeur > 1,6 mm (témoin), date (DOT) de moins de 6 ans conseillée.', detail: 'Une usure sur un seul bord indique un problème de géométrie (choc, train avant).' },
      { id: 'freins', text: 'Disques de frein : pas de rebord marqué ni de rayures profondes.' },
      { id: 'vitrage', text: 'Pare-brise sans impact dans le champ de vision ; optiques non jaunies ni embuées.' },
      { id: 'fuites', text: 'Regarder sous le véhicule à l’arrêt : traces d’huile, de liquide de refroidissement ou de carburant.' },
    ],
  },
  {
    id: 'int',
    title: 'Intérieur & équipements',
    icon: '💺',
    items: [
      { id: 'usure', text: 'Usure du volant, du pommeau et des pédales cohérente avec le kilométrage.', detail: 'Un volant lisse et un pédalier usé sur une voiture à 60 000 km : méfiance (compteur ?).' },
      { id: 'voyants', text: 'Contact mis : tous les voyants s’allument, puis s’éteignent au démarrage (moteur, airbag, ABS, huile).', critical: true },
      { id: 'clim', text: 'Climatisation qui souffle froid, chauffage, ventilation à toutes les vitesses.' },
      { id: 'elec', text: 'Vitres, rétroviseurs, fermeture centralisée, éclairages, essuie-glaces, multimédia.' },
      { id: 'humidite', text: 'Odeur d’humidité, moquettes mouillées (infiltration, véhicule inondé).' },
    ],
  },
  {
    id: 'moteur',
    title: 'Moteur (à froid)',
    icon: '⚙️',
    items: [
      { id: 'huile', text: 'Niveau et aspect de l’huile ; dessous du bouchon de remplissage sans « mayonnaise ».', detail: 'Une émulsion beige peut indiquer un joint de culasse défectueux.', critical: true },
      { id: 'lr', text: 'Niveau du liquide de refroidissement, sans trace d’huile.' },
      { id: 'demarrage', text: 'Démarrage franc, ralenti stable, pas de bruit de chaîne ou de claquement.' },
      { id: 'fumee', text: 'Fumée à l’échappement : bleue (huile), blanche épaisse persistante (liquide de refroidissement), noire (diesel mal réglé / injection).' },
      { id: 'courroie', text: 'Date / kilométrage du dernier remplacement de distribution vs préconisation constructeur.', detail: 'Si elle est à faire, négocier le prix en conséquence.' },
    ],
  },
  {
    id: 'essai',
    title: 'Essai routier',
    icon: '🛣️',
    items: [
      { id: 'embrayage', text: 'Embrayage : point de patinage pas trop haut ; pas de patinage en accélérant fort en 4e/5e.' },
      { id: 'boite', text: 'Passage des rapports sans craquement ; boîte auto sans à-coups ni glissement.' },
      { id: 'direction', text: 'Véhicule qui roule droit, volant centré, pas de vibration au freinage.' },
      { id: 'bruits', text: 'Pas de bruits de train avant (dos d’âne, braquage à fond : claquement de cardans).' },
      { id: 'temp', text: 'Température moteur stable après 15 min ; ventilateur qui se déclenche à l’arrêt.' },
      { id: 'puissance', text: 'Montée en régime sans trou ni perte de puissance (turbo).' },
    ],
  },
  {
    id: 'obd',
    title: 'Contrôle OBD (avec un adaptateur à ~20 €)',
    icon: '🔌',
    items: [
      { id: 'codes', text: 'Lire les codes défaut mémorisés et en attente.', link: { label: 'Ouvrir le diagnostic', url: '#diagnostic' } },
      { id: 'readiness', text: 'Vérifier les moniteurs antipollution (« readiness ») et la distance depuis l’effacement des codes.', detail: 'Des moniteurs non prêts ou une distance très faible depuis l’effacement = codes effacés récemment, souvent juste avant la vente.', critical: true },
      { id: 'vinobd', text: 'Lire le VIN par l’OBD et le comparer à la carte grise.' },
    ],
  },
  {
    id: 'paiement',
    title: 'Négociation & paiement',
    icon: '💶',
    items: [
      { id: 'nego', text: 'Négocier sur des éléments objectifs : pneus, distribution, défauts CT, codes défaut, rappels non faits.' },
      { id: 'acompte', text: 'Ne jamais verser d’acompte pour un véhicule non vu (vendeur « à l’étranger », transporteur…).', critical: true },
      { id: 'cheque', text: 'Chèque de banque : vérifier son authenticité en appelant la banque émettrice avec un numéro trouvé par vous-même. Privilégier le virement instantané vérifié avant remise des clés.', critical: true },
      { id: 'certificat', text: 'Remplir et signer le certificat de cession (Cerfa 15776) en 2 exemplaires, et récupérer la carte grise barrée avec la mention « Vendu le … à … (heure) » et signée.', critical: true },
    ],
  },
  {
    id: 'apres',
    title: 'Après l’achat',
    icon: '✅',
    items: [
      { id: 'assurance', text: 'Assurer le véhicule AVANT de prendre la route.', critical: true },
      { id: 'ants', text: 'Faire la demande de carte grise à votre nom sous 1 mois sur le site officiel de l’ANTS (avec le code de cession fourni par le vendeur).', link: { label: 'ANTS', url: 'https://immatriculation.ants.gouv.fr/' } },
      { id: 'vendeur', text: 'Le vendeur déclare la cession sous 15 jours (le code de cession vous sert pour l’immatriculation).' },
      { id: 'carnetapp', text: 'Créer le véhicule dans le carnet d’entretien de l’application et planifier la prochaine vidange.', link: { label: 'Ouvrir le carnet', url: '#carnet' } },
    ],
  },
];
