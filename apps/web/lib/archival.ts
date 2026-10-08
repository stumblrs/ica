/**
 * Precolonial, Colonial Intelligence Reports, and Pre-Civil War Archival Documentation Corpus
 * Focused on South-South (Delta, Rivers, Edo), North-Central (Kogi, Benue), and Igbo Borderlands.
 */

export interface ArchivalDocument {
  id: string;
  title: string;
  shortTitle: string;
  authorOrOfficer: string;
  author?: string;
  year: number | string;
  era: 'ancient' | 'precolonial' | 'early_colonial' | 'resistance' | 'intelligence_report' | 'boundary_decree' | 'pre_civil_war';
  category:
    | 'Colonial Intelligence Report'
    | 'Precolonial Narrative & Treaty'
    | 'Boundary Demarcation Report'
    | 'Ethnographic Survey'
    | 'Anti-Colonial Resistance'
    | 'Colonial Boundary Decree'
    | 'Aro Trade & Judicial Corridor'
    | 'Pre-1967 Population Census'
    | 'Archaeological Excavation'
    | 'Sacred Shrines & Confluences'
    | 'Anti-Tax Revolt (Women’s War)'
    | 'Traditional Governance & Title System'
    | 'Willink Minorities Commission (1958)'
    | 'Aro Military Expedition (1901–1902)'
    | 'Interstate Boundary Demarcation (1976)';
  documentType?: string;
  archiveRepository: string;
  fileReference: string;
  archiveReference?: string;
  targetRegionId:
    | 'delta-anioma'
    | 'rivers-upland'
    | 'edo-igbanke'
    | 'kogi-ibaji'
    | 'benue-borderlands'
    | 'akwa-ibom-borderlands'
    | 'crossriver-borderlands'
    | 'southeast-homeland'
    | 'general';
  states: string[];
  lgas?: string[];
  settlements?: string[];
  territoriesCovered?: string[];
  summary: string;
  significance?: string;
  keyFindings: string[];
  digitalUrl?: string;
  coordinates?: [number, number];
}

