/** Southeast geopolitical zone (100% Igbo baseline): Abia, Anambra, Ebonyi, Enugu, Imo */
export const SE_STATE_CODES = ['NG001', 'NG004', 'NG011', 'NG014', 'NG017'];

export interface SoutheastStateInfo {
  code: string;
  name: string;
  capital: string;
  center: [number, number];
  zoom: number;
  lgasCount: number;
  culturalHeart: string;
  dialects: string;
  historicalSummary: string;
}

export const SE_STATES: SoutheastStateInfo[] = [
  {
    code: 'NG001',
    name: 'Abia',
    capital: 'Umuahia',
    center: [7.52, 5.45],
    zoom: 8.6,
    lgasCount: 17,
    culturalHeart: 'Aba commercial hub, Umuahia, Bende, Ohafia & Arochukwu',
    dialects: 'Central Igbo (Ngwa, Ohuhu, Umuahia), Cross River Igbo (Ohafia, Abiriba, Arochukwu)',
    historicalSummary: 'Home of Ariaria International Market in Aba, historic Arochukwu Kingdom (ancient trade confederacy), and renowned Ohafia/Abiriba martial and mercantile heritage.',
  },
  {
    code: 'NG004',
    name: 'Anambra',
    capital: 'Awka',
    center: [6.93, 6.22],
    zoom: 8.8,
    lgasCount: 21,
    culturalHeart: 'Nri kingdom cradle, Onitsha (Ado N’Idu), Awka metallurgy, Igbo-Ukwu',
    dialects: 'Anambra Basin & Idemili, Onitsha, Awka, Aguata',
    historicalSummary: 'Spiritual and metallurgical heart of Igboland: 9th-century bronze casting at Igbo-Ukwu, Nri sacred royalty and Eze Nri institution, Onitsha Niger commercial gateway, and ancient Awka blacksmith guilds.',
  },
  {
    code: 'NG011',
    name: 'Ebonyi',
    capital: 'Abakaliki',
    center: [8.0, 6.25],
    zoom: 8.5,
    lgasCount: 13,
    culturalHeart: 'Abakaliki agrarian basin, Afikpo (Ehugbo), Edda, Ezza',
    dialects: 'Waawa / Northeastern Igbo (Izzi, Ezza, Ikwo, Mgbo), Southern Ebonyi (Afikpo, Edda)',
    historicalSummary: 'Known for agricultural richness (Abakaliki rice and yam harvest), Afikpo traditional age grades and rock formations, ancient salt lake industries of Okposi/Uburu, and profound masquerade societies.',
  },
  {
    code: 'NG014',
    name: 'Enugu',
    capital: 'Enugu',
    center: [7.45, 6.6],
    zoom: 8.5,
    lgasCount: 17,
    culturalHeart: 'Nsukka cultural basin, Udi hills, Agbaja, Nkanu, Coal City',
    dialects: 'Waawa / Northern Igbo continuum (Nsukka, Udi, Nkanu, Agbaja)',
    historicalSummary: 'Capital of the historic Eastern Region. Features ancient Lejja iron-smelting furnaces (dating to 2000 BC), Nsukka University academic hearth, Udi undulating escarpments, and Opi archaeological sites.',
  },
  {
    code: 'NG017',
    name: 'Imo',
    capital: 'Owerri',
    center: [7.05, 5.5],
    zoom: 8.7,
    lgasCount: 27,
    culturalHeart: 'Owerri civic hearth, Mbaise cultural cradle, Orlu, Okigwe, Oguta Lake',
    dialects: 'Central Standard Igbo foundation (Owerri, Mbaise, Orlu, Okigwe)',
    historicalSummary: 'Linguistic bedrock for modern Standard Igbo (Izugbe). Famed for Mbaise Iri Ji national festivals, Oguta sacred lake confluence (Urashi and Ogbuide rivers), and vibrant civic/commercial traditions.',
  },
];


/**
 * Baseline LGAs outside the Southeast that identify as Igbo:
 * - The nine Anioma LGAs of Delta State
 * - Key Igbo-speaking / subgroup LGAs of Rivers State (Ikwerre, Etche, Ogba/Egbema/Ndoni, Oyigbo, Omumma, etc.)
 */
