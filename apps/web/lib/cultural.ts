/**
 * Cultural, Linguistic, and Historical Knowledge Base for Igbo Community Atlas
 */

export interface DialectCluster {
  id: string;
  name: string;
  igboName: string;
  description: string;
  color: string;
  states: string[];
  lgas?: string[];
  features: string[];
  sampleGreeting: string;
}

export const DIALECT_CLUSTERS: Record<string, DialectCluster> = {
  waawa: {
    id: 'waawa',
    name: 'Waawa / Northern Igbo',
    igboName: 'Olundi Waawa (Enugu & Nsukka Basin)',
    description: 'Enugu, Nsukka, Udi, Agbaja, Nkanu, and Kogi/Benue borderlands. Characterized by distinctive phonology, guttural tones, and rich oral traditions.',
    color: '#38bdf8', // Sky Blue
    states: ['Enugu', 'Kogi', 'Benue'],
    features: ['Udi Hills', 'Nsukka Plateau', 'Ibagwa', 'Opi', 'Lejja Iron Smelting'],
    sampleGreeting: 'Dee-wó / Nnọọ nwanne m',
  },
  northeastern: {
    id: 'northeastern',
    name: 'Northeastern / Abakaliki Cluster',
    igboName: 'Olundi Ezza, Izzi, Ikwo na Mgbo',
    description: 'Ebonyi State agrarian basin and Benue borderlands (Ado/Obi/Okpokwu). Features unique vowel systems, sacred salt lakes (Uburu/Okposi), and distinct age-grade structures.',
    color: '#0284c7', // Deep Sky Blue
    states: ['Ebonyi', 'Benue'],
    features: ['Abakaliki', 'Ezza', 'Izzi', 'Ikwo', 'Mgbo', 'Effium Market'],
    sampleGreeting: 'Dee-wó / Ekele nwa m',
  },
  central: {
    id: 'central',
    name: 'Central & Etiti Igbo Continuum',
    igboName: 'Igbo Izugbe & Etiti',
    description: 'Owerri, Umuahia, Okigwe, Orlu, Mbaise, Ngwa & Bende. Bedrock for modern standard literary Igbo formalized by Dr. S.E. Onwu committee.',
    color: '#10b981', // Emerald
    states: ['Imo', 'Abia'],
    features: ['Owerri cultural axis', 'Umuahia historical hub', 'Mbaise cultural hearth', 'Aba commercial hub'],
    sampleGreeting: 'Ndewo nwanne m / Kedụ ka ị mere?',
  },
  anioma: {
    id: 'anioma',
    name: 'Anioma / Western Igbo Continuum',
    igboName: 'Igbo Enuani, Ika na Ukwuani',
    description: 'Enuani (Asaba, Ogwashi-Uku, Ibusa, Issele-Uku), Ika (Agbor, Owa, Igbanke in Edo), and Ukwuani-Ndokwa (Kwale, Aboh, Obiaruku) across Delta State and Edo borderlands.',
    color: '#a855f7', // Purple
    states: ['Delta', 'Edo'],
    features: ['Asaba', 'Agbor', 'Ogwashi-Uku', 'Kwale', 'Aboh', 'Igbanke'],
    sampleGreeting: 'Nnọọ / Kọdụ ka ị dị? / Agbalụ aka nwa',
  },
  southern: {
    id: 'southern',
    name: 'Southern Igboid / Rivers State Continuum',
    igboName: 'Olundi Ndịda & Rivers Igboid',
    description: 'Ikwerre, Etche, Ogba, Egbema, Ekpeye, Ndoni, Oyigbo (Ndoki), and the coastal Opobo and Bonny Igbo language-shift enclaves of Rivers State.',
    color: '#f59e0b', // Amber
    states: ['Rivers', 'Delta'],
    lgas: ['NG033013', 'NG033011', 'NG033016', 'NG033021', 'NG033019', 'NG033010', 'NG033015', 'NG033022', 'NG033002', 'NG033003', 'NG033020', 'NG033007'],
    features: ['Port Harcourt (Rebisi/Diobu)', 'Grand Bonny (Okoloma)', 'Omoku (Ogbaland)', 'Okehi (Etche)', 'Ozuzu Amadioha Shrine', 'Opobo Kingdom', 'Ahoada (Ekpeye)', 'Isiokpo (Ikwerre)'],
    sampleGreeting: 'Ndaani / Meka / Ibọlachi / Kpọkọma',
  },
  crossriver: {
    id: 'crossriver',
    name: 'Cross River / Eastern Igbo',
    igboName: 'Igbo Mmiri Cross',
    description: 'Afikpo (Ehugbo), Edda, Ohafia, Abiriba, Arochukwu, and Nkporo. Renowned for age-grade governance, warrior traditions, and matrilineal kinship patterns.',
    color: '#ec4899', // Pink
    states: ['Ebonyi', 'Abia', 'Cross River'],
    features: ['Arochukwu Long Juju', 'Ohafia War Dance', 'Abiriba enterprise', 'Afikpo rock formations'],
    sampleGreeting: 'Mma mma nụ / Nnọọ ndị be anyị',
  },
  anambra_basin: {
    id: 'anambra_basin',
    name: 'Anambra Basin / Idemili',
    igboName: 'Mpaghara Mmiri Anambra',
    description: 'Onitsha, Awka, Nnewi, Aguleri, and Idemili river valley. Epicenter of early metallurgy (Igbo-Ukwu 9th century bronze), commerce, and sacred river veneration.',
    color: '#06b6d4', // Cyan
    states: ['Anambra'],
    features: ['Igbo-Ukwu Bronze Culture', 'River Niger confluence', 'Onitsha Main Market', 'Nri Ancestral Hearth'],
    sampleGreeting: 'Daalụ nwanne m / Nnọọ',
  },
};

