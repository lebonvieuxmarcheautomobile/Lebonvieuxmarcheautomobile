// Schémas techniques animés des tutos (style « manuel d'atelier »).
//
// Chaque scène est un SVG 640 × 360 dont les pièces portent data-part="…".
// Pour chaque étape du tuto, `steps[i]` indique les pièces à mettre en évidence
// et l'animation à leur appliquer :
//   ''      mise en évidence seule        ccw / cw   dévisser / visser
//   down / up / left / right / out        déplacement (retrait, mise en place)
//   drip    écoulement goutte à goutte    flow       circulation (fluide, câble)
//   blink   clignotement (voyant)         press      appui (pédale, poire)
//   swing   bascule (bras, tendeur)       spin       rotation continue (poulie)
// Les couleurs viennent des variables CSS : les schémas suivent le thème clair / sombre.

// ——— Pièces réutilisables ———
const bolt = (x, y, r = 9, part = '') =>
  `<g ${part ? `data-part="${part}"` : ''} class="p"><circle cx="${x}" cy="${y}" r="${r}" class="f-metal"/><path d="M${x - r * 0.55} ${y}h${r * 1.1}M${x} ${y - r * 0.55}v${r * 1.1}" class="thin"/></g>`;
const drops = (x, y, part = 'drops') =>
  `<g data-part="${part}" class="p">${[0, 1, 2].map((i) => `<path d="M${x} ${y + i * 18}c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" class="f-oil drop d${i}"/>`).join('')}</g>`;
const label = (x, y, t, cls = '') => `<text x="${x}" y="${y}" class="lbl ${cls}">${t}</text>`;
const arrow = (d, part) => `<path ${part ? `data-part="${part}"` : ''} d="${d}" class="p arrow" marker-end="url(#ah)"/>`;
const wheel = (cx, cy, r, part = 'wheel') =>
  `<g data-part="${part}" class="p"><circle cx="${cx}" cy="${cy}" r="${r}" class="f-rubber"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" class="f-metal"/><circle cx="${cx}" cy="${cy}" r="${r * 0.18}" class="f-dark"/>${[0, 72, 144, 216, 288]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<circle cx="${(cx + Math.cos(rad) * r * 0.36).toFixed(1)}" cy="${(cy + Math.sin(rad) * r * 0.36).toFixed(1)}" r="${(r * 0.06).toFixed(1)}" class="f-dark"/>`;
    })
    .join('')}</g>`;
const carSide = (x = 0, y = 0) =>
  `<path data-bg d="M${x + 70} ${y + 210}h-30a10 10 0 0 1-10-10v-38c0-10 8-18 18-20l70-12 60-46c8-6 18-9 28-9h150c10 0 19 4 26 11l46 44 74 12c14 2 24 14 24 28v30a10 10 0 0 1-10 10h-34" class="body"/>
   <path data-bg d="M${x + 180} ${y + 80}l-50 44h120V${y + 80}zM${x + 270} ${y + 80}v44h125l-44-44z" class="glass"/>`;
const ground = (y = 300) => `<path data-bg d="M20 ${y}H620" class="ground"/>`;
const battery = (x, y, w = 150, h = 90) =>
  `<g data-part="battery" class="p"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="f-dark"/>${label(x + w / 2, y + h / 2 + 6, '12 V', 'inv mid')}</g>
   <g data-part="neg" class="p"><rect x="${x + 18}" y="${y - 16}" width="26" height="16" rx="3" class="f-metal"/>${label(x + 31, y - 22, '−', 'big mid')}</g>
   <g data-part="pos" class="p"><rect x="${x + w - 44}" y="${y - 16}" width="26" height="16" rx="3" class="f-red"/>${label(x + w - 31, y - 22, '+', 'big mid')}</g>`;

const DEFS = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>`;
const svg = (body, title) =>
  `<svg viewBox="0 0 640 360" class="scene-svg" role="img" aria-label="${title}">${DEFS}<rect data-bg width="640" height="360" class="bg"/>${body}</svg>`;