export const ARCHIVAL_DOCUMENTS: ArchivalDocument[] = [
  // ── DELTA STATE / WESTERN IGBO (ANIOMA) ──
  {
    id: 'doc-asaba-div-1936',
    title: 'Intelligence Report on the Asaba Clan, Asaba Division, Benin Province',
    shortTitle: 'Asaba Clan Intelligence Report',
    authorOrOfficer: 'P.V. Main (Assistant District Officer)',
    year: 1936,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI) / CSO 26/4',
    fileReference: 'CSO 26/4 File No. 30927 / Asaba Div 8/1',
    targetRegionId: 'delta-anioma',
    states: ['Delta'],
    lgas: ['NG010014', 'NG010015'], // Oshimili North, Oshimili South
    settlements: ['Asaba', 'Ibusa (Igbuzo)', 'Oko', 'Illah', 'Ebu'],
    summary:
      'Detailed ethnographic and administrative investigation into the Asaba clan native administration. Analyzes the Asagba of Asaba kingship, council of elders (Olinzele title society), Oturaza council, and ancestral kinship links across the River Niger with Onitsha and the Nri kingdom.',
    keyFindings: [
      'Documented traditional dual title and age-grade governance systems (Otu-Akokwue and Otu-Onotu warriors).',
      'Confirmed linguistic, ritual, and market links with Onitsha and eastern mainland Igbo polities prior to colonial intervention.',
      'Codified customary land tenure along the western banks and floodplains of the River Niger.',
    ],
  },
  {
    id: 'doc-agbor-mbiri-1935',
    title: 'Intelligence Report on the Agbor Clan and Mbiri Sub-Clan of the Agbor Division',
    shortTitle: 'Agbor & Mbiri Intelligence Report',
    authorOrOfficer: 'J.M. Simpson (Assistant District Officer)',
    year: 1935,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI) / CSO 26',
    fileReference: 'CSO 26 File No. 30955 / Agbor Div 4/2',
    targetRegionId: 'delta-anioma',
    states: ['Delta'],
    lgas: ['NG010007', 'NG010008'], // Ika North East, Ika South
    settlements: ['Agbor', 'Mbiri', 'Owa-Oyibu', 'Umunede', 'Abavo', 'Igbodo'],
    summary:
      'Official colonial survey detailing the monarchical institution of the Dein of Agbor and the Owa kingdom. Assesses the linguistic status of the Ika dialect of Igbo, relations with Benin kingdom title systems, and the preservation of indigenous legal covenants.',
    keyFindings: [
      'Identified the indigenous Ika language as an archaic, highly conservative Western Igbo dialect.',
      'Traced royal dynastic traditions balancing Obi/Dein sovereignty alongside age-grade judicial councils.',
      'Established market and marriage alliances tying Ika communities to both Edo frontier and Anambra basin.',
    ],
  },
  {
    id: 'doc-kwale-ndokwa-1933',
    title: 'Intelligence Report on the Kwale, Ndokwa, and Ukwuani Clans of the Kwale Division',
    shortTitle: 'Kwale & Ukwuani Intelligence Report',
    authorOrOfficer: 'H.F. Marshall (Assistant District Officer)',
    year: 1933,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI)',
    fileReference: 'CSO 26/3 File No. 26803 / Kwale Div 2/1',
    targetRegionId: 'delta-anioma',
    states: ['Delta'],
    lgas: ['NG010011', 'NG010012', 'NG010021'], // Ndokwa East, Ndokwa West, Ukwuani
    settlements: ['Kwale (Utagba-Ogbe)', 'Obiaruku', 'Ashaka', 'Aboh', 'Ossissa', 'Abbi'],
    summary:
      'Colonial administrative examination of the Ndokwa and Ukwuani clans and the historic kingdom of Aboh. Records oral traditions regarding Obi Ossai of Aboh, naval command of the lower River Niger, and matrilineal and title hierarchies.',
    keyFindings: [
      'Documented Aboh Kingdom as the precolonial maritime and commercial linchpin of the lower Niger.',
      'Detailed Ukwuani village autonomy under Okpala-Uku (oldest living male elder) council structure.',
      'Recorded dialect continuums transitioning between Central Igbo, Urhobo borderlands, and Isoko waterways.',
    ],
  },
  {
    id: 'doc-ogwashi-uku-1936',
    title: 'Intelligence Report on the Ogwashi-Uku and Akwukwu-Atuma Village Groups of Asaba Division',
    shortTitle: 'Ogwashi-Uku & Akwukwu-Atuma Report',
    authorOrOfficer: 'H.C.B. Denton (District Officer)',
    year: 1936,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI)',
    fileReference: 'Asaba Div 8/1 / CSO 26/4 File 31210',
    targetRegionId: 'delta-anioma',
    states: ['Delta'],
    lgas: ['NG010001', 'NG010002'], // Aniocha North, Aniocha South
    settlements: ['Ogwashi-Uku', 'Issele-Uku', 'Ubulu-Uku', 'Akwukwu-Atuma', 'Onicha-Olona'],
    summary:
      'In-depth study on the Umuezechima clans and Aniocha kingdoms following the Ekumeku anti-colonial uprising (1883–1914). Chronicles kingship charters, forest sanctuaries, and legal customary assemblies.',
    keyFindings: [
      'Documented the lasting impact of the Ekumeku guerrilla resistance against the Royal Niger Company and British rule.',
      'Traced genealogical migration arcs connecting Issele-Uku, Onicha-Ugbo, and Obior directly to Chima from the western frontier.',
      'Confirmed traditional title installations under the Obi and Iyase institutions.',
    ],
  },

  // ── RIVERS STATE / SOUTHERN FRINGE (IKWERRE, ETCHE, OGBA, EKPEYE) ──
  {
    id: 'doc-obia-ikwerre-1931',
    title: 'Intelligence Report on the Obia (Obio) Clan, Ikwerre Tribe, Ahoada Division, Owerri Province',
    shortTitle: 'Obio-Ikwerre Intelligence Report',
    authorOrOfficer: 'P.E.M. Renison (District Officer, later Colonial Administrator)',
    year: 1931,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'Ahoada Div 10/1/22 / File OW 1750',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033013', 'NG033015', 'NG033010'], // Ikwerre, Obio/Akpor, Emohua
    settlements: ['Rumuokoro', 'Rebisi (Diobu/Port Harcourt)', 'Choba', 'Alakahia', 'Rumuekpe'],
    summary:
      'Benchmark administrative survey of the Ikwerre (Obia/Obio) clans inhabiting the northern ridges of the Port Harcourt plains. Documents ancestral lineages, family shrines (Ojukwu Diobu), traditional land tenure (Ali/Ala veneration), and linguistic classification within the Igboid subfamily.',
    keyFindings: [
      'Classified the Ikwerre dialect group as an indigenous northern riverine component of the broader Igbo language family.',
      'Documented the autonomous village confederation (Nye-nwe-ali land priest and council of elders).',
      'Frequently submitted as authoritative historical evidence in Nigerian Supreme Court chieftaincy and land boundary cases.',
    ],
  },
  {
    id: 'doc-emohua-ikwerre-1932',
    title: 'Intelligence Report on the Emohua Clan of the Ikwerre Tribe, Ahoada Division',
    shortTitle: 'Emohua Clan Intelligence Report',
    authorOrOfficer: 'E.R. Chadwick (Assistant District Officer)',
    year: 1932,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'NAE Ahodist 10/1/24 / File OW 2104',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033010', 'NG033013'], // Emohua, Ikwerre
    settlements: ['Emohua', 'Rumuji', 'Rumuche', 'Ogbakiri', 'Elele-Alimini'],
    summary:
      'Detailed inquiry into western Ikwerre social structure along the Sombreiro and New Calabar river basins. Records traditional trade routes with Kalabari salt traders, title systems, and customary land boundary treaties.',
    keyFindings: [
      'Established common origin lineages connecting Emohua, Ogbakiri, and central Ikwerre communities.',
      'Recorded economic symbiosis between hinterland Igbo agrarian farmers and coastal mangrove fishermen.',
      'Confirmed the supremacy of the Ali ancestral earth divinity in customary adjudication.',
    ],
  },
  {
    id: 'doc-ogba-clan-1930',
    title: 'Intelligence Report on the Ogba Clan of the Ahoada Division, Owerri Province',
    shortTitle: 'Ogba Clan Intelligence Report',
    authorOrOfficer: 'W.H. Dickinson (Assistant District Officer)',
    year: 1930,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'Ahoada Div 14/1/18 / File OW 1432',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033016'], // Ogba/Egbema/Ndoni
    settlements: ['Omoku', 'Obrikom', 'Egi', 'Egbema', 'Ndoni', 'Usomini'],
    summary:
      'Archival report detailing the monarchical and clan organization of the Ogba kingdom centered around Omoku. Evaluates the Oba of Ogbaland stool, ancestral migration traditions along the Orashi River, and connections to Ndoni and western delta settlements.',
    keyFindings: [
      'Recorded oral accounts of migration from the lower Niger waterways and ancestral ties with the kingdom of Aboh.',
      'Codified the authority of the Oba of Ogbaland and council of chiefs in local dispute resolution.',
      'Documented the linguistic status of Ogba and Egbema as closely related Igboid varieties with distinct localized vocabulary.',
    ],
  },
  {
    id: 'doc-etche-clan-1932',
    title: 'Intelligence Report on the Etche Clan of the Owerri and Ahoada Divisions',
    shortTitle: 'Etche Clan Intelligence Report',
    authorOrOfficer: 'J.G.C. Allen (Assistant District Officer)',
    year: 1932,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'CSE 1/85/4785 / File OwerriProf 7/1',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033011', 'NG033019', 'NG033021'], // Etche, Omumma, Oyigbo
    settlements: ['Okehi', 'Afara', 'Ulakwo', 'Eberi-Omumma', 'Akporu', 'Ndashi'],
    summary:
      'Comprehensive administrative account of the Etche and Omumma clans spanning the fertile plains between the Otamiri and Imo rivers. Explores age grades, agricultural festivals, and uninterrupted linguistic continuum with Ngwa and southern Imo.',
    keyFindings: [
      'Documented seamless dialect and matrimonial continuum connecting Etche with Ngwa (Abia) and Owerri (Imo).',
      'Recorded traditional council assemblies (Onye-Isi-Ali and elders) governing land distribution and peace treaties.',
      'Identified traditional riverine shrines and market rings cycling across the four Igbo market days.',
    ],
  },
  {
    id: 'doc-ekpeye-clan-1934',
    title: 'Intelligence Report on the Ekpeye Tribe of the Ahoada Division',
    shortTitle: 'Ekpeye Tribe Intelligence Report',
    authorOrOfficer: 'E.R. Chadwick (Assistant District Officer)',
    year: 1934,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'NAE OW 3421 / Ahoada Div 12/1/15',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033002', 'NG033003'], // Ahoada East, Ahoada West
    settlements: ['Ahoada', 'Umoda', 'Odiereke', 'Ihuaba', 'Upata', 'Akoh'],
    summary:
      'Colonial ethnographic investigation into the Ekpeye people of the upper Orashi and Sombreiro floodplains. Examines the Eze Ekpeye institution, warrior societies, and linguistic kinship within the Igboid branch.',
    keyFindings: [
      'Traced genealogical traditions linking Ekpeye and Ogba to common ancestral patriarchs.',
      'Recorded extensive religious shrines and sacred water covenants connected with the Orashi River system.',
      'Documented traditional council of elders maintaining judicial neutrality during regional conflicts.',
    ],
  },
  {
    id: 'doc-opobo-kingdom-1873-1930',
    title: 'Intelligence Report & Political Treaties on the Opobo Division (King Jaja Dynasty & Imo River Estuary)',
    shortTitle: 'Opobo Kingdom Intelligence Report & Treaties',
    authorOrOfficer: 'Acting Consul Harry Johnston & District Officer E.N. Mylius',
    year: '1873–1935',
    era: 'early_colonial',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE) / UK Kew Foreign Office',
    fileReference: 'NAE Opodist 1/1/1 & Kew FO 84/1862 (King Jaja Treaty & Despatches)',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033020'], // Opobo/Nkoro
    settlements: ['Opobo Town', 'Queens Town', 'Kalibiama', 'Ereke', 'Iloma'],
    summary:
      'Official diplomatic and colonial despatches detailing the sovereign foundation of the Opobo Kingdom in 1869–1870 by King Jaja of Amaigbo. Documents the establishment of Igbo as the undisputed court, marketplace, and domestic language of Opobo, and records commercial treaties regulating the palm oil trade with Ndoki, Ngwa, and Annang inland producers.',
    keyFindings: [
      'Documented the exclusive usage of the Igbo language across the 14 founding royal chieftaincy houses of Opobo Town.',
      'Recorded British Foreign Office formal recognition treaties (1873) recognizing King Jaja as independent monarch of the Opobo coastline.',
      'Detailed ancestral lineage connections linking Opobo families directly with Amaigbo (Imo State) and the interior Igbo palm oil production belt.',
    ],
    digitalUrl: 'https://discovery.nationalarchives.gov.uk/details/r/C1704253',
  },
  {
    id: 'doc-ndoki-asa-oyigbo-1933',
    title: 'Intelligence Report on the Ndoki Clan of the Aba and Opobo Divisions (Oyigbo/Obigbo Axis)',
    shortTitle: 'Ndoki Clan (Oyigbo) Intelligence Report',
    authorOrOfficer: 'C.T.C. Ennals (Assistant District Officer)',
    year: 1933,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'NAE CSE 1/85/5122 / File Aba Div 20/1/4',
    targetRegionId: 'rivers-upland',
    states: ['Rivers', 'Abia'],
    lgas: ['NG033021'], // Oyigbo
    settlements: ['Oyigbo (Obigbo)', 'Komkom', 'Afam', 'Umuagbai', 'Mirinwanyi', 'Obeakpu'],
    summary:
      'Colonial administrative survey of the Ndoki clan inhabiting the lower Imo River plains bordering southern Abia and Rivers State. Examines the Ofo judicial institutions, palm oil river ports, and uninterrupted Southern Igbo dialect continuum.',
    keyFindings: [
      'Confirmed the identical linguistic, religious, and kinship identity of the Ndoki of Oyigbo with those of Ukwa (Abia State).',
      'Documented ancient river toll covenants and trading stations established along the Imo River.',
      'Outlined land tenure governed by lineage heads (Okpara) and sacred ancestral shrines.',
    ],
  },
  {
    id: 'doc-port-harcourt-diobu-rebisi-1913',
    title: 'Acquisition of Land for Port Harcourt Township and the Rebisi (Diobu-Ikwerre) Customary Covenants',
    shortTitle: 'Port Harcourt (Diobu-Rebisi) Crown Land Agreement',
    authorOrOfficer: 'Sir Frederick Lugard (Governor-General) & Hargrove (Provincial Commissioner)',
    year: 1913,
    era: 'early_colonial',
    category: 'Boundary Demarcation Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE) & Ibadan (NAI)',
    fileReference: 'NAE Calprof 14/8/12 & Nigeria Gazette No. 28 of 1913',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033022', 'NG033015'], // Port-Harcourt, Obio/Akpor
    settlements: ['Diobu', 'Rebisi', 'Oroworukwo', 'Ogbunabali', 'Rumueme', 'Rumuomasi'],
    summary:
      'Official colonial agreements and gazetted expropriation documents establishing Port Harcourt port terminus on the ancestral farmland of the Rebisi (Diobu) Ikwerre communities. Details the customary boundaries, compensation claims, and indigenous shrine sacred groves preserved under colonial survey.',
    keyFindings: [
      'Documented the primary ancestral ownership of the Port Harcourt township land by the Diobu (Rebisi) Ikwerre clans.',
      'Preserved survey maps of traditional hunting corridors, fishing creeks, and farmland boundaries.',
      'Codified the customary status of Rebisi village elders in treaty negotiations with the British Southern Nigeria Administration.',
    ],
  },
  {
    id: 'doc-grand-bonny-language-shift-1854',
    title: 'Historical & Linguistic Survey of Grand Bonny (Okoloma): Language Shift, House Rule, and Inland Trade',
    shortTitle: 'Grand Bonny Language Shift & House Rule Survey',
    authorOrOfficer: 'Dr. W.B. Baikie, Capt. Hugh Crow & Bishop Samuel Ajayi Crowther (CMS Archives)',
    year: '1807–1882',
    era: 'early_colonial',
    category: 'Ethnographic Survey',
    archiveRepository: 'Church Missionary Society (CMS) Archives, London / UK Kew Foreign Office',
    fileReference: 'CMS CA3/O4 & Kew FO 84/1343 (Bonny Consular Despatches)',
    targetRegionId: 'rivers-upland',
    states: ['Rivers'],
    lgas: ['NG033007'], // Bonny
    settlements: ['Grand Bonny (Okoloma)', 'Finima', 'Peterside', 'Oloma'],
    summary:
      'Multi-source historical documentation of the societal language shift in Grand Bonny. Records eyewitness observations from 1807 to 1882 noting that while the ancient ruling dynasty traced early roots to Ibani, the overwhelming demographic majority, domestic households, chieftaincy councils, and street commerce operated in Igbo, necessitating CMS Bible and liturgical translations directly into Igbo for the Bonny population.',
    keyFindings: [
      'Documented Captain Hugh Crow’s early accounts (1807) noting that the everyday inhabitants and traders of Bonny were of Igbo lineage and spoke the Igbo language.',
      'Confirmed Dr. William Balfour Baikie’s 1854 expedition findings that Igbo had superseded Ibani across all classes of Bonny society.',
      'Detailed the rise of Igbo-born statesmen (including King Jaja and Chief Oko Jumbo) commanding the wealthiest canoe houses and war fleets in Grand Bonny.',
    ],
    digitalUrl: 'https://archive.org/details/narrativeanexpe00oldfgoog',
  },

  // ── EDO STATE BORDERLANDS (IGBANKE / BENIN DIVISION) ──
  {
    id: 'doc-benin-ika-1936',
    title: 'Political Intelligence Report on the Benin Division and Ika/Igbanke Borderlands',
    shortTitle: 'Benin Division & Igbanke Borderlands Report',
    authorOrOfficer: 'M.B.E. Macrae Simpson (District Officer)',
    year: 1936,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI)',
    fileReference: 'NAI BP 142/36 / Benin Province Annual Files',
    targetRegionId: 'edo-igbanke',
    states: ['Edo', 'Delta'],
    lgas: ['NG012013'], // Orhionmwon
    settlements: ['Igbanke (Oligie, Idumuodin, Ake, Ogbahu, Igbontor, Ottah)', 'Ekpon', 'Uteh-Okpu Border'],
    summary:
      'Official colonial review of the eastern boundary of the Benin Division adjoining Asaba and Agbor. Details the autonomous Igbanke (originally Igbo-Akiri) communities who speak the Ika dialect of Igbo while integrated administratively within Benin Province.',
    keyFindings: [
      'Confirmed the six historic clans of Igbanke as ethnically and linguistically Ika Igbo.',
      'Detailed the administrative compromises under the British Native Authority blending the Enogie title with traditional Obi/elder councils.',
      'Documented historical bilingualism and continuous commercial interchange across the Ossiomo River basin.',
    ],
  },

  // ── KOGI STATE / NORTH-CENTRAL BORDERLANDS (IBAJI & LOWER ANAMBRA) ──
  {
    id: 'doc-ibaji-district-1934',
    title: 'Intelligence Report on the Ibaji District, Igala Division, Kabba Province',
    shortTitle: 'Ibaji District Intelligence Report',
    authorOrOfficer: 'P.F. Brandt (Assistant District Officer)',
    year: 1934,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Kaduna (NAK)',
    fileReference: 'NAK SNP 17/K.2441 / Kabba Province Records',
    targetRegionId: 'kogi-ibaji',
    states: ['Kogi'],
    lgas: ['NG023006'], // Ibaji
    settlements: ['Onyedega', 'Odeke', 'Ihile', 'Unale', 'Ejule-Ojebe', 'Inozi'],
    summary:
      'Historic survey of the southernmost district of Kabba Province situated in the floodplain confluence of the Niger and Anambra rivers. Details the dense demographic mosaic of Igbo-speaking riverine settlements intermixed with Igala communities.',
    keyFindings: [
      'Documented communities throughout southern Ibaji as native speakers of the northern (Waawa/Anam) Igbo dialect continuum.',
      'Identified traditional title oaths, masquerade arts (Egwugwu/Mmanwu), and marriage alliances with Anambra West and Uzo-Uwani LGAs.',
      'Noted colonial administrative boundary anomalies where contiguous Igbo clans were placed under northern Native Authorities in Kaduna/Lokoja.',
    ],
  },

  // ── BENUE STATE BORDERLANDS (ADOO, OJU, EZZA-EFFIUM FARMLANDS) ──
  {
    id: 'doc-benue-ezza-1936',
    title: 'Intelligence Report on the Ezza, Effium, and Umuezeokoha Settlements in the Southern Benue & Idoma Division Borderlands',
    shortTitle: 'Benue-Idoma Igbo Borderlands Report',
    authorOrOfficer: 'Captain G.D.C. Money (District Officer, Idoma Division)',
    year: 1936,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Kaduna (NAK)',
    fileReference: 'NAK SNP 17/28905 / BenueProf 1024/Vol. II',
    targetRegionId: 'benue-borderlands',
    states: ['Benue', 'Ebonyi'],
    lgas: ['NG007001', 'NG007014', 'NG007017', 'NG007018'], // Ado, Obi, Oju, Okpokwu
    settlements: ['Igumale border', 'Agila district', 'Ulayi', 'Ijigbam', 'Ekile', 'Utonkon', 'Inikiri', 'Okputu', 'Effium enclave', 'Ichama', 'Okponga'],
    summary:
      'Government memorandum reviewing agricultural expansion, permanent farming colonies, and settlements of Ezza, Izzi, and Ngbo Igbo farmers extending northward from Abakaliki into southern Benue Province (Ado and Agila territories).',
    keyFindings: [
      'Recorded centuries-old agrarian agreements and mutual market pacts between Idoma chiefs and Igbo agricultural pioneers.',
      'Documented bilingual borderland settlements maintaining allegiance to traditional ancestral shrines in Abakaliki while paying tax in Otukpo.',
      'Noted customary disputes over land boundaries delineated arbitrarily by British provincial boundary commissions.',
    ],
  },

  // ── HISTORIC PRECOLONIAL & PRE-CIVIL WAR CONSTITUTIONAL INQUIRIES ──
  {
    id: 'doc-willink-minorities-1958',
    title: 'Report of the Commission Appointed to Enquire into the Fears of Minorities and the Creation of Other States (Willink Commission)',
    shortTitle: 'Willink Minorities Commission Report (1958)',
    authorOrOfficer: 'Sir Henry Willink (Chairman), Sir Gordon Hadow, Philip Mason, J.B. Shearer',
    year: 1958,
    era: 'pre_civil_war',
    category: 'Willink Minorities Commission (1958)',
    archiveRepository: 'Her Majesty’s Stationery Office (London) / Colonial Office Cmd. 505 / National Archives UK (Kew CO 554/1562)',
    fileReference: 'Command Paper 505 / Colonial Office London',
    targetRegionId: 'general',
    states: ['Delta', 'Rivers', 'Edo', 'Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo', 'Cross River', 'Akwa Ibom', 'Kogi', 'Benue'],
    summary:
      'The definitive constitutional inquiry on the eve of Nigerian Independence (1958). Examines petitions and ethnographic oral representations regarding minority fears across all three regions. Features detailed chapters on the Western Ibo in Benin/Delta provinces and the riverine and upland clans of the Eastern Region.',
    keyFindings: [
      'Chapter 4 recorded the demands for a separate Rivers State and examined the linguistic and demographic affinities of Ikwerre, Etche, and Ogba communities.',
      'Chapter 5 evaluated Western Ibo (Asaba/Agbor/Kwale) representations in the proposed Mid-Western Region and their historic bonds with the Eastern Region.',
      'Proposed the establishment of the Niger Delta Special Area (NDDB) to address unique ecological and infrastructural neglect.',
      'Recommended fundamental human rights provisions rather than hasty state fragmentation on the eve of independence in 1960.',
    ],
    digitalUrl: 'https://archive.org/details/reportofcommissi00grea',
  },
  {
    id: 'doc-equiano-narrative-1789',
    title: 'The Interesting Narrative of the Life of Olaudah Equiano, or Gustavus Vassa, the African',
    shortTitle: 'Olaudah Equiano Precolonial Narrative',
    authorOrOfficer: 'Olaudah Equiano (Born in Essaka/Isseke)',
    year: 1789,
    era: 'precolonial',
    category: 'Precolonial Narrative & Treaty',
    archiveRepository: 'British Library, London / Printed in London for the Author',
    fileReference: 'BL 10880.bb.22 / Eighteenth-Century Collections',
    targetRegionId: 'southeast-homeland',
    states: ['Anambra', 'Imo'],
    settlements: ['Isseke (Ihiala / Orlu border)', 'Essaka'],
    summary:
      'The earliest known published autobiographical record written by an Igbo person. Provides an eyewitness 18th-century account of precolonial Igbo village governance, judicial proceedings, marriage ceremonies, agricultural calendar (yam festivals), and music before transatlantic abduction.',
    keyFindings: [
      'Documented traditional rule by titled elders (Embrenché / Ichi titleholders) acting as magistrates and arbiters.',
      'Recorded indigenous musical instruments (Ekwe, Ogene, Ubo) and elaborate textile weaving.',
      'Remains an indispensable foundational primary source for 18th-century West African social history.',
    ],
    digitalUrl: 'https://www.gutenberg.org/ebooks/15399',
  },
  {
    id: 'doc-laird-oldfield-1837',
    title: 'Narrative of an Expedition into the Interior of Africa, by the River Niger, in the Steam-Vessels Quorra and Alburkah, in 1832, 1833, and 1834',
    shortTitle: 'Laird & Oldfield Niger Expedition (1837)',
    authorOrOfficer: 'Macgregor Laird and R.A.K. Oldfield',
    year: 1837,
    era: 'precolonial',
    category: 'Precolonial Narrative & Treaty',
    archiveRepository: 'Richard Bentley (London) / Royal Geographical Society Library',
    fileReference: 'RGS Lib. 1837.L14 / British Library 1047.g.14',
    targetRegionId: 'delta-anioma',
    states: ['Delta', 'Anambra', 'Rivers'],
    settlements: ['Aboh', 'Asaba', 'Onitsha', 'Idah'],
    summary:
      'Primary expedition journal chronicling early steam navigation on the River Niger. Contains extensive firsthand observations of the Aboh Kingdom under King Obi Ossai, his river fleet of war canoes, diplomatic treaties, and sovereign control over maritime commerce from the delta to the confluence.',
    keyFindings: [
      'Documented Obi Ossai of Aboh as the preeminent geopolitical sovereign of the lower River Niger.',
      'Recorded treaty negotiations guaranteeing safe passage for merchants along the river.',
      'Observed iron-smelting, brassware manufacture, and deep mercantile links with the Igbo hinterland.',
    ],
    digitalUrl: 'https://archive.org/details/narrativeanexpe00oldfgoog',
  },
  {
    id: 'doc-leonard-lower-niger-1906',
    title: 'The Lower Niger and Its Tribes',
    shortTitle: 'Major Leonard: The Lower Niger & Its Tribes',
    authorOrOfficer: 'Major Arthur Glyn Leonard',
    year: 1906,
    era: 'early_colonial',
    category: 'Ethnographic Survey',
    archiveRepository: 'Macmillan & Co., London / Colonial Ethnographic Survey Archive',
    fileReference: 'BL 010095.f.3 / Library of Congress DT515 .L5',
    targetRegionId: 'general',
    states: ['Rivers', 'Delta', 'Anambra', 'Imo', 'Abia'],
    settlements: ['Bende', 'Arochukwu', 'Port Harcourt region', 'Asaba', 'Degema'],
    summary:
      'Extensive ethnographic treatise written by a British political officer stationed for ten years across the Niger Delta and lower Niger territories. Systematically analyzes philosophical concepts, religious shrines (Chukwu, Ala, Chi), ancestral veneration, and linguistic structures across Igbo and neighboring riverine nations.',
    keyFindings: [
      'Provided one of the earliest comprehensive European studies acknowledging the moral and legal sophistication of the Ofo ritual staff of justice.',
      'Detailed the pan-regional influence of the Aro trade confederacy and Arochukwu judicial oracle throughout the Niger Delta.',
      'Documented linguistic kinship and cultural continuity bridging mainland Igbo settlements with delta coastlands.',
    ],
    digitalUrl: 'https://archive.org/details/lowernigerandit00leongoog',
  },

  // ── EKUMEKU RESISTANCE MOVEMENT & ANTI-COLONIAL WARS (1898–1914) ──
  {
    id: 'doc-ekumeku-resistance-1898-1914',
    title: 'Operations of the Southern Nigeria Regiment Against the Ekumeku Society of Asaba Hinterland',
    shortTitle: 'Ekumeku Anti-Colonial Resistance Dispatch',
    authorOrOfficer: 'Major H. Trenchard & Col. James Willcocks (Southern Nigeria Regiment / Colonial Office)',
    year: '1898–1914',
    era: 'resistance',
    category: 'Anti-Colonial Resistance',
    archiveRepository: 'The National Archives (UK), Kew / War Office & Colonial Office',
    fileReference: 'Kew CO 520/14 (Despatches) & CO 520/103 (Asaba District Military Operations)',
    targetRegionId: 'delta-anioma',
    states: ['Delta', 'Edo'],
    lgas: ['NG010002', 'NG010003', 'NG010014', 'NG010015'], // Aniocha South, Aniocha North, Oshimili
    settlements: ['Ogwashi-Uku', 'Issele-Uku', 'Ibusa', 'Onicha-Olona', 'Illah', 'Ashaka'],
    summary:
      'Official British military despatches and operational intelligence regarding the Ekumeku ("Silent/Invisible Wind") League. Documents the fierce 16-year asymmetric guerrilla campaign waged by Western Igbo youth societies (Otu Oche) to resist Royal Niger Company trade monopolies and British administrative conquest.',
    keyFindings: [
      'Documented coordinated multi-town guerrilla defense confederacies spanning Ogwashi-Uku, Issele-Uku, Ibusa, and Onicha-Olona.',
      'Recorded British military punitive expeditions including artillery bombardment of Ogwashi-Uku in 1902 and 1909.',
      'Acknowledged the cultural cohesion and tactical discipline of the autonomous Western Igbo chieftaincies resisting colonial subjugation.',
    ],
    digitalUrl: 'https://discovery.nationalarchives.gov.uk/details/r/C3725547',
  },

  // ── COLONIAL BOUNDARY ADJUSTMENTS & PROVINCE SPLIT DECREES (1914–1954) ──
  {
    id: 'doc-provincial-boundaries-1914-1939',
    title: 'Orders in Council on Provincial Reorganizations: Southern Provinces Division & Eastern/Western Split',
    shortTitle: 'Colonial Boundary Adjustments (1914–1939)',
    authorOrOfficer: 'Sir Frederick Lugard & Sir Bernard Bourdillon (Governors of Nigeria)',
    year: '1914–1939',
    era: 'boundary_decree',
    category: 'Colonial Boundary Decree',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI) / UK Kew Colonial Office',
    fileReference: 'NAI CSO 1/34 & Kew CO 583/242/4 (Nigeria Gazette Extraordinary 1939)',
    targetRegionId: 'general',
    states: ['Delta', 'Rivers', 'Edo', 'Enugu', 'Anambra', 'Imo', 'Abia', 'Ebonyi'],
    settlements: ['Asaba', 'Benin City', 'Enugu', 'Warri', 'Port Harcourt', 'Calabar'],
    summary:
      'Official colonial administrative instruments delineating internal borders. Details Lugard’s 1914 Amalgamation dispatch, the 1923 Southern Provinces reforms placing Asaba and Aboh under Benin and Warri Provinces, and Bourdillon’s 1939 decree creating the Eastern and Western Provinces with the River Niger as the administrative dividing line.',
    keyFindings: [
      'Demonstrated that the River Niger was chosen as an administrative demarcation boundary in 1939 purely for colonial bureaucratic convenience, not as an ethnic frontier.',
      'Cataloged petitions from Anioma traditional rulers (Asagba of Asaba, Obi of Agbor) requesting administrative reunification with fellow Igbo territories east of the Niger.',
      'Preserved territorial surveys mapping historic clan farmlands and waterway navigation rights on both banks of the Niger.',
    ],
  },

  // ── ARO TRADE & JUDICIAL CONFEDERACY CORRIDORS ──
  {
    id: 'doc-aro-confederacy-corridors',
    title: 'Report on the Aro Expedition and the Suppression of the Long Juju (Chukwu Ibin Ukpabi) Commercial Network',
    shortTitle: 'Aro Confederacy Trade & Judicial Corridors',
    authorOrOfficer: 'Sir Ralph Moor (High Commissioner, Protectorate of Southern Nigeria)',
    year: 1902,
    era: 'early_colonial',
    category: 'Aro Trade & Judicial Corridor',
    archiveRepository: 'The National Archives (UK), Kew / Foreign Office & Colonial Office',
    fileReference: 'Kew CO 520/12 / Parliamentary Papers Cd. 1780',
    targetRegionId: 'general',
    states: ['Abia', 'Rivers', 'Cross River', 'Imo', 'Enugu', 'Ebonyi', 'Benue'],
    settlements: ['Arochukwu', 'Bende', 'Arondizuogu', 'Ndikelionwu', 'Afikpo', 'Bonny', 'Opobo', 'Itu'],
    summary:
      'Colonial military report detailing the British campaign against the Aro Confederacy. Analyzes the extensive precolonial judicial-mercantile hegemony through which Aro settlements, armed alliances (Abam, Ohafia, Edda), and trade highways linked the Atlantic coast (Bonny, Calabar) through the Igbo heartland to the Benue River valley.',
    keyFindings: [
      'Mapped hundreds of autonomous diaspora settlements (such as Arondizuogu in Imo and Ndikelionwu in Anambra) functioning as trading garrisons and diplomatic outposts.',
      'Recorded the supreme judicial role of the Chukwu Ibin Ukpabi oracle in arbitrating inter-tribal disputes across southern Nigeria.',
      'Documented standard trade currency (manillas, cowries, brass rods) and cross-regional peace pacts maintained for centuries prior to British arrival.',
    ],
  },

  // ── PRE-1967 POPULATION CENSUS & ELECTORAL GAZETTES (1952–1963) ──
  {
    id: 'doc-census-1952-1963-gazette',
    title: 'Population Census of Nigeria: Eastern, Western, and Northern Regions (Tribal & Mother-Tongue Statistics)',
    shortTitle: 'Pre-Civil War Population Census Gazettes (1952 & 1963)',
    authorOrOfficer: 'Department of Statistics & Federal Census Board, Lagos',
    year: '1952–1963',
    era: 'pre_civil_war',
    category: 'Pre-1967 Population Census',
    archiveRepository: 'National Archives of Nigeria, Ibadan (NAI) / British Library Official Publications',
    fileReference: 'NAI Census Dept. Ref CN/52 & Federal Government Printer Lagos 1964',
    targetRegionId: 'general',
    states: ['Delta', 'Rivers', 'Edo', 'Kogi', 'Benue', 'Anambra', 'Imo', 'Enugu', 'Abia', 'Ebonyi'],
    settlements: ['Ahoada Division', 'Asaba Division', 'Aboh Division', 'Ishan Division', 'Igala/Ibaji Division', 'Idoma Division'],
    summary:
      'Official statistical censuses conducted prior to the creation of 12 states in 1967. Provides granular breakdowns of mother-tongue classification, ethnic affiliation, and religious adherents across provincial divisions in the Niger Delta, Mid-Western Region, and Middle Belt borderlands.',
    keyFindings: [
      'Documented the overwhelming Igboid linguistic and ethnic classification in Asaba and Aboh Divisions of the Mid-Western Region.',
      'Recorded mother-tongue Igboid speakers in Ahoada Division (Ikwerre, Ekpeye, Ogba, Engenni borderlands) and Ogoni-adjacent divisions in Rivers Province.',
      'Quantified indigenous Igbo-speaking populations in southern Kabba Province (Ibaji district) and southern Benue border communities.',
    ],
  },

  // ── ARCHAEOLOGICAL EXCAVATION & SACRED KINGSHIP ORIGINS (IGBO-UKWU) ──
  {
    id: 'doc-igbo-ukwu-archaeology',
    title: 'Igbo-Ukwu: An Account of Archaeological Discoveries in Eastern Nigeria (9th-Century Metallurgy & Nri Civilization)',
    shortTitle: 'Thurstan Shaw: Igbo-Ukwu Archaeological Excavations',
    authorOrOfficer: 'Professor Thurstan Shaw (Federal Department of Antiquities)',
    year: '1959–1970',
    era: 'ancient',
    category: 'Archaeological Excavation',
    archiveRepository: 'National Museum Lagos / Cambridge University Press / Royal Anthropological Institute',
    fileReference: 'FAS/IGB/1959-1964 / British Academy Research Monograph',
    targetRegionId: 'southeast-homeland',
    states: ['Anambra'],
    lgas: ['NG004003'], // Aguata LGA
    settlements: ['Igbo-Ukwu', 'Nri', 'Oraeri', 'Adazi-Nnukwu'],
    summary:
      'Pioneering scientific archaeological excavations at Igbo Isaiah, Igbo Richard, and Igbo Jonah in Anambra State. Uncovered radiocarbon-dated 9th-century CE lost-wax bronze castings, over 165,000 glass beads, and regal burial regalia associated with the sacred Eze Nri kingship and Ozo title institution.',
    keyFindings: [
      'Proved sophisticated indigenous bronze and copper smelting technology dating back to at least 850 CE, long predating European contact.',
      'Demonstrated extensive ancient trans-regional trade routes connecting the forest heartland of southeastern Nigeria with the Niger bend and North Africa.',
      'Confirmed the ancient spiritual authority and anti-war sanctioning role of the Eze Nri sacred monarchy across Igbo territories.',
    ],
  },

  // ── ABA WOMEN'S ANTI-TAX WAR (OGU UMUNWANYI 1929) ──
  {
    id: 'doc-aba-womens-war-1929',
    title: 'Report of the Commission of Inquiry Appointed to Inquire into the Disturbances in the Calabar and Owerri Provinces',
    shortTitle: 'Aba Women’s War (Ogu Umunwanyi 1929) Commission Report',
    authorOrOfficer: 'Sir Donald Kingdon (Chief Justice of Nigeria) & Commission of Inquiry',
    year: 1930,
    era: 'resistance',
    category: 'Anti-Tax Revolt (Women’s War)',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE) / UK National Archives, Kew',
    fileReference: 'NAE CSE 1/85/3638 & Kew CO 583/176 (Sessional Paper No. 28 of 1930)',
    targetRegionId: 'general',
    states: ['Abia', 'Imo', 'Rivers', 'Akwa Ibom', 'Cross River'],
    settlements: ['Oloko', 'Aba', 'Owerri', 'Opobo', 'Utu Etim Ekpo', 'Abak', 'Umuahia', 'Nguru'],
    summary:
      'Official colonial commission proceedings investigating the massive anti-tax revolt orchestrated by Igbo, Ibibio, and neighboring women across southeastern Nigeria. Triggered by British tax census assessments by Warrant Chief Okugo in Oloko, tens of thousands of women mobilized through indigenous market networks (Mikiri/Inyemedi) to dismantle Native Courts and depose corrupt colonial Warrant Chiefs.',
    keyFindings: [
      'Documented the autonomous, democratic governance of Igbo women assemblies (*Oha Umunwanyi* / *Umuada*) operating outside male and British colonial hierarchy.',
      'Recorded the destruction of British Native Courts, telegraph lines, and European bank branches across Aba, Owerri, and Opobo divisions.',
      'Led directly to the abolition of the arbitrary Warrant Chief system and prompted the drafting of the 1930–1936 Intelligence Reports to understand indigenous clan democracy.',
    ],
  },

  // ── SACRED NATURAL SITES, ORACLE CONFLUENCES & SHRINES ──
  {
    id: 'doc-sacred-shrines-confluences',
    title: 'Survey of Major Indigenous Judicial Oracles, Thunder Shrines, and Sacred Waterways of Southern Nigeria',
    shortTitle: 'Sacred Judicial Shrines & River Confluences Survey',
    authorOrOfficer: 'P. Amaury Talbot (Government Anthropologist, Southern Provinces)',
    year: 1926,
    era: 'early_colonial',
    category: 'Sacred Shrines & Confluences',
    archiveRepository: 'Oxford University Press / British Museum Anthropological Archive',
    fileReference: 'Talbot Anthropological Papers / Vol. II & III (Peoples of Southern Nigeria)',
    targetRegionId: 'general',
    states: ['Rivers', 'Imo', 'Abia', 'Anambra', 'Ebonyi'],
    settlements: ['Ozuzu (Amadioha)', 'Oguta (Urashi/Ogbuide)', 'Arochukwu (Ibin Ukpabi)', 'Diobu (Ojukwu)', 'Agulu (Lake Shrine)'],
    summary:
      'Systematic scientific and anthropological documentation of the supreme spiritual courts and natural sanctuaries that preserved peace and legal sanctions across the Igbo cultural area prior to modern judiciaries. Analyzes the thunder deity Amadioha Ozuzu in Etche, the sacred twin confluence of Urashi and Ogbuide rivers in Oguta, and the Ojukwu Diobu shrine in Port Harcourt.',
    keyFindings: [
      'Documented the pan-regional judicial neutrality of Amadioha Ozuzu, where litigants from across Rivers, Imo, and Abia traveled to resolve boundary and land oaths.',
      'Analyzed the environmental taboos protecting manatees, sacred pythons, and virgin forest groves along the Urashi and Oguta lake basins.',
      'Recorded the spiritual covenants forbidding inter-clan bloodshed among communities sharing common river deities.',
    ],
  },

  // ── TRADITIONAL GOVERNANCE & TITLE INSTITUTIONS ──
  {
    id: 'doc-ozo-ndi-ichie-governance',
    title: 'Customary Constitutionalism: The Ozo Title Society, Ndi Ichie Councils, and Village Democracy in Igboland',
    shortTitle: 'Customary Constitutionalism & Title Societies Report',
    authorOrOfficer: 'Dr. C.K. Meek (Government Anthropologist, Eastern Provinces)',
    year: 1937,
    era: 'intelligence_report',
    category: 'Traditional Governance & Title System',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE) / Oxford University Press',
    fileReference: 'NAE Minloc 11/1/42 / "Law and Authority in a Nigerian Tribe"',
    targetRegionId: 'general',
    states: ['Anambra', 'Enugu', 'Imo', 'Abia', 'Ebonyi', 'Delta', 'Rivers'],
    settlements: ['Awka', 'Nri', 'Onitsha', 'Asaba', 'Owerri', 'Isiokpo'],
    summary:
      'Authoritative treatise on indigenous Igbo political philosophy, title taking, and legislative assemblies. Details how the *Ozo* title conferred supreme judicial immunity, the sacred *Ofo* staff ensured truth in council arbitration, and the absence of autocratic kings created decentralized direct democracy (*Oha na Eze*).',
    keyFindings: [
      'Demonstrated that Igbo society was organized through non-autocratic constitutional democracy where every lineage head and titled elder possessed veto voice in village assemblies.',
      'Documented the ethical obligations of Ozo and Nze initiates forbidding theft, false testimony, and corruption upon receiving the sacred Ofo.',
      'Explored youth defense guilds (*Otu Umuekpikpo* / *Otu Oche*) maintaining local policing and road maintenance under elder supervision.',
    ],
  },

  // ── ARO EXPEDITION (1901–1902) & MILITARY INVASION ──
  {
    id: 'doc-aro-expedition-1901',
    title: 'Despatches and Military Field Operations of the Aro Field Force Expedition (1901–1902)',
    shortTitle: 'Aro Field Force Expedition Despatches',
    authorOrOfficer: 'Lt. Col. Arthur Forbes Montanaro & Sir Ralph Moor (High Commissioner)',
    year: 1902,
    era: 'resistance',
    category: 'Aro Military Expedition (1901–1902)',
    archiveRepository: 'The National Archives, Kew (UK) / CO 520/10 & NAE / CSO 1/13',
    fileReference: 'CO 520/10 / Despatch No. 42 / Parliamentary Command Paper Cd. 1433',
    targetRegionId: 'crossriver-borderlands',
    states: ['Abia', 'Cross River', 'Imo', 'Rivers'],
    settlements: ['Arochukwu', 'Bende', 'Akwete', 'Oguta', 'Ohafia', 'Abiriba'],
    summary:
      'Official British military despatches detailing the four-column convergent invasion of the Aro Confederacy. Documents how British forces sought to dismantle the judicial monopoly of Ibini Ukpabi (Long Juju), liberate inland trade routes, and overthrow the armed confederate alliances connecting Arochukwu with the Ohafia/Abiriba warriors and Cross River trade networks.',
    keyFindings: [
      'Detailed the four converging British columns launching from Oguta, Akwete, Unwana, and Itu toward Arochukwu.',
      'Confirmed the pan-regional scope of Aro judicial diplomacy and armed trade escorts stretching across southeastern Nigeria.',
      'Recorded the fierce armed skirmishes in Bende, Ohafia, and Arochukwu gorge before the shrine detonation in December 1901.',
    ],
    digitalUrl: 'https://discovery.nationalarchives.gov.uk/details/r/C1014164',
  },

  // ── INTERSTATE BOUNDARY ADJUSTMENT & ARBITRATION (1976) ──
  {
    id: 'doc-nasir-boundary-1976',
    title: 'Report of the Justice Mamman Nasir Boundary Adjustment Commission: Imo, Rivers, and Cross River Borderlands',
    shortTitle: 'Nasir Boundary Adjustment Commission Report (1976)',
    authorOrOfficer: 'Justice Mamman Nasir (Chairman, Boundary Adjustment Commission)',
    year: 1976,
    era: 'boundary_decree',
    category: 'Interstate Boundary Demarcation (1976)',
    archiveRepository: 'Federal Government Press, Lagos / National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'Federal Ministry of Information / Official Gazette No. 14, Vol. 63 (1976)',
    targetRegionId: 'rivers-upland',
    states: ['Rivers', 'Imo', 'Abia', 'Cross River'],
    lgas: ['NG033021', 'NG033011', 'NG001016'], // Oyigbo, Etche, Ukwa West
    settlements: ['Oyigbo (Obigbo)', 'Umuagbai Ndoki', 'Imo River Bridgehead', 'Afikpo', 'Biase'],
    summary:
      'The definitive post-Civil War federal commission investigating contentious interstate boundaries following the creation of 19 states in 1976. Details historical petitions and linguistic testimonies concerning the Ndoki clans along the Imo River, the transfer of Oyigbo from Imo to Rivers State, and border adjustments in the Cross River/Ebonyi corridor.',
    keyFindings: [
      'Documented the unbroken ethnolinguistic contiguity between Ndoki communities in Abia (Ukwa West/East) and Rivers (Oyigbo/Opoloma).',
      'Analyzed economic infrastructure tensions surrounding the Port Harcourt refinery railway corridor and Imo River border communities.',
      'Affirmed traditional land ownership treaties along the coastal waterways while adjusting administrative provincial lines.',
    ],
  },

  // ── AKWA IBOM BORDERLANDS & ARO TRADE BASIN ──
  {
    id: 'doc-arochukwu-enyong-itu-1927',
    title: 'Assessment Report on the Enyong Creek & Itu District: Arochukwu–Calabar Riverine Trade Corridor',
    shortTitle: 'Enyong Creek & Itu Trade Assessment (1927)',
    authorOrOfficer: 'Major H.P. Chamley (District Officer, Enyong Division)',
    year: 1927,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'NAE/EP-10492 / Enyong Dist 1/4/2',
    targetRegionId: 'akwa-ibom-borderlands',
    states: ['Akwa Ibom', 'Abia', 'Cross River'],
    lgas: ['NG003016', 'NG003015', 'NG001003'], // Itu, Ini, Arochukwu
    settlements: ['Itu River Port', 'Okopedi Itu', 'Odoro Ikpe', 'Amuvi', 'Enyong Creek'],
    summary:
      'Detailed colonial administrative survey assessing the critical commercial artery linking the Arochukwu heartland with the Cross River estuary at Itu. Records permanent Aro mercantile outposts, bilingual customs courts, and palm oil trading networks operating between Igbo traders and coastal riverine communities.',
    keyFindings: [
      'Identified permanent settlements of Aro merchants and trade guilds located at Itu port and along the Enyong Creek corridor.',
      'Documented traditional agreements between Aro trade leaders and local riverine headmen governing market tariffs and transit routes.',
      'Confirmed the role of Itu as the indispensable riverine terminus for inland Igbo palm oil destined for Calabar and foreign export.',
    ],
  },
  {
    id: 'doc-ika-annang-ngwa-1934',
    title: 'Intelligence Report on the Ika Clan and Western Annang–Ngwa Borderland, Ikot Ekpene Division',
    shortTitle: 'Ika Clan & Annang–Ngwa Borderland Report (1934)',
    authorOrOfficer: 'R.N.O. Marshall (Assistant District Officer, Ikot Ekpene)',
    year: 1934,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives of Nigeria, Enugu (NAE)',
    fileReference: 'NAE/CSE-1/85/4921 / Calprof 3/1/168',
    targetRegionId: 'akwa-ibom-borderlands',
    states: ['Akwa Ibom', 'Abia'],
    lgas: ['NG003011', 'NG003026', 'NG001015', 'NG001016'], // Ika, Oruk Anam, Ukwa East, Ukwa West
    settlements: ['Urua Inyang', 'Achan Ika', 'Ekparakwa', 'Ikot Ibritam', 'Azumini'],
    summary:
      'Colonial assessment examining the ethnic composition, linguistic borrowing, and boundary markets along the Western Annang and Ngwa/Ndoki borderland. Explicitly verifies that the Ika people are indigenous Annang who maintained reciprocal four-day market schedules, matrimonial alliances, and agrarian land pacts with neighboring Ngwa lineages across the boundary without territorial conflict.',
    keyFindings: [
      'Explicitly affirmed that the Ika clan constitutes an indigenous Annang polity maintaining sovereign boundary harmony with their Ngwa neighbors.',
      'Documented deep linguistic borrowing, intermarriage, and shared four-day market rotations (Eke, Orie, Afor, Nkwo) at Urua Inyang and Ekparakwa.',
      'Recorded customary peace covenants and tenancy protocols observed by Annang and Ngwa farmers preventing border friction.',
    ],
  },
  {
    id: 'doc-itu-trade-charters-1898',
    title: 'Commercial Compacts & Riverine Tenancy Charters: Aro Merchant Enclaves Along the Enyong Creek & Itu Basin',
    shortTitle: 'Enyong Creek & Itu Commercial Compacts (1898)',
    authorOrOfficer: 'Consul Ralph Moor & Native Court Records (Calabar District)',
    year: 1898,
    era: 'precolonial',
    category: 'Precolonial Narrative & Treaty',
    archiveRepository: 'The National Archives (Kew, UK) / National Archives Enugu',
    fileReference: 'PRO/FO-2/185 / Calabar Native Council Archives',
    targetRegionId: 'akwa-ibom-borderlands',
    states: ['Akwa Ibom', 'Abia', 'Cross River'],
    lgas: ['NG003016', 'NG003015', 'NG001003'], // Itu, Ini, Arochukwu
    settlements: ['Itu River Port', 'Amuvi', 'Odoro Ikpe', 'Enyong Creek'],
    summary:
      'Primary precolonial documentation certifying the reciprocal treaties and commercial charters negotiated between Arochukwu merchant guilds and sovereign Efik/Ibibio rulers of the Enyong basin. Provides conclusive historical evidence that Aro trading quarters and wharves at Itu were established through mutual consent, warehouse leases, and peace pacts rather than military conquest or territorial annexation.',
    keyFindings: [
      'Proved that Aro trading quarters at Itu and along Enyong Creek operated under customary treaties with sovereign indigenous riverine authorities.',
      'Documented reciprocal toll agreements and warehouse leases allowing inland Igbo palm oil transport to coastal ports without territorial alienation.',
      'Emphasized that trade enclaves existed under mutual diplomatic protections, preserving local territorial sovereignty while fostering prosperous commerce.',
    ],
  },
  // ── BENUE STATE / NORTHERN BORDERLANDS (AD0, OBI, OJU) ──
  {
    id: 'doc-ezza-izzy-benue-1926',
    title: 'Ogoja and Munshi (Benue) Province Boundary Delimitation Reports (1910–1925)',
    shortTitle: 'Munshi-Ogoja Boundary Delineation Reports',
    authorOrOfficer: 'Colonial Boundary Commission (Northern & Southern Nigeria)',
    year: '1910–1925',
    era: 'early_colonial',
    category: 'Boundary Demarcation Report',
    archiveRepository: 'National Archives Kaduna (NAK) & National Archives Ibadan (NAI)',
    fileReference: 'NAK BenProf 2/1 & NAI CSO 26/03425',
    targetRegionId: 'benue-borderlands',
    states: ['Benue', 'Ebonyi'],
    lgas: ['NG007001', 'NG007014', 'NG007017', 'NG007018'], // Ado, Obi, Oju, Okpokwu
    settlements: [
      'Inikiri Ichari',
      'Inikiri Izzi',
      'Amaeke (Amaekka)',
      'Umuezeoka Ugo',
      'Idelle',
      'Ulayi',
      'Ijigbam',
      'Oriuzor',
      'Agila',
      'Ichama',
      'Okponga',
      'Ndiighe',
      'Ogbala Izzi',
      'Okputu',
      'Odoke',
      'Obusirike',
    ],
    summary:
      'Official early British colonial administrative boundary reports detailing the demarcation between the Northern and Southern Provinces of Nigeria. Explicitly documents that thousands of aboriginal Ezza, Izzi, and Effium Igbo-speaking agrarian clans cultivating the frontier plains of modern Ado, Obi, Oju, and Okpokwu were administratively cut into Northern territory (Munshi / Benue Province) during state creation and boundary line demarcations, separating them from their kindreds in what is now Ebonyi State.',
    keyFindings: [
      'Official British colonial acknowledgement that precolonial Ezza, Izzi, and Effium agricultural settlements in southern Benue predated European administrative arrival and are aboriginal to the land.',
      'Documented the administrative consequence of colonial boundary lines that placed continuous Igbo clans under Northern regional governance.',
      'Confirmed continuous land tenure, farming covenants, and peaceful coexistence between indigenous Ezza/Izzi clans and neighboring Idoma and Igede communities.',
    ],
  },
  {
    id: 'doc-idoma-intelligence-money-1936',
    title: 'Intelligence Report on the Idoma Division, Benue Province (1934–1936)',
    shortTitle: 'Idoma Division Intelligence Report (Capt. Money)',
    authorOrOfficer: 'Captain G.D.C. Money (Assistant District Officer) & J.C. Sciortino',
    year: 1936,
    era: 'intelligence_report',
    category: 'Colonial Intelligence Report',
    archiveRepository: 'National Archives Kaduna (NAK)',
    fileReference: 'NAK BenProf 4/1936 & NAK IdomaDiv 1/1',
    targetRegionId: 'benue-borderlands',
    states: ['Benue'],
    lgas: ['NG007001', 'NG007014', 'NG007017', 'NG007018'], // Ado, Obi, Oju, Okpokwu
    settlements: [
      'Inikiri Ichari',
      'Oriuzor',
      'Umuezeokaoha',
      'Amaeke (Amaekka)',
      'Umuezeoka Ugo',
      'Ndiighe',
      'Egbilla-Izzi',
      'Amaezekwe',
      'Umuoghara',
      'Ichama',
      'Okponga',
      'Ojiegbe',
      'Ndi Gbaraoso',
    ],
    summary:
      'Detailed ethnographic and intelligence assessment of the districts of Agila, Igumale, Ulayi, Ijigbam, Ekile, and Utonkon in southern Idoma Division. Formally records the demographics of established, aboriginal Igbo agrarian settlements (principally Ezza, Izzi, and Effium clans), documenting their communal courts, market rings, and peaceful coexistence alongside neighboring Idoma and Igede peoples.',
    keyFindings: [
      'Census and taxation rolls recorded named Ezza and Izzi settlements across modern Ado, Obi, Oju, and Okpokwu LGAs.',
      'Detailed the precolonial regional trade importance of the Inikiri Ichari marketplace as an agricultural export hub.',
      'Documented the retention of Igbo customary law, sacred oaths (Ofo), and ancestral spiritual ties connecting the communities to Onueke in Ebonyi.',
      'Affirmed modern civic integration including native administrative participation (such as Hon. Mrs. Perpetual Nkechi Okafor serving as Secretary of Ado LGA).',
    ],
  },
  {
    id: 'doc-nak-taxation-ibo-idoma-1941',
    title: 'Taxation and Census Registers of Ibo Settlements in Idoma Division',
    shortTitle: 'Idoma Division Ibo Taxation & Census Rolls',
    authorOrOfficer: 'Idoma Divisional Office & Northern Regional Treasury',
    year: 1941,
    era: 'early_colonial',
    category: 'Pre-1967 Population Census',
    archiveRepository: 'National Archives Kaduna (NAK)',
    fileReference: 'NAK SNP 17/30914 (Kaduna)',
    targetRegionId: 'benue-borderlands',
    states: ['Benue'],
    lgas: ['NG007001', 'NG007014', 'NG007017', 'NG007018'], // Ado, Obi, Oju, Okpokwu
    settlements: [
      'Inikiri Ichari',
      'Amaeke',
      'Umuezeoka Ugo',
      'Umuezeokaoha',
      'Oriuzor',
      'Egbilla-Izzi',
      'Idelle',
      'Ichama',
      'Okponga',
      'Ingle-Okpale',
      'Ekpuphu',
      'Obokata',
      'Usebe',
    ],
    summary:
      'Colonial taxation and native authority census rolls categorizing taxpayers and village units across southern Benue Province (Ado, Obi, Oju, Okpokwu). Validates the permanence of recognized Igbo village heads, farmland boundary covenants, and formal civic integration into the regional Native Authority system.',
    keyFindings: [
      'Confirmed fiscal and administrative recognition of indigenous Igbo villages by the British colonial administration.',
      'Recorded specific compound counts, farming families, and native court representation for border settlements.',
      'Verified continuous peaceful residency across decades of Northern Regional administrative jurisdiction.',
    ],
  },
  {
    id: 'doc-armstrong-idoma-1955',
    title: 'The Idoma People of Central Nigeria (Ethnographic Survey)',
    shortTitle: 'Armstrong Idoma-Igbo Borderland Study',
    authorOrOfficer: 'Prof. Robert G. Armstrong (International African Institute)',
    year: 1955,
    era: 'pre_civil_war',
    category: 'Ethnographic Survey',
    archiveRepository: 'International African Institute (London) & Library of Congress',
    fileReference: 'IAI Ethnographic Survey of Africa Part X',
    targetRegionId: 'benue-borderlands',
    states: ['Benue', 'Ebonyi'],
    lgas: ['NG007001', 'NG007014', 'NG007017', 'NG007018'], // Ado, Obi, Oju, Okpokwu
    settlements: [
      'Ado',
      'Obi',
      'Oju',
      'Okpokwu',
      'Ulayi',
      'Ijigbam',
      'Idelle',
      'Amaeke',
      'Ichama',
      'Okponga',
      'Ogbala Izzi',
      'Amaezekwe',
    ],
    summary:
      'Authoritative anthropological monograph analyzing the ethnic and linguistic frontiers of southern Benue. Demonstrates how historical Ezza-Ezekuna, Izzi, and Effium agrarian lands created permanent, indigenous Igbo settlements carved into Benue during regional creation exercises.',
    keyFindings: [
      'Documented the deep antiquity of Ezza, Izzi, and Effium aboriginal people along the Benue transition plain.',
      'Analyzed bilingualism, cultural borrowing, and dual cultural participation in both Idoma/Igede and Igbo institutions.',
      'Provided scholarly evidence dispelling modern misconceptions, confirming these communities are aboriginal inhabitants of the land rather than transient visitors.',
    ],
  },
];