/**
 * Archaeological Sites & Ancient Metallurgical Epigraphy in the Igbo Region
 */
export interface ArchaeologicalSite {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number];
  era: string;
  description: string;
  significance: string;
  keyArtifacts: string[];
}

export const ARCHAEOLOGICAL_SITES: ArchaeologicalSite[] = [
  {
    id: 'arch-igbo-ukwu',
    name: 'Igbo-Ukwu Bronze & Regalia Complex',
    location: 'Igbo-Ukwu, Aguata LGA, Anambra State',
    coordinates: [7.0189, 6.0177],
    era: '9th Century CE (c. 850 CE)',
    description: 'Excavated by Prof. Thurstan Shaw (1959–1964) at Isaiah, Richard, and Jonah Anozie compounds. Unearthed the oldest bronze casting tradition in Sub-Saharan West Africa.',
    significance: 'Reveals an opulent, highly organized sacerdotal monarchy and long-distance trade network pre-dating European contact by over five centuries.',
    keyArtifacts: ['Roped bronze pot', 'Bronze altar stand with male/female figures', 'Elephant tusk regalia', 'Over 165,000 glass beads', 'Pectoral bronze crowns'],
  },
  {
    id: 'arch-lejja-iron',
    name: 'Lejja Iron Smelting Slag Field',
    location: 'Lejja, Nsukka Basin, Enugu State',
    coordinates: [7.3821, 6.7812],
    era: 'c. 2000 BCE – 500 CE',
    description: 'Massive prehistoric iron smelting complex featuring circular arrangements of heavy slag blocks at the Dunoka village square.',
    significance: 'One of the earliest and densest metallurgical iron-smelting operations in world history, establishing the antiquity of high-temperature metallurgy on the Nsukka plateau.',
    keyArtifacts: ['Cylindrical iron slag blocks', 'Smelting tuyeres (clay pipes)', 'Ancient furnace foundations', 'Charcoal dated to 2nd millennium BCE'],
  },
  {
    id: 'arch-opi-furnaces',
    name: 'Opi Prehistoric Iron Smelting Furnaces',
    location: 'Opi, Nsukka Basin, Enugu State',
    coordinates: [7.4351, 6.7681],
    era: 'c. 750 BCE – 200 BCE',
    description: 'Excavated by University of Nigeria Nsukka archaeologists, uncovering intact natural-draft bloomery furnaces and massive slag heaps.',
    significance: 'Demonstrates industrial-scale metallurgical production in the Waawa region during the early Iron Age.',
    keyArtifacts: ['Shaft bloomery furnaces', 'Cinder cakes', 'Early Iron Age pottery shards'],
  },
  {
    id: 'arch-ugwuele-stone-age',
    name: 'Ugwuele Lower Palaeolithic Stone Quarry',
    location: 'Uturu / Ugwuele, Isuikwuato LGA, Abia State',
    coordinates: [7.4215, 5.8341],
    era: 'Acheulean Era (c. 250,000 – 50,000 BCE)',
    description: 'The largest Acheulean stone tool workshop site in West Africa, excavated by the Dept. of Archaeology, UNN.',
    significance: 'Confirms continuous hominid occupation and tool-making culture in southeastern Nigeria stretching back hundreds of thousands of years.',
    keyArtifacts: ['Acheulean stone handaxes', 'Cleavers', 'Stone picks', 'Flake tools'],
  },
  {
    id: 'arch-nsibidi-crossriver',
    name: 'Nsibidi Indigenous Inscriptions & Monoliths',
    location: 'Arochukwu / Cross River Basin (Ikom-Alok borderlands)',
    coordinates: [7.9122, 5.3854],
    era: 'Pre-Colonial (Documented 400 CE – 1900 CE)',
    description: 'Ancient indigenous ideographic and pictographic writing system used by Ekpe / Okonko secret societies for judicial records, land titles, and love messages.',
    significance: 'Disproves the myth of universal precolonial illiteracy; formed a trans-regional administrative script connecting Arochukwu, Cross River, and coastal trading houses.',
    keyArtifacts: ['Carved stone monoliths', 'Okonko guild cloths', 'Gourd incised scripts', 'Judicial court markers'],
  },
];