export const ANIOMA_LGAS = [
  'NG010001', // Aniocha North
  'NG010002', // Aniocha South
  'NG010007', // Ika North East
  'NG010008', // Ika South
  'NG010011', // Ndokwa East
  'NG010012', // Ndokwa West
  'NG010014', // Oshimili North
  'NG010015', // Oshimili South
  'NG010021', // Ukwuani
];

export const RIVERS_IGBO_LGAS = [
  'NG033013', // Ikwerre
  'NG033011', // Etche
  'NG033016', // Ogba/Egbema/Ndoni
  'NG033021', // Oyigbo
  'NG033019', // Omumma
  'NG033010', // Emohua
  'NG033015', // Obia/Akpor
  'NG033022', // Port-Harcourt (Rebisi/Diobu)
  'NG033002', // Ahoada East (Ekpeye)
  'NG033003', // Ahoada West (Ekpeye/Engenni borderlands)
  'NG033020', // Opobo/Nkoro (Opobo Kingdom coastal Igbo enclave)
  'NG033007', // Bonny (Grand Bonny / Okoloma - historic Igbo language-shift & mercantile enclave)
];

/**
 * Contiguous borderland LGAs outside the Southeast with documented Igbo communities / dialect enclaves:
 * - Orhionmwon (Edo State): Igbanke / borderland autonomous communities
 * - Ibaji & Igalamela-Odolu (Kogi State): Southern riverine & Nsukka borderland communities
 * - Ado, Obi, Oju (Benue State): Ezza, Izzi, and Ngbo agrarian communities and historical borderland enclaves
 */
export const BORDERLAND_IGBO_LGAS = [
  'NG012013', // Orhionmwon (Edo)
  'NG023006', // Ibaji (Kogi)
  'NG023007', // Igalamela-Odolu (Kogi - Nsukka/Udenu borderland contact zone)
  'NG007001', // Ado (Benue - Agila, Ulayi, Ijigbam, Ekile, Igumale borderland Ezza/Izzi/Effium enclaves)
  'NG007014', // Obi (Benue - Amaeke/Amaekka, Obi-Ukwute, Adum-Ogbo Ezza farmlands)
  'NG007017', // Oju (Benue - Idelle, Umuezeoka Ugo, Ndiighe, Egbilla-Izzi agrarian settlements)
  'NG007018', // Okpokwu (Benue - Ichama, Okponga, Ingle-Okpale Ezza/Izzi borderland farmlands)
  'NG003011', // Ika (Akwa Ibom - Urua Inyang / Annang-Ngwa borderland continuum)
  'NG003015', // Ini (Akwa Ibom - Aro Amuvi & Odoro Ikpe borderland colonies)
  'NG003016', // Itu (Akwa Ibom - Enyong Creek & Cross River Aro trade terminus)
  'NG003026', // Oruk Anam (Akwa Ibom - Ekparakwa regional trade junction)
];

export const IGBO_IDENTIFIED_LGAS = [
  ...ANIOMA_LGAS,
  ...RIVERS_IGBO_LGAS,
  ...BORDERLAND_IGBO_LGAS,
];

export interface ConstituentLga {
  code: string;
  name: string;
  state: string;
  stateCode: string;
  center: [number, number];
}

export interface BeyondRegionData {
  id: 'delta-anioma' | 'rivers-upland' | 'edo-igbanke' | 'kogi-ibaji' | 'benue-borderlands' | 'akwa-ibom-borderlands';
  name: string;
  shortName: string;
  subtitle: string;
  note: string;
  stateName: string;
  stateCode: string;
  center: [number, number];
  zoom: number;
  lgas: ConstituentLga[];
  keyTowns: string[];
  dialect: string;
  dialectGreeting: string;
  historicalContext: string;
  waterwayContext: string;
  whySignificant: string;
  traditionalMarketsAndLandmarks?: string[];
}