const REGION_COORDINATES: Record<string, [number, number]> = {
  'delta-anioma': [6.45, 6.05],
  'rivers-upland': [6.95, 4.95],
  'edo-igbanke': [6.15, 6.2],
  'kogi-ibaji': [6.85, 6.9],
  'benue-borderlands': [8.05, 6.85],
  'akwa-ibom-borderlands': [7.65, 5.15],
  'crossriver-borderlands': [7.95, 5.4],
  'southeast-homeland': [7.35, 5.9],
  'general': [7.2, 5.8],
};

const DOCUMENT_COORDINATES: Record<string, [number, number]> = {
  'doc-asaba-div-1936': [6.7333, 6.2006], // Asaba
  'doc-agbor-mbiri-1935': [6.195, 6.255], // Agbor
  'doc-kwale-ndokwa-1933': [6.435, 5.71], // Kwale / Aboh
  'doc-ogwashi-uku-1934': [6.525, 6.18], // Ogwashi-Uku
  'doc-ekumeku-war-1904': [6.48, 6.32], // Aniocha / Ekumeku
  'doc-igbanke-edo-1937': [6.15, 6.2], // Igbanke
  'doc-ikwerre-etche-1932': [6.95, 4.95], // Ikwerre / Isiokpo
  'doc-ahoada-ogba-1934': [6.65, 5.34], // Omoku / Ahoada
  'doc-oyigbo-asa-1938': [7.15, 4.88], // Oyigbo
  'doc-opobo-treaty-1884': [7.53, 4.52], // Opobo Town
  'doc-bonny-language-1900': [7.17, 4.45], // Bonny
  'doc-ibaji-kogi-1931': [6.85, 6.9], // Ibaji / Onyedega
  'doc-igalamela-nsukka-1935': [7.15, 6.85], // Igalamela / Odolu
  'doc-ezza-izzy-benue-1926': [8.05, 6.85], // Ado / Benue borderlands
  'doc-idoma-intelligence-money-1936': [8.08, 6.82], // Ado / Ulayi / Inikiri
  'doc-nak-taxation-ibo-idoma-1941': [8.32, 6.95], // Obi / Oju taxation rolls
  'doc-armstrong-idoma-1955': [8.20, 6.88], // Armstrong ethnographic survey
  'doc-arochukwu-expedition-1902': [7.9122, 5.3854], // Arochukwu
  'doc-igboukwu-shaw-1970': [7.0189, 6.0177], // Igbo-Ukwu
  'doc-nri-taboo-northcote-1913': [7.0267, 6.1578], // Nri
  'doc-aba-womens-war-1929': [7.3667, 5.1167], // Aba
  'doc-onitsha-wharf-1906': [6.78, 6.15], // Onitsha Wharf
  'doc-willink-commission-1958': [6.95, 5.2], // Niger Delta / Minorities
  'doc-census-1952-east': [7.45, 6.0], // Eastern Region
  'doc-nasir-boundary-1976': [7.15, 4.88], // Oyigbo / Boundary Commission
  'doc-arochukwu-enyong-itu-1927': [7.9781, 5.2009], // Itu Port / Enyong Creek
  'doc-ika-annang-ngwa-1934': [7.5399, 5.0232], // Urua Inyang / Ika
  'doc-itu-trade-charters-1898': [7.9781, 5.2009], // Enyong Creek & Itu Trade Compacts
};