/**
 * Ancient Waterway Highway Trade Corridors
 */
export interface WaterwayTradeCorridor {
  id: string;
  name: string;
  route: string;
  basin: string;
  keyPorts: string[];
  historicalCommodities: string[];
  description: string;
  center: [number, number];
  zoom: number;
}

export const WATERWAY_TRADE_CORRIDORS: WaterwayTradeCorridor[] = [
  {
    id: 'waterway-lower-niger',
    name: 'Lower River Niger Maritime Arterial',
    route: 'Idah (Kogi) -> Asaba -> Onitsha Wharf -> Osomari -> Aboh -> Atlantic Estuary',
    basin: 'River Niger (Orimili)',
    keyPorts: ['Onitsha Wharf', 'Asaba Ferry Head', 'Osomari Port', 'Aboh Royal Wharf', 'Atani Beach'],
    historicalCommodities: ['Yams', 'Brass ingots', 'European trade textiles', 'Palm oil casks', 'Smoked fish'],
    description: 'The primary aquatic superhighway of southern Nigeria. Controlled by the naval canoe flotillas of the Aboh Kingdom and Onitsha merchants, facilitating trade tariffs across 300+ kilometers.',
    center: [6.75, 6.0],
    zoom: 8.5,
  },
  {
    id: 'waterway-imo-river',
    name: 'Imo River Coastal Trade Corridor',
    route: 'Okigwe Hills -> Umuahia/Aba -> Azumini Blue River -> Opobo Town -> Atlantic Ocean',
    basin: 'Imo River (Mmiri Imo)',
    keyPorts: ['Aba River Landing', 'Azumini Blue River Port', 'Akwete Wharf', 'Opobo Town Wharf', 'Queenstown'],
    historicalCommodities: ['Akwete woven cloth', 'Palm oil', 'Salt', 'Camwood', 'Smoked seafish'],
    description: 'The historic artery through which King Jaja of Opobo intercepted the British Royal Niger Company inland monopoly, ferrying palm oil directly from the Ngwa and Ndoki hinterland to the Atlantic.',
    center: [7.35, 5.0],
    zoom: 8.8,
  },
  {
    id: 'waterway-orashi-basin',
    name: 'Orashi – Oguta Lake River Highway',
    route: 'Oguta Lake -> Omoku (Ogbaland) -> Ahoada (Ekpeye) -> Degema / Abonnema Delta Creeks',
    basin: 'Orashi & Oguta Basin',
    keyPorts: ['Oguta Lake Port', 'Omoku River Jetty', 'Ahoada Beach', 'Egbema Wharf'],
    historicalCommodities: ['Oguta timber', 'Cassava starch', 'Canoe timber logs', 'Palm kernels'],
    description: 'Confluence linking the sacred twin waters of Urashi and Ogbuide down through the freshwater swamps to the salt-water mangrove creeks.',
    center: [6.75, 5.4],
    zoom: 9.0,
  },
  {
    id: 'waterway-omambala-anambra',
    name: 'Omambala (Anambra) River Agricultural Corridor',
    route: 'Ibaji / Kogi Border -> Anam -> Aguleri -> River Niger Confluence',
    basin: 'Anambra River Basin',
    keyPorts: ['Otuocha Market Port (Aguleri)', 'Odekpe Wharf', 'Umuoba Anam Jetty', 'Onyedega Wharf'],
    historicalCommodities: ['Floodplain yams', 'Swamp rice', 'River fish', 'Clay pottery'],
    description: 'Fertile alluvium breadbasket corridor supporting the ancient Eri civilization and continuous river transport between the Middle Belt and Anambra.',
    center: [6.88, 6.4],
    zoom: 9.2,
  },
];

