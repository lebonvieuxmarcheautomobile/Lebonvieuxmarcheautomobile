# AUTOnomie

Application web (installable sur mobile, fonctionne hors connexion) pour les particuliers qui achètent, entretiennent et réparent leur voiture.

| Onglet | Ce qu'il fait |
| --- | --- |
| **Achat** | Check-list complète pour acheter une occasion (préparation, documents, carrosserie, moteur à froid, essai, OBD, paiement, formalités ANTS), fiche **HistoVec** à reporter, et **note du véhicule sur 20** calculée automatiquement : fiabilité, rapport qualité-prix et verdict (bonne affaire, à négocier, à éviter…), avec le détail des points perdus et des arguments de négociation. |
| **Plaque** | Immatriculation → caractéristiques **techniques** du véhicule (jamais le propriétaire), **campagnes de rappel** (open data RappelConso) et **défauts connus** du moteur / de la boîte / du modèle. Identification de secours par VIN ou saisie manuelle. |
| **OBD** | Diagnostic léger avec un adaptateur ELM327 à ~20 € : lecture/effacement des codes défaut (avec explications en français), données moteur en temps réel, **contrôle avant achat** (codes effacés récemment, moniteurs antipollution, VIN). Mode démo intégré. |
| **Carnet** | Carnet d'entretien multi-véhicules : interventions, coûts, contrôles techniques (contre-visites incluses), échéances calculées (CT, vidange, distribution, liquide de frein). Export/import JSON. |
| **Pièces** | Catalogue de pièces par famille avec conseils de choix et liens de recherche vers Carter-Cash (filtrés sur votre véhicule), et **tutos de montage** pas à pas (vidange, plaquettes, batterie, ampoules, filtres, bougies, roue…). |

## Utilisation avec Immat Scanner

L'application reçoit les plaques scannées par l'app Android **Immat Scanner** (ou toute autre app de scan) :

1. Installer l'application sur l'écran d'accueil (Chrome → « Installer l'application »).
2. Dans Immat Scanner, scanner la plaque puis **Partager** → **AUTOnomie** : l'onglet Plaque s'ouvre et lance la recherche.
3. Ou copier le résultat dans Immat Scanner puis toucher **Coller depuis Immat Scanner** dans l'onglet Plaque.

La plaque est retrouvée dans le texte reçu, quel que soit son format (`AB-123-CD`, `AB 123 CD`, `123 ABC 45`…). Immat Scanner ne publie pas d'API : l'échange passe donc par le partage Android ou le presse-papiers.

## Mise en ligne (désactivée pour l'instant)

Un déploiement sur GitHub Pages est prêt mais ne se lance **que manuellement** :
1. Settings → Pages → Source : **GitHub Actions** ;
2. onglet Actions → **Déployer l'application** → **Run workflow**.

L'application sera alors disponible sur `https://lebonvieuxmarcheautomobile.github.io/Lebonvieuxmarcheautomobile/` et installable sur Android (Chrome → menu ⋮ → **Installer l'application**). En ligne, la fiche technique par plaque reste en mode démo ; le reste est opérationnel.

## Démarrer

```bash
npm start          # http://localhost:8080 (Node 20+, aucune dépendance)
npm test           # tests unitaires (plaques, VIN, OBD, CT, défauts, rappels)
```

Plaques de démo : `AB-123-CD`, `EF-456-GH`, `GH-789-JK`, `KL-321-MN`.
Le dossier `public/` peut aussi être hébergé seul (site statique) : la recherche par plaque reste alors en mode démo.

## Configuration (variables d'environnement)

| Variable | Rôle |
| --- | --- |
| `PORT` | Port HTTP (défaut 8080) |
| `PLATE_API_PROVIDER` | `demo` (défaut) ou `regcheck` |
| `REGCHECK_USERNAME` | Identifiant du compte [RegCheck](https://www.regcheck.org.uk/) (API payante, endpoint `CheckFrance`) |
| `RAPPELCONSO_DATASET` | Jeu de données RappelConso (défaut `rappelconso-v2-gtin-espaces`) |

## Limites à connaître

- **Plaque → véhicule** : il n'existe pas d'API publique gratuite en France. Il faut un fournisseur payant ; la clé reste côté serveur. Un adaptateur RegCheck est fourni, d'autres fournisseurs se branchent dans `server/providers.js`.
- **Rappels** : RappelConso est interrogé par marque et modèle. La confirmation précise se fait avec le VIN auprès de la marque.
- **Défauts connus** : base maintenue à la main dans `public/js/data/known-defects.js`, sur des problèmes largement documentés. Indicatif.
- **OBD** : nécessite Chrome/Edge (Android, ordinateur, ChromeOS) et un adaptateur **Bluetooth LE** ou USB. Les ELM327 « Bluetooth classique » et Wi-Fi ne sont pas accessibles depuis un navigateur. Sur Android, un bouton « Ouvrir dans Chrome » rouvre l'application dans Chrome. Sur iPhone/iPad, Apple ne permet le Bluetooth dans aucun navigateur (Chrome compris) : seul le mode démo est disponible.
- **Carter-Cash** : pas de flux catalogue public. Les boutons ouvrent une recherche sur carter-cash.com (adresse modifiable dans les réglages). L'application n'est pas affiliée à Carter-Cash et n'affiche aucun prix.
- **Carnet** : stocké sur l'appareil (localStorage). Pensez à exporter.

## Structure

```
server/            serveur Node (fichiers statiques + API plaque + proxy RappelConso)
public/            application (PWA, modules ES sans build)
  js/lib/          logique : plaques, VIN, rappels, défauts, entretien, OBD (ELM327 + transports)
  js/data/         contenus : guide d'achat, défauts connus, codes OBD, catalogue, tutos
  js/views/        écrans
test/              tests node:test
```