// ——— Scènes ———
export const SCENES = {
  vidange: {
    title: 'Vue de dessous : carter d’huile, bouchon de vidange et filtre',
    body: `${ground(340)}
      <path data-bg d="M40 40H600V90H40z" class="body"/>${label(320, 70, 'Dessous du véhicule (sur chandelles)', 'inv mid')}
      <g data-part="engine" class="p"><rect x="150" y="90" width="300" height="70" rx="10" class="f-metal"/>${label(300, 130, 'Moteur', 'mid')}</g>
      <g data-part="fillcap" class="p"><rect x="190" y="70" width="40" height="18" rx="4" class="f-oil"/></g>
      <g data-part="pan" class="p"><path d="M170 160h260l-20 50H190z" class="f-metal"/>${label(300, 192, 'Carter d’huile', 'mid')}</g>
      ${bolt(395, 212, 10, 'plug')}
      <g data-part="filter" class="p"><rect x="460" y="110" width="44" height="64" rx="10" class="f-blue"/>${label(482, 196, 'Filtre', 'mid')}</g>
      ${drops(395, 232)}
      <g data-part="tray" class="p"><path d="M330 300h130l-12 30H342z" class="f-dark"/>${label(395, 324, 'Bac', 'inv mid')}</g>
      <g data-part="dipstick" class="p"><path d="M140 40v110" class="thick"/><circle cx="140" cy="34" r="8" class="f-yellow"/></g>
      <g data-part="dash" class="p"><rect x="520" y="230" width="90" height="60" rx="10" class="f-dark"/><path d="M548 262h34" class="warn-light"/>${label(565, 282, 'voyant', 'inv mid small')}</g>`,
    steps: [{ engine: '' }, { pan: 'up' }, { fillcap: 'ccw' }, { tray: '', plug: 'ccw', drops: 'drip' }, { filter: 'ccw' }, { plug: 'cw' }, { fillcap: '', dipstick: 'up' }, { dash: 'blink' }, { dash: '' }],
  },

  plaquettes: {
    title: 'Frein à disque avant : disque, étrier, plaquettes et piston',
    body: `<g data-part="disc" class="p"><circle cx="250" cy="190" r="130" class="f-metal"/><circle cx="250" cy="190" r="118" class="disc-ring"/><circle cx="250" cy="190" r="48" class="f-dark"/>${[0, 72, 144, 216, 288].map((a) => bolt((250 + Math.cos((a * Math.PI) / 180) * 30).toFixed(1), (190 + Math.sin((a * Math.PI) / 180) * 30).toFixed(1), 6)).join('')}</g>
      <g data-part="caliper" class="p"><path d="M330 70h90a20 20 0 0 1 20 20v200a20 20 0 0 1-20 20h-90z" class="f-red"/>${label(395, 196, 'Étrier', 'inv mid')}</g>
      ${bolt(420, 92, 9, 'guides')}${bolt(420, 290, 9, 'guides')}
      <g data-part="pads" class="p"><rect x="352" y="96" width="16" height="190" rx="4" class="f-pad"/></g>
      <g data-part="piston" class="p"><rect x="440" y="160" width="40" height="60" rx="6" class="f-metal"/>${label(500, 196, 'Piston', '')}</g>
      <g data-part="reservoir" class="p"><rect x="520" y="40" width="70" height="60" rx="8" class="f-brake"/>${label(555, 120, 'Liquide', 'mid small')}</g>
      <g data-part="pedal" class="p"><path d="M560 220v60h-30" class="thick"/><rect x="510" y="272" width="44" height="14" rx="4" class="f-dark"/>${label(560, 310, 'Pédale', 'mid small')}</g>
      <g data-part="torque" class="p"><path d="M470 330l120-40" class="thick"/>${label(530, 345, 'Couple', 'mid small')}</g>`,
    steps: [{ disc: '' }, { reservoir: 'ccw' }, { guides: 'ccw', caliper: 'right' }, { pads: 'out', disc: '' }, { caliper: '' }, { piston: 'left' }, { pads: 'left', guides: 'cw' }, { torque: 'swing' }, { pedal: 'press', reservoir: '' }, { disc: 'spin' }],
  },

  batterie: {
    title: 'Batterie : bornes, bride de maintien et ordre de branchement',
    body: `<rect data-bg x="60" y="230" width="380" height="20" rx="4" class="f-metal"/>${label(250, 275, 'Support', 'mid small')}
      ${battery(170, 120, 160, 110)}
      <g data-part="clamp" class="p"><path d="M150 230v-20h200v20" class="thick"/></g>
      <g data-part="key" class="p"><rect x="470" y="70" width="110" height="70" rx="12" class="f-dark"/><circle cx="525" cy="105" r="16" class="f-metal"/>${label(525, 160, 'Contact', 'mid small')}</g>
      <g data-part="brush" class="p"><rect x="470" y="210" width="100" height="18" rx="6" class="f-yellow"/><path d="M480 228v20M495 228v20M510 228v20M525 228v20M540 228v20M555 228v20" class="thin"/></g>
      ${arrow('M201 86V40', 'out-neg')}${arrow('M299 86V40', 'out-pos')}
      ${label(201, 30, '1', 'mid small')}${label(299, 30, '2', 'mid small')}`,
    steps: [{ key: 'ccw' }, { neg: 'up', 'out-neg': '', pos: 'up' }, { clamp: 'up', battery: 'up' }, { brush: 'right' }, { battery: 'down', clamp: 'down' }, { pos: 'down', neg: 'down' }, { key: 'cw' }],
  },

  ampoule: {
    title: 'Arrière du phare : capuchon, connecteur et ampoule H7',
    body: `<g data-part="housing" class="p"><rect x="60" y="60" width="300" height="240" rx="40" class="f-metal"/><circle cx="210" cy="180" r="80" class="f-dark"/></g>
      <g data-part="cap" class="p"><circle cx="210" cy="180" r="62" class="f-rubber"/>${label(210, 186, 'Capuchon', 'inv mid small')}</g>
      <g data-part="connector" class="p"><rect x="400" y="160" width="70" height="40" rx="6" class="f-dark"/><path d="M470 180h80" class="wire"/></g>
      <g data-part="bulb" class="p"><rect x="420" y="240" width="30" height="40" rx="4" class="f-metal"/><path d="M435 240c-22 0-26-60 0-60s22 60 0 60" class="f-glass"/>${label(435, 300, 'H7', 'mid small')}</g>
      <g data-part="hand" class="p"><path d="M470 270c20 0 40 10 60 30h60v40H500c-30 0-40-20-40-40z" class="f-skin"/>${label(560, 330, 'Tenir par le culot', 'mid small')}</g>
      <g data-part="lamp" class="p"><circle cx="560" cy="80" r="30" class="f-yellow lampglow"/></g>`,
    steps: [{ lamp: '' }, { housing: '' }, { cap: 'ccw', connector: 'right' }, { bulb: 'out' }, { bulb: 'in', hand: '' }, { cap: 'cw', lamp: 'blink' }],
  },

  'essuie-glace': {
    title: 'Bras d’essuie-glace, clip de verrouillage et balai',
    body: `<path data-bg d="M40 320Q320 80 600 320z" class="glass"/>
      <g data-part="arm" class="p" style="transform-box: view-box; transform-origin: 120px 320px"><path d="M120 320L420 150" class="thick"/>
        <g data-part="clip" class="p"><rect x="400" y="140" width="34" height="22" rx="4" class="f-accent"/></g>
        <g data-part="blade" class="p"><path d="M300 210L540 80" class="blade"/></g></g>
      <g data-part="towel" class="p"><rect x="150" y="300" width="160" height="22" rx="6" class="f-blue"/>${label(230, 345, 'Chiffon de protection', 'mid small')}</g>`,
    steps: [{ arm: 'swing', towel: '' }, { clip: 'press', blade: 'right' }, { blade: 'left', clip: '' }, { arm: 'swing' }],
  },

  'filtre-habitacle': {
    title: 'Boîte à gants déposée et logement du filtre d’habitacle',
    body: `<rect data-bg x="40" y="40" width="560" height="110" rx="20" class="body"/>${label(320, 100, 'Planche de bord', 'inv mid')}
      <g data-part="glovebox" class="p"><rect x="140" y="150" width="240" height="90" rx="12" class="f-metal"/>${label(260, 200, 'Boîte à gants', 'mid')}</g>
      <g data-part="slot" class="p"><rect x="420" y="160" width="160" height="40" rx="6" class="f-dark"/></g>
      <g data-part="filter" class="p"><rect x="430" y="230" width="140" height="40" rx="4" class="f-filter"/><path d="M440 236v28M455 236v28M470 236v28M485 236v28M500 236v28M515 236v28M530 236v28M545 236v28M560 236v28" class="thin"/></g>
      ${arrow('M440 300H560', 'airflow')}${label(500, 330, 'AIR FLOW', 'mid small')}
      <g data-part="fan" class="p"><circle cx="90" cy="290" r="34" class="f-metal"/><path d="M90 256v68M56 290h68" class="thin"/></g>`,
    steps: [{ slot: '' }, { glovebox: 'down' }, { filter: 'down', airflow: 'flow' }, { filter: 'up', airflow: 'flow' }, { fan: 'spin' }],
  },

  'filtre-air': {
    title: 'Boîtier de filtre à air : agrafes, filtre et joint',
    body: `<g data-part="lid" class="p"><rect x="140" y="70" width="360" height="70" rx="14" class="f-metal"/>${label(320, 112, 'Couvercle', 'mid')}</g>
      <g data-part="clips" class="p"><rect x="120" y="120" width="24" height="40" rx="4" class="f-accent"/><rect x="496" y="120" width="24" height="40" rx="4" class="f-accent"/></g>
      <g data-part="filter" class="p"><rect x="170" y="150" width="300" height="60" rx="6" class="f-filter"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${185 + i * 20} 156v48" class="thin"/>`).join('')}</g>
      <g data-part="box" class="p"><path d="M140 210h360v80a14 14 0 0 1-14 14H154a14 14 0 0 1-14-14z" class="f-dark"/>${label(320, 266, 'Boîtier', 'inv mid')}</g>
      <g data-part="seal" class="p"><path d="M170 210h300" class="seal"/></g>`,
    steps: [{ clips: 'out', lid: 'up' }, { filter: 'up', box: '' }, { filter: 'down', seal: '' }, { lid: 'down', clips: '' }],
  },

  bougies: {
    title: 'Culasse : bobine, puits de bougie et bougie',
    body: `<g data-part="head" class="p"><rect x="60" y="180" width="520" height="140" rx="12" class="f-metal"/>${label(320, 300, 'Culasse', 'mid')}</g>
      <g data-part="well" class="p"><rect x="290" y="180" width="60" height="100" class="f-dark"/></g>
      <g data-part="coil" class="p"><rect x="285" y="60" width="70" height="60" rx="8" class="f-dark"/><rect x="305" y="120" width="30" height="50" class="f-rubber"/>${label(400, 96, 'Bobine', '')}</g>
      <g data-part="plug" class="p"><rect x="308" y="220" width="24" height="30" class="f-white"/><rect x="304" y="250" width="32" height="12" class="f-metal"/><path d="M320 262v18" class="thick"/></g>
      <g data-part="air" class="p"><path d="M200 150c30-10 60-10 90 20" class="flowline"/>${label(170, 140, 'Soufflette', '')}</g>
      <g data-part="wrench" class="p"><path d="M320 40v-30M260 10h120" class="thick"/>${label(320, 24, 'Clé + douille', 'mid small')}</g>`,
    steps: [{ coil: 'up' }, { air: 'flow', well: '' }, { plug: 'ccw', wrench: '' }, { plug: 'cw' }, { coil: 'down' }],
  },

  roue: {
    title: 'Changer une roue : écrous, cric et point de levage',
    body: `${ground()}${carSide(0, 70)}
      ${wheel(130, 280, 46, 'wheel')}${wheel(510, 280, 46, 'rear')}
      <g data-part="nuts" class="p">${[0, 72, 144, 216, 288].map((a) => bolt((130 + Math.cos((a * Math.PI) / 180) * 17).toFixed(1), (280 + Math.sin((a * Math.PI) / 180) * 17).toFixed(1), 5)).join('')}</g>
      <g data-part="jack" class="p"><path d="M200 300l20-40h20l20 40z" class="f-accent"/><path d="M230 260v-14" class="thick"/></g>
      <g data-part="jackpoint" class="p"><path d="M220 246h20" class="thick accent-stroke"/></g>
      <g data-part="handbrake" class="p"><rect x="300" y="160" width="60" height="16" rx="6" class="f-dark"/>${label(330, 196, 'Frein à main', 'mid small')}</g>
      <g data-part="spare" class="p"><circle cx="590" cy="60" r="34" class="f-rubber"/><circle cx="590" cy="60" r="16" class="f-metal"/>${label(590, 112, 'Roue de secours', 'mid small')}</g>`,
    steps: [{ handbrake: '' }, { nuts: 'ccw' }, { jackpoint: '', jack: 'up' }, { wheel: 'left', spare: '' }, { nuts: 'cw' }, { spare: '' }],
  },

  pression: {
    title: 'Pression des pneus : étiquette, valve et manomètre',
    body: `${wheel(220, 200, 130, 'tire')}
      <g data-part="valve" class="p"><rect x="300" y="250" width="14" height="30" rx="3" class="f-dark"/></g>
      <g data-part="gauge" class="p"><circle cx="420" cy="260" r="46" class="f-white"/><path d="M420 260l26-22" class="thick accent-stroke"/><path d="M380 270l-70 0" class="thick"/>${label(420, 330, 'Manomètre', 'mid small')}</g>
      <g data-part="sticker" class="p"><rect x="470" y="40" width="140" height="90" rx="8" class="f-white"/>${label(540, 74, '2,3 bar AV', 'mid small')}${label(540, 100, '2,1 bar AR', 'mid small')}</g>
      <g data-part="thermo" class="p"><rect x="40" y="30" width="20" height="70" rx="10" class="f-blue"/>${label(50, 120, 'À froid', 'mid small')}</g>
      <g data-part="tpms" class="p"><circle cx="560" cy="200" r="26" class="f-yellow"/>${label(560, 207, '(!)', 'mid ink')}</g>`,
    steps: [{ thermo: '' }, { sticker: '' }, { gauge: 'left', valve: '' }, { tpms: 'blink' }],
  },

  niveaux: {
    title: 'Compartiment moteur : jauge, vase d’expansion, liquide de frein, lave-glace',
    body: `<rect data-bg x="30" y="30" width="580" height="300" rx="20" class="body"/>
      <g data-part="engine" class="p"><rect x="190" y="110" width="220" height="150" rx="14" class="f-metal"/>${label(300, 190, 'Moteur', 'mid')}</g>
      <g data-part="dipstick" class="p"><path d="M240 110V60" class="thick"/><circle cx="240" cy="52" r="10" class="f-yellow"/></g>
      <g data-part="coolant" class="p"><rect x="450" y="70" width="110" height="90" rx="12" class="f-cool-tank"/><path d="M450 96h110M450 136h110" class="thin"/>${label(505, 92, 'MAX', 'mid small ink')}${label(505, 152, 'MIN', 'mid small ink')}</g>
      <g data-part="brake" class="p"><rect x="60" y="70" width="90" height="70" rx="10" class="f-brake"/>${label(105, 160, 'Frein', 'mid small')}</g>
      <g data-part="washer" class="p"><circle cx="505" cy="260" r="30" class="f-blue"/>${label(505, 310, 'Lave-glace', 'mid small')}</g>
      <g data-part="level" class="p"><rect x="60" y="230" width="60" height="70" rx="8" class="f-dark"/>${label(90, 320, 'Niveau', 'mid small')}</g>`,
    steps: [{ level: '' }, { dipstick: 'up' }, { coolant: '' }, { brake: '' }, { washer: 'ccw' }],
  },

  'demarrer-cables': {
    title: 'Démarrage avec câbles : ordre de branchement',
    body: `${battery(60, 150, 140, 90)}${label(130, 280, 'Véhicule en panne', 'mid small')}
      <g data-part="donor" class="p"><rect x="440" y="150" width="140" height="90" rx="8" class="f-dark"/>${label(510, 200, 'Donneur', 'inv mid')}</g>
      <rect data-bg x="458" y="134" width="26" height="16" rx="3" class="f-metal"/><rect data-bg x="536" y="134" width="26" height="16" rx="3" class="f-red"/>
      <g data-part="red" class="p"><path d="M173 134C260 40 450 40 549 134" class="cable red-cable"/></g>
      <g data-part="black" class="p"><path d="M471 134C420 80 300 300 250 300" class="cable black-cable"/></g>
      <g data-part="ground" class="p"><rect x="230" y="290" width="40" height="22" rx="4" class="f-metal"/>${label(250, 330, 'Masse moteur', 'mid small')}</g>
      <g data-part="engine2" class="p"><circle cx="590" cy="300" r="22" class="f-metal"/>${label(590, 340, 'Moteur', 'mid small')}</g>`,
    steps: [{ battery: '', donor: '' }, { red: 'flow', pos: '' }, { black: 'flow', ground: '' }, { engine2: 'spin' }, { battery: 'blink' }, { black: 'out', red: 'out' }, { battery: 'flow' }],
  },

  'purge-frein': {
    title: 'Purge des freins : bocal, vis de purge, tuyau et bouteille',
    body: `<g data-part="reservoir" class="p"><rect x="60" y="40" width="110" height="80" rx="10" class="f-brake"/>${label(115, 140, 'Bocal', 'mid small')}</g>
      <g data-part="syringe" class="p"><rect x="190" y="40" width="80" height="22" rx="6" class="f-white"/><path d="M190 51h-20" class="thick"/></g>
      <g data-part="caliper" class="p"><rect x="300" y="150" width="140" height="110" rx="14" class="f-red"/>${label(370, 212, 'Étrier', 'inv mid')}</g>
      ${bolt(430, 160, 10, 'bleeder')}
      <g data-part="tube" class="p"><path d="M440 150C520 110 560 200 540 250" class="tube"/></g>
      <g data-part="bottle" class="p"><rect x="510" y="250" width="70" height="80" rx="8" class="f-glass"/>${drops(545, 260, 'fluid')}</g>
      <g data-part="pedal" class="p"><path d="M120 220v60h-30" class="thick"/><rect x="70" y="272" width="44" height="14" rx="4" class="f-dark"/>${label(100, 310, 'Pédale (aide)', 'mid small')}</g>
      ${label(370, 90, 'Ordre : AR D → AR G → AV D → AV G', 'mid small')}`,
    steps: [{ syringe: 'left', reservoir: '' }, { caliper: '' }, { tube: 'flow' }, { pedal: 'press', bleeder: 'ccw', fluid: 'drip' }, { fluid: 'drip', reservoir: '' }, { bleeder: 'cw' }, { reservoir: '', pedal: 'press' }],
  },

  'liquide-refroidissement': {
    title: 'Circuit de refroidissement : vase, radiateur, durite et purge',
    body: `<g data-part="tank" class="p"><rect x="60" y="40" width="120" height="100" rx="14" class="f-cool-tank"/><circle cx="120" cy="34" r="16" class="f-dark"/>${label(120, 160, 'Vase d’expansion', 'mid small')}</g>
      <g data-part="radiator" class="p"><rect x="240" y="60" width="200" height="200" rx="8" class="f-metal"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${258 + i * 20} 70v180" class="thin"/>`).join('')}${label(340, 285, 'Radiateur', 'mid small')}</g>
      <g data-part="hose" class="p"><path d="M440 240C500 250 520 300 470 320" class="tube cool-tube"/></g>
      ${drops(470, 324, 'drain')}
      ${bolt(430, 70, 9, 'bleed')}
      <g data-part="fan" class="p"><circle cx="540" cy="140" r="50" class="f-dark"/><path d="M540 95v90M495 140h90" class="thin inv-stroke"/></g>
      <g data-part="temp" class="p"><rect x="60" y="230" width="110" height="60" rx="10" class="f-dark"/><path d="M80 270a35 35 0 0 1 70 0" class="thin inv-stroke"/><path d="M115 270l20-18" class="thick accent-stroke"/></g>`,
    steps: [{ tank: 'ccw' }, { hose: 'out', drain: 'drip' }, { tank: 'flow' }, { bleed: 'ccw' }, { fan: 'spin', temp: '' }, { tank: '' }, { temp: '' }],
  },

  'filtre-gasoil': {
    title: 'Filtre à gazole : raccords, capteur d’eau et poire d’amorçage',
    body: `<g data-part="filter" class="p"><rect x="250" y="80" width="110" height="180" rx="16" class="f-filter"/>${label(305, 70, 'Filtre', 'mid small')}</g>
      <g data-part="lines" class="p"><path d="M60 110H250M360 110H580" class="tube fuel-tube"/></g>
      <g data-part="clips" class="p"><rect x="226" y="98" width="24" height="24" rx="4" class="f-accent"/><rect x="360" y="98" width="24" height="24" rx="4" class="f-accent"/></g>
      <g data-part="sensor" class="p"><rect x="290" y="260" width="30" height="24" rx="4" class="f-dark"/>${label(200, 278, 'Capteur d’eau', 'mid small')}</g>
      <g data-part="bulb" class="p"><ellipse cx="120" cy="110" rx="34" ry="22" class="f-rubber"/>${label(120, 160, 'Poire', 'mid small')}</g>
      <g data-part="rag" class="p"><rect x="230" y="300" width="150" height="20" rx="6" class="f-blue"/></g>
      <g data-part="engine" class="p"><rect x="470" y="200" width="120" height="100" rx="12" class="f-metal"/>${label(530, 256, 'Moteur', 'mid small')}</g>`,
    steps: [{ filter: '', lines: 'flow' }, { rag: '', clips: 'out', sensor: '' }, { filter: 'up' }, { filter: 'down', clips: '' }, { bulb: 'press' }, { engine: 'spin' }],
  },

  fusible: {
    title: 'Boîte à fusibles : repérage, pince et filament',
    body: `<g data-part="box" class="p"><rect x="60" y="50" width="300" height="250" rx="14" class="f-dark"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${86 + (i % 6) * 44}" y="${90 + Math.floor(i / 6) * 90}" width="30" height="60" rx="4" class="${['f-red', 'f-blue', 'f-yellow', 'f-white'][i % 4]}"/>`).join('')}</g>
      <g data-part="fuse" class="p"><rect x="218" y="180" width="30" height="60" rx="4" class="f-yellow"/></g>
      <g data-part="lid" class="p"><rect x="400" y="50" width="200" height="120" rx="10" class="f-white"/>${label(500, 100, 'Schéma au dos', 'mid small')}${label(500, 130, 'F12 · 15 A', 'mid small')}</g>
      <g data-part="puller" class="p"><path d="M233 160v-60M223 100h20" class="thick"/></g>
      <g data-part="zoom" class="p"><rect x="420" y="200" width="160" height="100" rx="10" class="f-white"/><path d="M440 250h40l10-14 10 28 10-14h40" class="thick"/><path d="M490 236l20 28" class="thick bad-stroke"/>${label(500, 320, 'Filament coupé = grillé', 'mid small')}</g>`,
    steps: [{ box: '' }, { lid: '' }, { puller: 'up', fuse: 'up', zoom: '' }, { fuse: 'down' }],
  },

  'feux-arriere': {
    title: 'Feu arrière : trappe, porte-ampoules et ampoules',
    body: `<g data-part="trunk" class="p"><rect x="40" y="40" width="300" height="270" rx="20" class="f-metal"/>${label(190, 290, 'Coffre', 'mid small')}</g>
      <g data-part="hatch" class="p"><rect x="200" y="80" width="110" height="160" rx="10" class="f-dark"/></g>
      <g data-part="holder" class="p"><rect x="390" y="80" width="200" height="160" rx="12" class="f-white"/></g>
      <g data-part="bulb" class="p"><circle cx="440" cy="160" r="26" class="f-red lampglow"/>${label(440, 210, 'P21/5W', 'mid small')}</g>
      <g data-part="bulb2" class="p"><circle cx="540" cy="160" r="26" class="f-amber"/>${label(540, 210, 'PY21W', 'mid small')}</g>
      <g data-part="seal" class="p"><rect x="384" y="74" width="212" height="172" rx="16" class="seal-rect"/></g>`,
    steps: [{ hatch: 'out' }, { holder: 'right' }, { bulb: 'ccw' }, { bulb: 'blink' }, { holder: 'left', seal: '' }],
  },

  'usure-pneus': {
    title: 'Lire un pneu : dimensions, DOT, témoins d’usure et flancs',
    body: `<g data-part="tire" class="p"><rect x="60" y="40" width="220" height="280" rx="70" class="f-rubber"/>${Array.from({ length: 4 }, (_, i) => `<path d="M${105 + i * 44} 60v240" class="groove"/>`).join('')}</g>
      <g data-part="size" class="p">${label(450, 70, '205/55 R16 91V', 'mid big')}</g>
      <g data-part="dot" class="p"><rect x="390" y="96" width="120" height="34" rx="6" class="f-white"/>${label(450, 120, 'DOT 2321', 'mid')}</g>
      <g data-part="gauge" class="p"><rect x="140" y="20" width="16" height="120" rx="4" class="f-metal"/>${label(380, 180, '≥ 1,6 mm (légal) · 3 mm conseillé', '')}</g>
      <g data-part="edges" class="p"><path d="M66 70v220" class="bad-stroke thick"/><path d="M274 70v220" class="bad-stroke thick"/></g>
      <g data-part="bulge" class="p"><ellipse cx="520" cy="270" rx="70" ry="40" class="f-rubber"/><ellipse cx="560" cy="262" rx="18" ry="14" class="f-red"/>${label(520, 335, 'Hernie = à remplacer', 'mid small')}</g>`,
    steps: [{ size: '' }, { dot: '' }, { gauge: 'down' }, { edges: '' }, { bulge: 'blink' }],
  },

  'chaines-neige': {
    title: 'Montage des chaînes sur les roues motrices',
    body: `${ground()}${carSide(0, 70)}
      ${wheel(130, 280, 46, 'drive')}${wheel(510, 280, 46, 'rear')}
      <g data-part="chain" class="p"><circle cx="130" cy="280" r="50" class="chain"/></g>
      <g data-part="layout" class="p"><path d="M220 330h200" class="chain"/>${label(320, 352, 'Chaîne étalée, crochets vers l’extérieur', 'mid small')}</g>
      <g data-part="tensioner" class="p"><rect x="114" y="264" width="32" height="32" rx="6" class="f-accent"/></g>
      ${arrow('M200 230H300', 'drive-dir')}`,
    steps: [{ drive: '' }, { layout: '' }, { chain: '', drive: '' }, { tensioner: 'ccw' }, { 'drive-dir': 'flow', tensioner: '' }],
  },

  adblue: {
    title: 'Remplissage AdBlue : bouchon bleu et bec verseur',
    body: `<g data-part="flap" class="p"><rect x="60" y="60" width="240" height="200" rx="20" class="f-metal"/></g>
      <g data-part="diesel" class="p"><circle cx="130" cy="160" r="40" class="f-dark"/>${label(130, 230, 'Gazole', 'mid small')}</g>
      <g data-part="cap" class="p"><circle cx="230" cy="160" r="40" class="f-blue"/>${label(230, 230, 'AdBlue', 'mid small')}</g>
      <g data-part="can" class="p"><rect x="380" y="80" width="140" height="170" rx="14" class="f-white"/><path d="M380 110l-120 40" class="thick"/>${label(450, 170, 'AdBlue', 'mid')}</g>
      <g data-part="msg" class="p"><rect x="380" y="280" width="220" height="50" rx="10" class="f-dark"/>${label(490, 312, 'Démarrage impossible dans 800 km', 'inv mid small')}</g>`,
    steps: [{ cap: '', diesel: '' }, { cap: 'ccw', can: 'flow' }, { cap: 'cw', msg: 'blink' }],
  },

  obd: {
    title: 'Prise OBD sous le volant et adaptateur Bluetooth',
    body: `<rect data-bg x="30" y="30" width="580" height="120" rx="20" class="body"/>
      <g data-part="wheel" class="p"><circle cx="220" cy="120" r="70" class="wheel-ring"/></g>
      <g data-part="port" class="p"><path d="M200 230h70l-8 30h-54z" class="f-dark"/>${label(235, 290, 'Prise OBD', 'mid small')}</g>
      <g data-part="adapter" class="p"><rect x="214" y="190" width="42" height="40" rx="6" class="f-blue"/></g>
      <g data-part="phone" class="p"><rect x="440" y="170" width="90" height="160" rx="16" class="f-dark"/><rect x="450" y="186" width="70" height="120" rx="6" class="f-white"/>${label(485, 230, 'BLE', 'mid small')}</g>
      <g data-part="codes" class="p">${label(485, 260, 'P0420', 'mid small')}${label(485, 282, 'P0301', 'mid small')}</g>
      <g data-part="link" class="p"><path d="M260 200C330 150 380 150 440 200" class="flowline"/></g>
      <g data-part="check" class="p"><circle cx="560" cy="80" r="26" class="f-yellow"/>${label(560, 87, '✓', 'mid ink')}</g>`,
    steps: [{ port: '' }, { adapter: 'up' }, { link: 'flow', phone: '' }, { codes: '' }, { check: 'blink' }],
  },

  'courroie-accessoires': {
    title: 'Courroie d’accessoires : poulies et galet tendeur',
    body: `<g data-part="belt" class="p"><path d="M180 260C150 260 140 110 230 100L430 90C510 90 520 170 460 190L330 200C300 210 300 260 260 262z" class="belt"/></g>
      <g data-part="crank" class="p"><circle cx="200" cy="230" r="50" class="f-metal"/>${label(200, 236, 'Vilebrequin', 'mid small')}</g>
      <g data-part="alt" class="p"><circle cx="240" cy="110" r="32" class="f-metal"/>${label(240, 60, 'Alternateur', 'mid small')}</g>
      <g data-part="ac" class="p"><circle cx="440" cy="120" r="38" class="f-metal"/>${label(440, 70, 'Clim', 'mid small')}</g>
      <g data-part="tensioner" class="p"><circle cx="330" cy="200" r="22" class="f-accent"/></g>
      <g data-part="tool" class="p"><path d="M330 200l90 110" class="thick"/>${label(440, 330, 'Clé du tendeur', 'mid small')}</g>
      <g data-part="photo" class="p"><rect x="520" y="230" width="90" height="70" rx="10" class="f-dark"/><circle cx="565" cy="265" r="18" class="f-metal"/></g>`,
    steps: [{ photo: '' }, { tool: 'swing', tensioner: '' }, { alt: 'spin', ac: 'spin', tensioner: 'spin' }, { belt: '' }, { tool: 'swing', belt: '' }, { crank: 'spin', belt: 'flow' }],
  },

  'balai-arriere': {
    title: 'Essuie-glace arrière : bras et balai',
    body: `<path data-bg d="M80 60h480l40 240H40z" class="glass"/>
      <g data-part="arm" class="p" style="transform-box: view-box; transform-origin: 320px 300px"><path d="M320 300L320 120" class="thick"/>
        <g data-part="blade" class="p"><path d="M200 140H440" class="blade"/></g></g>`,
    steps: [{ arm: 'swing' }, { blade: 'out' }, { blade: 'in', arm: 'swing' }],
  },
};

/** SVG complet d'une scène. */
export function sceneSvg(id) {
  const s = SCENES[id];
  return s ? svg(s.body, s.title) : null;
}