/**
 * Traditional 4-Day Igbo Market Cycle Calculation (Izu)
 * Cycle: Eke -> Orie (Oye) -> Afọ -> Nkwọ
 */
export const IGBO_MARKET_DAYS = [
  { name: 'Eke', spirit: 'Uke (Creation & Fire)', element: 'East / Fire', symbol: '☀️' },
  { name: 'Orie', spirit: 'Oye (Water & Commerce)', element: 'West / Water', symbol: '💧' },
  { name: 'Afọ', spirit: 'Afọ (Earth & Agriculture)', element: 'North / Earth', symbol: '🌱' },
  { name: 'Nkwọ', spirit: 'Nkwọ (Air & Destiny)', element: 'South / Air', symbol: '🍃' },
];

// Reference anchor: January 1, 2024 was Orie (index 1)
const ANCHOR_DATE = new Date('2024-01-01T00:00:00Z');
const ANCHOR_INDEX = 1; // 0: Eke, 1: Orie, 2: Afọ, 3: Nkwọ

export function getIgboMarketDay(date = new Date()): {
  name: string;
  spirit: string;
  element: string;
  symbol: string;
  index: number;
} {
  const diffTime = date.getTime() - ANCHOR_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const dayIndex = ((ANCHOR_INDEX + diffDays) % 4 + 4) % 4;
  return {
    ...IGBO_MARKET_DAYS[dayIndex],
    index: dayIndex,
  };
}

/**
 * Historical Migration & Ancestral Relationship Arcs
 */
export interface MigrationArc {
  id: string;
  name: string;
  origin: { name: string; coordinates: [number, number] };
  destination: { name: string; coordinates: [number, number] };
  era: string;
  description: string;
  color: string;
}

