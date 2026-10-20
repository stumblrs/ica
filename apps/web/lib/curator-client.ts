'use client';

import { useEffect, useState } from 'react';

export interface SettlementHeritageProfile {
  id: string;
  name: string;
  matchKeys: string[];
  nativeName?: string;
  traditionalRulerTitle?: string;
  clanLineage?: string;
  marketDay?: string;
  festivals?: string[];
  sacredLandmarks?: string[];
  historicalSummary?: string;
  customAttributes?: Record<string, string>;
  specificArchivalDocs?: string[];
  updatedAt: string;
  updatedBy?: string;
}

// Client-side in-memory registry seeded with baseline records
export const CLIENT_SEED_PROFILES: SettlementHeritageProfile[] = [
  {
    id: 'prof-awka-north',
    name: 'Awka North',
    matchKeys: ['awka north', 'achalla', 'amanuke', 'ebenebe', 'ng004002', 'uwa'],
    nativeName: 'Ọka Ebe-Ugwu',
    traditionalRulerTitle: 'Okpara-Ukwu / Eze of Achalla',
    clanLineage: 'Ụmụ-Nehi ancestral clans along the Omambala agrarian basin',
    marketDay: 'Orie Achalla',
    festivals: ['Igu Aro Festivity', 'Otite New Yam Rites', 'Egwu Onwa'],
    sacredLandmarks: ['Obu Ofor Achalla', 'Haba Stream Basin', 'Ebenebe Sacred Forest'],
    historicalSummary:
      'Ancient agrarian and artisan corridor buffering the lower Omambala floodplains. Celebrated for yam cultivars and historic links with the Awka blacksmithing guilds.',
    customAttributes: {
      'Iron Smelting Heritage': 'Precolonial smelting furnaces and slag deposits identified near the Amanuke corridor.',
      'Colonial Classification': 'Part of historical Awka Division Native Authority under Onitsha Province (1904).',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof-awka-south',
    name: 'Awka South',
    matchKeys: ['awka south', 'awka', 'oka', 'ng004003', 'c1-awka'],
    nativeName: 'Ọka',
    traditionalRulerTitle: 'Ezeuzu of Awka (The Blacksmith Monarch)',
    clanLineage: 'Ayom-na-Okpala, Nkwelle, and Amikwo ancestral federations',
    marketDay: 'Eke Awka',
    festivals: ['Egwu Imoka Festival', 'Igu Aro Awka', 'Ozo Title Initiation'],
    sacredLandmarks: ['Imoka Shrine', 'Obu Ofor Nkwelle', 'Eke Awka Central Square'],
    historicalSummary:
      'Historic capital of master Igbo metallurgy, brass casting, and itinerant blacksmiths. Awka smiths traveled across West Africa holding sacred judicial and ritual privileges.',
    customAttributes: {
      'Metallurgical Specialty': 'Blacksmith guilds holding sovereign immunity covenants throughout precolonial Igboland.',
      'Title Society': 'Ozo and Osu title councils managing municipal justice.',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof-onitsha',
    name: 'Onitsha',
    matchKeys: ['onitsha', 'onitsha north', 'onitsha south', 'onicha', 'c1-onitsha'],
    nativeName: 'Ọnịcha Ado N’Idu',
    traditionalRulerTitle: 'Obi of Onitsha',
    clanLineage: 'Chima dynasty & ancient River Niger riverine merchant aristocracy',
    marketDay: 'Otu Onitsha (Great Market)',
    festivals: ['Ofala Festival', 'Umerinfe', 'Igu Aro'],
    sacredLandmarks: ['Iba Obi Royal Palace', 'River Niger Confluence Gateway', 'Ani Onitsha Shrine'],
    historicalSummary:
      'Ancient geopolitical gateway and monarchical citadel on the eastern bank of the River Niger. A historic hub of commerce, treaties, and West African intellectual history.',
    customAttributes: {
      'Commercial Hub': 'Host to the largest traditional open-air mercantile market in West Africa.',
      'Historical Treaties': '1857 Macgregor Laird trade agreement & 1884 British commercial compacts.',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof-nri',
    name: 'Nri',
    matchKeys: ['nri', 'anocha', 'agukwu', 'agukwu-nri', 'comm-nri'],
    nativeName: 'Nri Ọnụ-Ọbụ',
    traditionalRulerTitle: 'Eze Nri (Ritual Priest-King)',
    clanLineage: 'Eri ancestral descent (Ancient priest-king religious realm)',
    marketDay: 'Afor Nri',
    festivals: ['Igu Aro Nri (Proclamation of Lunar Year)', 'Ifejioku', 'Ichi Title Inception'],
    sacredLandmarks: ['Obu Gad', 'Eze Nri Sacred Palace', 'Lake Nri Sacred Sanctuary'],
    historicalSummary:
      'The sacred heart of ancestral Igbo ritual kingship, divine agriculture (yam), peacemaking treaties, and the high bronze civilization of Igbo-Ukwu.',
    customAttributes: {
      'Cosmological Role': 'Instituted the four-day market cycle (Eke, Orie, Afor, Nkwo) throughout the Igbo heartland.',
      'Archaeology': 'Contextually linked to the 9th-century bronze metallurgy excavated at Igbo-Ukwu by Thurstan Shaw.',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prof-asaba',
    name: 'Asaba',
    matchKeys: ['asaba', 'ahaba', 'oshimili', 'oshimili south', 'c1-asaba'],
    nativeName: 'Ahaba (Asagba na Asaba)',
    traditionalRulerTitle: 'Asagba of Asaba',
    clanLineage: 'Nnebisi ancestral line balancing Anioma Western Igbo governance',
    marketDay: 'Ahaba Central Market (Nkwo)',
    festivals: ['Ichu Ulo', 'Ikejie Yam Festival', 'Inyanga'],
    sacredLandmarks: ['Asagba Royal Palace', 'Cable Point Niger Wharf', 'Nnebisi Memorial Landmark'],
    historicalSummary:
      'Principal western metropolis of the Anioma cultural zone on the River Niger. Celebrated for indigenous dual governance councils (Oturaza elders & Otu-Onotu warrior guild).',
    customAttributes: {
      'Colonial Significance': 'First colonial capital of the Royal Niger Company protectorate (1886–1900).',
      'Linguistic Status': 'Enuani Western dialect with ancient ancestral links to Onitsha.',
    },
    updatedAt: new Date().toISOString(),
  },
];

let cachedProfiles: SettlementHeritageProfile[] = [...CLIENT_SEED_PROFILES];

export function getClientProfiles(): SettlementHeritageProfile[] {
  return cachedProfiles;
}

export function matchSettlementProfile(query: {
  name?: string;
  code?: string;
  parentName?: string;
}): SettlementHeritageProfile | null {
  const { name, code, parentName } = query;
  const targetName = (name || '').trim().toLowerCase();
  const targetCode = (code || '').trim().toLowerCase();
  const strippedName = targetName.replace(/^(ref-|settlement-|comm-|canonical-)/, '');

  for (const prof of cachedProfiles) {
    if (prof.id.toLowerCase() === targetCode) return prof;
    if (prof.name.toLowerCase() === targetName || prof.name.toLowerCase() === strippedName) return prof;

    const matched = prof.matchKeys.some((k) => {
      const normK = k.trim().toLowerCase();
      return (
        normK === targetName ||
        normK === strippedName ||
        (targetCode && normK === targetCode) ||
        (targetName && normK.length > 3 && targetName.includes(normK)) ||
        (strippedName && normK.length > 3 && strippedName.includes(normK)) ||
        (parentName && normK.length > 4 && parentName.toLowerCase().includes(normK))
      );
    });

    if (matched) return prof;
  }

  return null;
}

export function useSettlementHeritageProfile(feature?: {
  name?: string;
  code?: string;
  parentName?: string;
} | null) {
  const [profile, setProfile] = useState<SettlementHeritageProfile | null>(() =>
    feature ? matchSettlementProfile(feature) : null
  );

  useEffect(() => {
    // Background fetch to sync any newly added/edited profiles from curator dashboard
    fetch('/api/curator/profiles')
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data) => {
        if (Array.isArray(data.profiles) && data.profiles.length > 0) {
          cachedProfiles = data.profiles;
          if (feature) {
            setProfile(matchSettlementProfile(feature));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!feature) {
      setProfile(null);
      return;
    }
    setProfile(matchSettlementProfile(feature));
  }, [feature?.name, feature?.code, feature?.parentName]);

  return profile;
}

export function useCuratorSettings() {
  const [settings, setSettings] = useState({
    publicSubmissionsEnabled: true,
    moderationMode: 'direct',
    curatorOnlyModeNotice: '',
  });

  useEffect(() => {
    fetch('/api/curator/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setSettings(d);
      })
      .catch(() => {});
  }, []);

  return settings;
}