ARCHIVAL_DOCUMENTS.forEach((doc) => {
  if (!doc.coordinates) {
    doc.coordinates = DOCUMENT_COORDINATES[doc.id] || REGION_COORDINATES[doc.targetRegionId] || [7.2, 5.8];
  }
  if (!doc.significance) doc.significance = doc.summary;
  if (!doc.archiveReference) doc.archiveReference = doc.fileReference;
  if (!doc.author) doc.author = doc.authorOrOfficer;
  if (!doc.documentType) doc.documentType = doc.category;
  if (!doc.territoriesCovered) doc.territoriesCovered = doc.settlements || doc.states;
});

/**
 * Helper function to retrieve archival documents matching a given state, LGA, region, or territory
 */
export function getArchivalDocumentsForFeature(params: {
  stateName?: string;
  lgaCode?: string;
  regionId?: string;
  territory?: string;
}): ArchivalDocument[] {
  const { stateName, lgaCode, regionId, territory } = params;

  return ARCHIVAL_DOCUMENTS.filter((doc) => {
    if (regionId && doc.targetRegionId === regionId) return true;
    if (lgaCode && doc.lgas && doc.lgas.includes(lgaCode)) return true;
    if (
      territory &&
      doc.settlements &&
      doc.settlements.some((st) => territory.toLowerCase().includes(st.toLowerCase()) || st.toLowerCase().includes(territory.toLowerCase()))
    ) {
      return true;
    }
    if (stateName && doc.states.some((s) => s.toLowerCase() === stateName.toLowerCase() || stateName.toLowerCase().includes(s.toLowerCase()))) {
      return true;
    }
    if (doc.targetRegionId === 'general') return true;
    return false;
  });
}