export const ANCESTRAL_MIGRATION_ARCS: MigrationArc[] = [
  {
    id: 'nri-hegemony',
    name: 'Nri Spiritual & Agricultural Diaspora',
    origin: { name: 'Nri (Ancestral Cradle)', coordinates: [7.0267, 6.1578] },
    destination: { name: 'Aguleri / Omambala', coordinates: [6.8865, 6.3421] },
    era: 'c. 900 AD – 1300 AD',
    description: 'The expansion of yam title-taking (Ichi), sacred peace covenants, and bronze metallurgy radiating from the Nri Kingdom.',
    color: '#10b981',
  },
  {
    id: 'nri-igboukwu',
    name: 'Nri to Igbo-Ukwu Cultural Sphere',
    origin: { name: 'Nri', coordinates: [7.0267, 6.1578] },
    destination: { name: 'Igbo-Ukwu', coordinates: [7.0189, 6.0177] },
    era: '9th Century AD',
    description: 'The sophisticated lost-wax copper alloy casting and regal burial regalia documented at Igbo-Ukwu.',
    color: '#059669',
  },
  {
    id: 'aro-arondizuogu',
    name: 'Arochukwu to Arondizuogu Settlement',
    origin: { name: 'Arochukwu', coordinates: [7.9122, 5.3854] },
    destination: { name: 'Arondizuogu (Imo State)', coordinates: [7.1432, 5.8643] },
    era: '18th Century (Mazi Izuogu Mgbokpo)',
    description: 'Establishment of the largest Aro diaspora settlement in central Igboland by Mazi Izuogu, controlling trans-regional trade routes.',
    color: '#f59e0b',
  },
  {
    id: 'aro-ndikelionwu',
    name: 'Arochukwu to Aro-Ndikelionwu',
    origin: { name: 'Arochukwu', coordinates: [7.9122, 5.3854] },
    destination: { name: 'Aro-Ndikelionwu (Anambra State)', coordinates: [7.1662, 6.0831] },
    era: 'Mid 18th Century',
    description: 'Founded by Mazi Ikelionwu, developing agricultural plantations and commercial stations in modern Orumba North.',
    color: '#d97706',
  },
  {
    id: 'ezechima-onitsha',
    name: 'Ezechima Migration to Onitsha (Ado N’Idu)',
    origin: { name: 'Igbanke / Western Borderlands', coordinates: [6.1245, 6.3214] },
    destination: { name: 'Onitsha (River Niger)', coordinates: [6.7865, 6.1498] },
    era: '16th Century (c. 1500s)',
    description: 'The westward-to-eastward crossing of the River Niger led by Chima, establishing Onitsha Ado and the Obi of Onitsha kingship.',
    color: '#a855f7',
  },
  {
    id: 'ezechima-anioma',
    name: 'Ezechima Clan Settlements across Anioma',
    origin: { name: 'Igbanke / Anioma Hearth', coordinates: [6.1245, 6.3214] },
    destination: { name: 'Issele-Uku / Ogwashi-Uku', coordinates: [6.4851, 6.3112] },
    era: '16th Century',
    description: 'The foundation of the Umuezechima clan towns (Issele-Uku, Onicha-Olona, Ezi, Obior, Onicha-Ugbo).',
    color: '#8b5cf6',
  },
  {
    id: 'ikwerre-rumuokoro',
    name: 'Ikwerre Clan Lineage Continuum',
    origin: { name: 'Elele / Isiokpo Hearth', coordinates: [6.8184, 5.1054] },
    destination: { name: 'Port Harcourt / Diobu-Rebisi', coordinates: [6.9984, 4.8521] },
    era: 'Pre-Colonial Epoch',
    description: 'The southward movement of Ikwerre clan confederations along the fertile upland ridges of the Niger Delta toward the coastal creeks.',
    color: '#ec4899',
  },
  {
    id: 'opobo-jaja-founding',
    name: 'King Jaja Opobo Kingdom Founding Corridor',
    origin: { name: 'Amaigbo (Ancestral Hearth)', coordinates: [7.0851, 5.6724] },
    destination: { name: 'Opobo Town (Imo River Estuary)', coordinates: [7.5412, 4.5189] },
    era: '1869–1870 AD (King Jaja)',
    description: 'Founding of the Opobo Kingdom by King Jaja of Amaigbo with 14 royal chieftaincy houses, establishing Igbo as the official court and market tongue across the coastal delta.',
    color: '#f59e0b',
  },
  {
    id: 'eri-aguleri-lineage',
    name: 'Eri Ancestral Genesis & Omambala Hearth',
    origin: { name: 'Eri Hearth (Eri-Aka, Aguleri)', coordinates: [6.8865, 6.3421] },
    destination: { name: 'Nri & Igbariam Valleys', coordinates: [7.0267, 6.1578] },
    era: 'Ancient Antiquity (c. 10th Century BC – 900 AD)',
    description: 'Ancestral genesis traditions of the Umueri and Umunri clans, establishing bronze metallurgy, agricultural covenants, and the sacred Eze Nri stool.',
    color: '#10b981',
  },
  {
    id: 'aboh-niger-kingdom',
    name: 'Aboh Riverine Naval Empire & Lower Niger Corridors',
    origin: { name: 'Aboh (River Niger West Bank)', coordinates: [6.5412, 5.5489] },
    destination: { name: 'Ndoni & Upper Delta Waterways', coordinates: [6.7214, 5.3891] },
    era: '17th–19th Century (King Obi Ossai)',
    description: 'Canoe flotilla naval supremacy along the lower Niger, controlling trade tariffs and diplomatic covenants from Asaba to the Nun/Forcados estuaries.',
    color: '#06b6d4',
  },
  {
    id: 'aro-benue-middlebelt',
    name: 'Arochukwu to Benue Valley Commercial Highway',
    origin: { name: 'Arochukwu (Chukwu Ibin Ukpabi)', coordinates: [7.9122, 5.3854] },
    destination: { name: 'Idoma & Tiv Borderlands (Otukpo/Wukari)', coordinates: [8.1345, 7.1892] },
    era: '18th–19th Century',
    description: 'The northernmost mercantile highway of the Aro Confederacy, linking cross-river trade rings to the Benue salt mines and Middle Belt markets.',
    color: '#f59e0b',
  },
];