export const BEYOND_SOUTHEAST_REGIONS: BeyondRegionData[] = [
  {
    id: 'delta-anioma',
    name: 'Delta · Anioma',
    shortName: 'Anioma',
    subtitle: 'Delta North · 9 Local Government Areas',
    note: 'Aniocha, Ika, Ndokwa, Oshimili & Ukwuani (9 LGAs)',
    stateName: 'Delta',
    stateCode: 'NG010',
    center: [6.45, 6.05],
    zoom: 8.4,
    lgas: [
      { code: 'NG010001', name: 'Aniocha North', state: 'Delta', stateCode: 'NG010', center: [6.48, 6.35] },
      { code: 'NG010002', name: 'Aniocha South', state: 'Delta', stateCode: 'NG010', center: [6.52, 6.18] },
      { code: 'NG010007', name: 'Ika North East', state: 'Delta', stateCode: 'NG010', center: [6.28, 6.33] },
      { code: 'NG010008', name: 'Ika South', state: 'Delta', stateCode: 'NG010', center: [6.19, 6.22] },
      { code: 'NG010011', name: 'Ndokwa East', state: 'Delta', stateCode: 'NG010', center: [6.61, 5.71] },
      { code: 'NG010012', name: 'Ndokwa West', state: 'Delta', stateCode: 'NG010', center: [6.41, 5.75] },
      { code: 'NG010014', name: 'Oshimili North', state: 'Delta', stateCode: 'NG010', center: [6.67, 6.32] },
      { code: 'NG010015', name: 'Oshimili South', state: 'Delta', stateCode: 'NG010', center: [6.72, 6.19] },
      { code: 'NG010021', name: 'Ukwuani', state: 'Delta', stateCode: 'NG010', center: [6.32, 5.82] },
    ],
    keyTowns: ['Asaba', 'Agbor', 'Ogwashi-Uku', 'Kwale', 'Ibusa', 'Issele-Uku', 'Obiaruku', 'Ashaka', 'Ubulu-Uku'],
    dialect: 'Enuani, Ika, and Ndokwa/Ukwuani dialects',
    dialectGreeting: 'Nnọọ / Kọdụ ka ị dị? / Agbalụ aka nwa',
    historicalContext:
      'Ancient settlements situated on the western bank of the River Niger. Historic cradle of the Ekumeku anti-colonial resistance movement (1883–1914), traditional Obi kingship institutions, and monarchies sharing deep genealogical and cultural ties with ancient Nri and ancestral migrations.',
    waterwayContext: 'River Niger west bank, Ase River, and Ethiope River headwaters.',
    whySignificant:
      'Home to millions of Western Igbo speakers forming the contiguous cultural continuum across Delta North.',
    traditionalMarketsAndLandmarks: [
      'Otuogba / Asaba Cable Point Beach & Fish Market (Eke Asaba)',
      'Ogwashi-Uku Eke Market (Ahia Eke Ogwashi)',
      'Issele-Uku Eke Market (Ahia Eke Issele)',
      'Orogodo Market (Agbor Central Market / Eke Agbor)',
      'Utagba-Ogbe (Kwale) Central Market (Afor Kwale)',
      'Aboh Historic River Niger Wharf & Market (Ahia Aboh)',
      'Eke Obiaruku Market (Ukwuani)',
      'Ashaka River Market (Ndokwa East)',
      'Palace of the Asagba of Asaba',
      'Asaba Memorial Park & October 1967 Mass Grave (Ogbeosowa)',
      'Obi of Issele-Uku Royal Palace (Umuezechima)',
      'Dein of Agbor Royal Palace',
      'Palace of the Obi of Aboh & 19th-Century Naval Cannon Site',
      'Ekumeku Guerrilla Resistance Headquarters & Memorial (Ogwashi-Uku)',
      'Lander Brothers Anchorage & Asaba Wharf',
    ],
  },
  {
    id: 'rivers-upland',
    name: 'Rivers · Igboid Mainland & Coastal Enclaves',
    shortName: 'Rivers Igboid',
    subtitle: 'Mainland, Orashi/Sombreiro Basins, Opobo & Bonny Coastal Enclaves · 12 LGAs',
    note: 'Ikwerre, Etche, Ogba, Ekpeye, Ndoni, Omumma, Oyigbo, Port Harcourt, Opobo & Bonny (12 LGAs)',
    stateName: 'Rivers',
    stateCode: 'NG033',
    center: [6.95, 4.80],
    zoom: 8.3,
    lgas: [
      { code: 'NG033013', name: 'Ikwerre', state: 'Rivers', stateCode: 'NG033', center: [6.88, 4.98] },
      { code: 'NG033011', name: 'Etche', state: 'Rivers', stateCode: 'NG033', center: [7.08, 5.03] },
      { code: 'NG033016', name: 'Ogba/Egbema/Ndoni', state: 'Rivers', stateCode: 'NG033', center: [6.65, 5.34] },
      { code: 'NG033021', name: 'Oyigbo', state: 'Rivers', stateCode: 'NG033', center: [7.15, 4.88] },
      { code: 'NG033019', name: 'Omumma', state: 'Rivers', stateCode: 'NG033', center: [7.18, 5.12] },
      { code: 'NG033010', name: 'Emohua', state: 'Rivers', stateCode: 'NG033', center: [6.86, 4.88] },
      { code: 'NG033015', name: 'Obia/Akpor', state: 'Rivers', stateCode: 'NG033', center: [6.98, 4.86] },
      { code: 'NG033022', name: 'Port-Harcourt', state: 'Rivers', stateCode: 'NG033', center: [7.02, 4.78] },
      { code: 'NG033002', name: 'Ahoada East', state: 'Rivers', stateCode: 'NG033', center: [6.65, 5.08] },
      { code: 'NG033003', name: 'Ahoada West', state: 'Rivers', stateCode: 'NG033', center: [6.48, 5.06] },
      { code: 'NG033020', name: 'Opobo/Nkoro', state: 'Rivers', stateCode: 'NG033', center: [7.54, 4.52] },
      { code: 'NG033007', name: 'Bonny', state: 'Rivers', stateCode: 'NG033', center: [7.17, 4.45] },
    ],
    keyTowns: ['Port Harcourt (Diobu/Rebisi)', 'Grand Bonny (Okoloma)', 'Omoku', 'Okehi', 'Oyigbo (Obigbo)', 'Ahoada', 'Opobo Town', 'Isiokpo', 'Finima', 'Ozuzu', 'Eberi'],
    dialect: 'Ikwerre, Etche, Ogba, Ekpeye, Ndoki, Opobo-Bonny coastal Igbo, and Ndoni varieties',
    dialectGreeting: 'Ndaani / Meka / Ibọlachi / Kpọkọma',
    historicalContext:
      'The vast Igboid continuum and coastal language-shift enclaves of Rivers State. Spans the ancient ancestral home of Amadioha Ozuzu in Etche, the sacred Oba throne of Ogbaland along the Orashi River, the autonomous Ikwerre clans with their Onye-Isi-Ali council of elders, the archaic Ekpeye linguistic branch, the Ndoki/Asa borders in Oyigbo, and the historical coastal trading kingdom enclaves of Opobo and Grand Bonny—where over 150 years of demographic integration, canoe house rule, and transatlantic commerce established Igbo as the prevailing mother tongue and court language.',
    waterwayContext: 'Bonny River estuary, Orashi River, Sombreiro River, Otamiri River, Imo River estuary, New Calabar River basin.',
    whySignificant:
      'Forms the dominant geographical landmass and population core of Rivers State, preserving vital archaic phonology, ancient market cycle rings, and historical trade treaties connecting the Atlantic littoral to the Igbo heartland.',
    traditionalMarketsAndLandmarks: [
      'Oil Mill Market (Afor / Eke Rumukwrusi)',
      'Rumuokoro Market (Eke Rumuokoro)',
      'Omoku Central Market (Ahia Omoku / Orie Omoku)',
      'Eke Okehi Market (Etche Central Market)',
      'Ahoada Central Market (Afor Ekpeye)',
      'Oyigbo (Obigbo) Central Market (Afor Afam)',
      'Opobo River Market & Historic Fish Beach',
      'King Jaja of Opobo Palace & Bronze Monument',
      'Oba of Ogbaland Imperial Palace & Ancestral Obiri (Omoku)',
      'Eze Ekpeye Logbo Palace & Council of Elders (Ahoada)',
      'Onye-Ishiala Ikwerre Ancestral Obiri (Isiokpo)',
      'Ochichi Sacred Grove & Shrine of Ali (Etche Earth Deity)',
      'Rebisi (Diobu) Ancestral Civic Hall & Sacred Grounds',
    ],
  },
  {
    id: 'edo-igbanke',
    name: 'Edo · Igbanke / borderlands',
    shortName: 'Igbanke / Edo',
    subtitle: 'Orhionmwon LGA · Eastern Edo Borderland',
    note: 'Orhionmwon LGA & Igbanke autonomous communities',
    stateName: 'Edo',
    stateCode: 'NG012',
    center: [6.15, 6.2],
    zoom: 9.6,
    lgas: [
      { code: 'NG012013', name: 'Orhionmwon', state: 'Edo', stateCode: 'NG012', center: [6.15, 6.2] },
    ],
    keyTowns: ['Igbanke (Oligie, Idumuodin, Ake, Ogbahu, Igbontor, Ottah)', 'Uteh-Okpu border', 'Ekpon borderlands'],
    dialect: 'Ika Igbo dialect cluster with historical Edo bilingualism',
    dialectGreeting: 'Nnọọ / Kọdụ ka ị mere?',
    historicalContext:
      'Historically part of the Western Region Benin Province, Igbanke comprises six historic clans that speak the Ika dialect of Igbo. Traditional title systems and monarchical institutions reflect enduring cultural synthesis with the Benin kingdom while preserving distinctive Igbo linguistic roots.',
    waterwayContext: 'Ossiomo River and Orhionmwon River basin.',
    whySignificant:
      'Crucial historic bridgehead linking Edo civilization with Western Igbo (Anioma) culture.',
    traditionalMarketsAndLandmarks: [
      'Oligie Central Market (Eke Oligie / Ahia Oligie)',
      'Ottah / Idumuodin Agricultural Market (Afor Igbanke)',
      'Enogie / Clan Palace of Oligie-Igbanke',
      'Igbanke Six Clan Ancestral Unity Hall & Shrine',
    ],
  },
  {
    id: 'kogi-ibaji',
    name: 'Kogi · Southern Borderlands & Lower Anambra Basin',
    shortName: 'Ibaji & Southern Kogi',
    subtitle: 'Ibaji & Igalamela-Odolu LGAs · Southern Kogi Contact Zone',
    note: 'Ibaji & Igalamela-Odolu LGAs (Southern boundary riverine & agrarian settlements)',
    stateName: 'Kogi',
    stateCode: 'NG023',
    center: [6.85, 6.9],
    zoom: 9.3,
    lgas: [
      { code: 'NG023006', name: 'Ibaji', state: 'Kogi', stateCode: 'NG023', center: [6.85, 6.9] },
      { code: 'NG023007', name: 'Igalamela-Odolu', state: 'Kogi', stateCode: 'NG023', center: [7.12, 6.98] },
    ],
    keyTowns: ['Onyedega', 'Odeke', 'Ihile', 'Unale', 'Ejule-Ojebe', 'Inozi', 'Odolu borderlands'],
    dialect: 'Waawa / Northern Riverine contact zone & Igala-Igbo bilingual continuum',
    dialectGreeting: 'Dee-wó / Nnọọ nwanne m',
    historicalContext:
      'Located along the southernmost tip of Kogi State on the fertile floodplains of the River Niger and Anambra (Omambala) basin. Southern riverine settlements in Ibaji and borderland communities in Igalamela-Odolu maintain centuries-old ancestral ties, bilingualism, intermarriage, and agricultural cooperation with Anambra West (Anam/Aguleri) and northern Enugu (Nsukka/Udenu/Uzo-Uwani).',
    waterwayContext: 'Anambra River (Omambala) and River Niger confluence floodplains.',
    whySignificant:
      'Historic riverine trading highway and agrarian bridge linking the Middle Belt with the Northern Igbo civilization basin.',
    traditionalMarketsAndLandmarks: [
      'Onyedega River Market (Eke Onyedega)',
      'Odeke / Ihile Agricultural Market (Afor Odeke)',
      'Omambala (Anambra River) Sacred Fishing Sanctuary',
      'Odolu Borderland Egwugwu/Mmanwu Sacred Enclosure',
    ],
  },
  {
    id: 'benue-borderlands',
    name: 'Benue · Southern Borderland Enclaves',
    shortName: 'Southern Benue Enclaves',
    subtitle: 'Ado, Obi, Oju & Okpokwu LGAs · Indigenous Ezza, Izzi & Effium Agrarian Corridors',
    note: 'Ado, Obi, Oju & Okpokwu LGAs (Indigenous Ezza, Izzi & Effium aboriginal borderland communities)',
    stateName: 'Benue',
    stateCode: 'NG007',
    center: [8.12, 6.90],
    zoom: 9.0,
    lgas: [
      { code: 'NG007001', name: 'Ado', state: 'Benue', stateCode: 'NG007', center: [8.02, 6.78] },
      { code: 'NG007014', name: 'Obi', state: 'Benue', stateCode: 'NG007', center: [8.26, 7.02] },
      { code: 'NG007017', name: 'Oju', state: 'Benue', stateCode: 'NG007', center: [8.38, 6.87] },
      { code: 'NG007018', name: 'Okpokwu', state: 'Benue', stateCode: 'NG007', center: [7.87, 7.04] },
    ],
    keyTowns: [
      // Ado LGA Villages & Districts
      'Inikiri (Inikiri Izzi / Inikiri Ichari)',
      'Okputu',
      'Amaeke (Ado)',
      'Ojiegbe',
      'Odun',
      'Echeri',
      'One',
      'Odoke',
      'Ameulla',
      'Obusirike',
      'Eri',
      'Epkekere',
      'Ndi Gbaraoso',
      'Odi',
      'Opkoricho',
      'Umuezeokaoha',
      'Amaezekwe',
      'Oriuzor',
      'Ulayi',
      'Ijigbam',
      'Agila',
      'Ekile',
      'Utonkon',
      'Igumale',
      // Oju LGA Villages
      'Ndiighe (Ndigwe)',
      'Edele (Idelle)',
      'Ogbala Izzi',
      'Onyenu',
      'Obokata',
      'Ekpuphu',
      'Idele Izzi',
      'Ndi Nwankwo',
      'Osidi',
      'Usebe',
      'Eka',
      'Ikari',
      'Amaeka (Oju)',
      'Edear',
      'Umuezeoka Ugo',
      'Umuoghara',
      // Okpokwu LGA Wards & Enclaves
      'Ichama I',
      'Ichama II',
      'Okponga (West, Central, North, South)',
      'Ingle-Okpale',
      // Obi LGA Core Settlements
      'Amaeke (Amaekka)',
      'Obi-Ukwute',
      'Adum-Ogbo',
    ],
    dialect: 'Northeastern Igbo (Ezza, Izzi, Effium, Ngbo) & Idoma/Igede bilingual contact continuum',
    dialectGreeting: 'Dee-wó / Ekele nwa m',
    historicalContext:
      'Aboriginal & Indigenous Status: The Igbo populations of southern Benue (Ado, Obi, Oju, and Okpokwu LGAs) are indigenous and aboriginal peoples from the Ezza (predominantly), Izzi, and Effium clans. During Nigerian state creation exercises, parts of contiguous Igbo land carved out of what is now Ebonyi State were added to Benue State. These communities are not visitors or assimilated Idoma or Igede, but aboriginal indigenous people of the land. In Ado LGA (subdivided into the districts of Agila, Ulayi, Ijigbam, Ekile, Utonkon, and Igumale), while predominantly Idoma, a very high concentration of Igbo communities exists—civic leadership includes Hon. Mrs. Perpetual Nkechi Okafor from the Ezza subgroup serving as Secretary of Ado LGA. Villages in Ado include Inikiri, Okputu, Amaeke, Ojiegbe, Odun, Echeri, One, Odoke, Ameulla, Obusirike, Eri, Epkekere, Ndi Gbaraoso, Odi, Opkoricho, Umuezeokaoha, Amaezekwe, and Oriuzor (who trace precolonial migrations from Nri). In Oju LGA, predominantly Igede, a dense network of Igbo communities thrives, including Ndiighe, Edele (Idelle), Ogbala Izzi, Onyenu, Obokata, Ekpuphu, Idele Izzi, Ndi Nwankwo, Osidi, Usebe, Eka, Ikari, Amaeka, Edear, Umuezeoka Ugo, and Umuoghara. In Okpokwu LGA, predominantly Idoma, indigenous Igbo farming enclaves exist across its 12 wards (Ameju, Eke, Ichama I, Ichama II, Ingle-Okpale, Ojigo, Okonobo, Okponga West, Okponga Central, Okponga North, Okponga South, and Ugbokolo), particularly in Ichama and Okponga contiguous with northern Enugu. In Obi LGA, the core ancestral enclave of Amaeke (Amaekka) and border pockets in Obi-Ukwute and Adum-Ogbo maintain unbroken Ezza kinship. Documented extensively in British colonial boundary delimitation files (NAK BenProf 2/1, 1910–1925), Idoma Division Intelligence Reports (Capt. G.D.C. Money, 1936), and ethnographic surveys (Prof. R.G. Armstrong, 1955).',
    waterwayContext: 'Okpokwu River and Ado River basins.',
    whySignificant:
      'Four local government areas (Ado, Obi, Oju, Okpokwu) with aboriginal, indigenous Ezza, Izzi, and Effium populations carved into Benue State by state creation and colonial boundaries.',
    traditionalMarketsAndLandmarks: [
      'Inikiri Ichari Central Market (Afor Inikiri)',
      'Umuezeoka Ugo / Idelle Market (Eke Idelle)',
      'Amaeke (Amaekka) Ancestral Market (Orie Amaeke)',
      'Ichama Borderland Market (Afor Ichama)',
      'Ulayi Frontier Agricultural Exchange (Nkwo Ulayi)',
      'Okpoku Ezekuna Ancestral Shrine & Ofo Council Grounds (Amaeke)',
      'Inikiri Traditional Assembly & Guild Grounds (Ado)',
      'Idelle Ezza-Izzi Cultural Grounds & New Yam Arena (Oju)',
    ],
  },
  {
    id: 'akwa-ibom-borderlands',
    name: 'Akwa Ibom · Borderland Contact Zones & Aro Trade Enclaves',
    shortName: 'Akwa Ibom Borderlands & Enclaves',
    subtitle: 'Ika, Ini, Itu & Oruk Anam LGAs · Historical Diaspora Quarters & Trade Corridors',
    note: 'Sovereignty Clarification: Akwa Ibom is the ancestral homeland of the Annang, Ibibio, and Oron peoples. This atlas does NOT claim Annang/Ibibio lands as Igbo territory. It documents specific precolonial Aro merchant quarters and bilateral boundary trade alliances.',
    stateName: 'Akwa Ibom',
    stateCode: 'NG003',
    center: [7.65, 5.15],
    zoom: 8.8,
    lgas: [
      { code: 'NG003011', name: 'Ika', state: 'Akwa Ibom', stateCode: 'NG003', center: [7.54, 5.02] },
      { code: 'NG003015', name: 'Ini', state: 'Akwa Ibom', stateCode: 'NG003', center: [7.75, 5.42] },
      { code: 'NG003016', name: 'Itu', state: 'Akwa Ibom', stateCode: 'NG003', center: [7.98, 5.20] },
      { code: 'NG003026', name: 'Oruk Anam', state: 'Akwa Ibom', stateCode: 'NG003', center: [7.63, 4.75] },
    ],
    keyTowns: ['Urua Inyang', 'Amuvi (Ini)', 'Odoro Ikpe', 'Itu Port', 'Ekparakwa', 'Achan Ika'],
    dialect: 'Lower Cross River (Annang/Ibibio) with borderland bilingualism & Aro diaspora Igbo lexicon',
    dialectGreeting: 'Abadie (Annang/Ibibio) / Ndewo (Igbo)',
    historicalContext:
      'Historical Narrative & Mutual Respect: During the 18th and 19th centuries, the Aro Confederacy negotiated peaceful commercial charters with indigenous Annang, Ikpe, and Efik rulers to establish trading quarters along the Enyong Creek and Cross River waterways (at Itu and Amuvi Ini). Concurrently, in Ika and Oruk Anam, indigenous Annang lineages maintained bilateral trade pacts, shared 4-day market calendars (Eke, Orie, Afor, Nkwo), and cross-border intermarriages with neighboring Ngwa and Asa communities. These entries celebrate centuries of peaceful inter-ethnic diplomacy, trade reciprocity, and cultural exchange without infringing upon the distinct territorial and linguistic sovereignty of our Annang and Ibibio neighbors.',
    waterwayContext: 'Enyong Creek & Cross River Confluence, Lower Imo River Basin.',
    whySignificant:
      'Exemplifies precolonial inter-ethnic diplomacy and trade alliances where Igbo merchant guilds and sovereign Cross River hosts coexisted and prospered through mutual pacts.',
    traditionalMarketsAndLandmarks: [
      'Itu Historic Aro Trading Beach & Wharf Market (Enyong Creek)',
      'Ekparakwa Crossroads Market',
      'Urua Inyang Central Border Market',
      'Itu Enyong Creek Historic Wharves & Aro Treaty Site',
      'Mary Slessor Historic Memorial & Cairn at Itu',
      'Aro Amuvi & Odoro Ikpe Ancestral Settlement Memorial',
    ],
  },
];

export const NIGERIA_BOUNDS: [number, number, number, number] = [2.67, 4.27, 14.68, 13.89];