/**
 * Major River Basins and Key Reference Waterways in the Igbo Region
 */
export const MAJOR_WATERWAYS = [
  { name: 'River Niger (Orimili)', basin: 'Niger Basin', coords: [6.75, 6.15] as [number, number] },
  { name: 'Anambra River (Omambala)', basin: 'Anambra Basin', coords: [6.85, 6.35] as [number, number] },
  { name: 'Imo River (Mmiri Imo)', basin: 'Imo Basin', coords: [7.25, 5.25] as [number, number] },
  { name: 'Urashi River (Orashi)', basin: 'Orashi Basin', coords: [6.75, 5.45] as [number, number] },
  { name: 'Cross River (Anyim)', basin: 'Cross River Basin', coords: [7.95, 5.85] as [number, number] },
  { name: 'Otamiri River', basin: 'Imo / Otamiri Basin', coords: [7.05, 5.40] as [number, number] },
  { name: 'Sombreiro River', basin: 'Niger Delta Basin', coords: [6.78, 4.95] as [number, number] },
  { name: 'Aba River (Mmiri Ogbor)', basin: 'Imo Basin', coords: [7.38, 5.12] as [number, number] },
];

/**
 * Calculate Approximate Proximity to Major Waterways
 */
export function calculateNearestWaterway(lon: number, lat: number): {
  name: string;
  basin: string;
  distanceKm: number;
} {
  let nearest = MAJOR_WATERWAYS[0];
  let minDistance = Infinity;

  for (const w of MAJOR_WATERWAYS) {
    const d = getHaversineDistance(lat, lon, w.coords[1], w.coords[0]);
    if (d < minDistance) {
      minDistance = d;
      nearest = w;
    }
  }

  return {
    name: nearest.name,
    basin: nearest.basin,
    distanceKm: Math.round(minDistance * 10) / 10,
  };
}

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determine Dialect Cluster based on State and LGA.
 * Returns undefined if the location is outside documented Igbo-speaking areas.
 */
export function getDialectForLocation(stateName?: string, lgaName?: string): DialectCluster | undefined {
  if (!stateName) return undefined;

  const s = stateName.toLowerCase();
  const l = (lgaName || '').toLowerCase();

  // 1. Southeast Regional States
  if (
    s.includes('anambra') ||
    l.includes('onitsha') ||
    l.includes('awka') ||
    l.includes('nnewi') ||
    l.includes('idemili') ||
    l.includes('aguleri') ||
    l.includes('anam') ||
    l.includes('ihiala') ||
    l.includes('ogbaru')
  ) {
    return DIALECT_CLUSTERS.anambra_basin;
  }

  if (
    s.includes('enugu') ||
    l.includes('nsukka') ||
    l.includes('udi') ||
    l.includes('nkanu') ||
    l.includes('agbaja') ||
    l.includes('ezeagu') ||
    l.includes('oji river') ||
    l.includes('awgu')
  ) {
    return DIALECT_CLUSTERS.waawa;
  }

  if (s.includes('ebonyi')) {
    if (
      l.includes('izzi') ||
      l.includes('ezza') ||
      l.includes('ikwo') ||
      l.includes('mgbo') ||
      l.includes('abakaliki') ||
      l.includes('ohaukwu') ||
      l.includes('ishielu') ||
      l.includes('onueke')
    ) {
      return DIALECT_CLUSTERS.northeastern;
    }
    if (l.includes('afikpo') || l.includes('edda') || l.includes('ivo') || l.includes('onicha')) {
      return DIALECT_CLUSTERS.crossriver;
    }
    return DIALECT_CLUSTERS.northeastern;
  }

  if (s.includes('imo')) {
    return DIALECT_CLUSTERS.central;
  }

  if (s.includes('abia')) {
    if (
      l.includes('ohafia') ||
      l.includes('abiriba') ||
      l.includes('arochukwu') ||
      l.includes('bende') ||
      l.includes('isuikwuato')
    ) {
      return DIALECT_CLUSTERS.crossriver;
    }
    return DIALECT_CLUSTERS.central;
  }

  // 2. Beyond-Southeast Documented Igbo Territories
  // Delta North (Anioma): Aniocha, Ika, Ndokwa, Oshimili, Ukwuani
  if (s.includes('delta')) {
    if (
      l.includes('aniocha') ||
      l.includes('ika') ||
      l.includes('ndokwa') ||
      l.includes('oshimili') ||
      l.includes('ukwuani') ||
      l.includes('asaba') ||
      l.includes('agbor') ||
      l.includes('kwale') ||
      l.includes('ogwashi') ||
      l.includes('aboh') ||
      l.includes('isheagu') ||
      l.includes('obiaruku')
    ) {
      return DIALECT_CLUSTERS.anioma;
    }
    return undefined; // Non-Anioma Delta (Urhobo, Itsekiri, Ijaw, Isoko)
  }

  // Edo State: Only Orhionmwon / Igbanke borderlands
  if (s.includes('edo')) {
    if (l.includes('orhionmwon') || l.includes('igbanke') || l.includes('oligie')) {
      return DIALECT_CLUSTERS.anioma;
    }
    return undefined; // Non-Igbo Edo
  }

  // Rivers State: Igboid LGAs
  if (s.includes('rivers')) {
    if (
      l.includes('ikwerre') ||
      l.includes('etche') ||
      l.includes('ogba') ||
      l.includes('oyigbo') ||
      l.includes('ahoada') ||
      l.includes('emohua') ||
      l.includes('obia') ||
      l.includes('obio') ||
      l.includes('omumma') ||
      l.includes('port-harcourt') ||
      l.includes('port harcourt') ||
      l.includes('opobo') ||
      l.includes('bonny') ||
      l.includes('diobu')
    ) {
      return DIALECT_CLUSTERS.southern;
    }
    return undefined; // Non-Igboid Rivers LGAs
  }

  // Benue State: Only southern indigenous Igbo LGAs (Ado, Obi, Oju, Okpokwu)
  if (s.includes('benue')) {
    if (
      l.includes('ado') ||
      l.includes('obi') ||
      l.includes('oju') ||
      l.includes('okpokwu') ||
      l.includes('inikiri') ||
      l.includes('idelle') ||
      l.includes('amaeke') ||
      l.includes('ichama') ||
      l.includes('okponga')
    ) {
      return DIALECT_CLUSTERS.northeastern;
    }
    return undefined; // Non-Igbo Benue areas
  }

  // Kogi State: Only southern borderlands (Ibaji, Igalamela-Odolu)
  if (s.includes('kogi')) {
    if (
      l.includes('ibaji') ||
      l.includes('igalamela') ||
      l.includes('onyedega') ||
      l.includes('odeke') ||
      l.includes('odolu')
    ) {
      return DIALECT_CLUSTERS.waawa;
    }
    return undefined; // Non-Igbo Kogi
  }

  // Akwa Ibom State: Only documented borderland contacts (Ika, Ini, Itu, Oruk Anam)
  if (s.includes('akwa ibom')) {
    if (
      l.includes('ika') ||
      l.includes('ini') ||
      l.includes('itu') ||
      l.includes('oruk anam') ||
      l.includes('urua inyang')
    ) {
      return DIALECT_CLUSTERS.crossriver;
    }
    return undefined; // Non-borderland Akwa Ibom
  }

  // Anywhere else in Nigeria (e.g. Lagos, Kano, Kaduna, etc.): Not an Igbo dialect area!
  return undefined;
}
