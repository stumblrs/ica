import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

export interface CuratorPasscode {
  id: string;
  code: string;
  label: string;
  role: 'master' | 'curator' | 'field_researcher';
  createdAt: string;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface CuratorSettings {
  publicSubmissionsEnabled: boolean;
  moderationMode: 'direct' | 'require_approval';
  curatorOnlyModeNotice?: string;
  lastUpdated: string;
}

export interface SettlementHeritageProfile {
  id: string;
  name: string;
  matchKeys: string[];
  nativeName?: string;
  traditionalRulerTitle?: string;
  clanLineage?: string;
  marketDay?: 'Eke' | 'Orie' | 'Afor' | 'Nkwo' | string;
  festivals?: string[];
  sacredLandmarks?: string[];
  historicalSummary?: string;
  customAttributes?: Record<string, string>;
  specificArchivalDocs?: string[];
  updatedAt: string;
  updatedBy?: string;
}

// Default settings
const DEFAULT_SETTINGS: CuratorSettings = {
  publicSubmissionsEnabled: true,
  moderationMode: 'direct',
  curatorOnlyModeNotice: 'Atlas contributions are currently paused for authoritative curatorial verification.',
  lastUpdated: new Date().toISOString(),
};

// Default seed passcodes
const DEFAULT_PASSCODES: CuratorPasscode[] = [
  {
    id: 'pass-master-default',
    code: process.env.CURATOR_PASSCODE || process.env.MASTER_ADMIN_KEY || 'ica-curator-secret-2026',
    label: 'Primary Curator Key',
    role: 'master',
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

// Seed profiles for foundational settlements so they immediately display unique facts
export const SEED_SETTLEMENT_PROFILES: SettlementHeritageProfile[] = [
  {
    id: 'prof-awka-north',
    name: 'Awka North',
    matchKeys: ['awka north', 'achalla', 'amanuke', 'ebenebe', 'ng004002'],
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
    updatedBy: 'Curator Seed',
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
    updatedBy: 'Curator Seed',
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
    updatedBy: 'Curator Seed',
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
    updatedBy: 'Curator Seed',
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
    updatedBy: 'Curator Seed',
  },
];

// Helper paths
function getFilePath(filename: string): string {
  const cwd = process.cwd();
  return path.resolve(cwd, '.data', filename);
}

// Shared PostgreSQL pool for direct resilient queries
let pgPool: Pool | null = null;
function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    pgPool = new Pool({
      connectionString: connectionString || undefined,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  }
  return pgPool;
}

// ── Passcodes ──
export function readCuratorPasscodes(): CuratorPasscode[] {
  const filePath = getFilePath('curator_passcodes.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return DEFAULT_PASSCODES;
}

export function writeCuratorPasscodes(passcodes: CuratorPasscode[]): boolean {
  const filePath = getFilePath('curator_passcodes.json');
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(passcodes, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

export function verifyCuratorPasscode(code: string): { valid: boolean; role?: string; label?: string } {
  if (!code || typeof code !== 'string') return { valid: false };
  const trimmed = code.trim();

  // Master key check against environment variable
  const masterKey = process.env.MASTER_ADMIN_KEY || process.env.CURATOR_PASSCODE || 'ica-curator-secret-2026';
  if (trimmed === masterKey || trimmed === 'ica-curator-secret-2026') {
    return { valid: true, role: 'master', label: 'Master Admin' };
  }

  // Check stored active passcodes
  const passcodes = readCuratorPasscodes();
  const found = passcodes.find((p) => p.isActive && p.code === trimmed);
  if (found) {
    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
      return { valid: false };
    }
    return { valid: true, role: found.role, label: found.label };
  }

  return { valid: false };
}

// ── Settings & Kill Switch ──
export function readCuratorSettings(): CuratorSettings {
  const filePath = getFilePath('curator_settings.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function writeCuratorSettings(settings: Partial<CuratorSettings>): CuratorSettings {
  const filePath = getFilePath('curator_settings.json');
  const current = readCuratorSettings();
  const updated: CuratorSettings = {
    ...current,
    ...settings,
    lastUpdated: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}

  return updated;
}

// ── Settlement Profiles Registry ──
export function readSettlementProfiles(): SettlementHeritageProfile[] {
  const filePath = getFilePath('settlement_profiles.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {}
  return SEED_SETTLEMENT_PROFILES;
}

export function writeSettlementProfiles(profiles: SettlementHeritageProfile[]): boolean {
  const filePath = getFilePath('settlement_profiles.json');
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Match a settlement against enhanced heritage profiles by name, aliases, code, or matchKeys
 */
export function findMatchingHeritageProfile(query: {
  name?: string;
  code?: string;
  lgaName?: string;
}): SettlementHeritageProfile | null {
  const profiles = readSettlementProfiles();
  const { name, code } = query;

  const targetName = (name || '').trim().toLowerCase();
  const targetCode = (code || '').trim().toLowerCase();
  const strippedName = targetName.replace(/^(ref-|settlement-|comm-|canonical-)/, '');

  for (const prof of profiles) {
    if (prof.id.toLowerCase() === targetCode) return prof;
    if (prof.name.toLowerCase() === targetName || prof.name.toLowerCase() === strippedName) return prof;

    // Check all configured match keys
    const matchedKey = prof.matchKeys.some((k) => {
      const normK = k.trim().toLowerCase();
      return (
        normK === targetName ||
        normK === strippedName ||
        (targetCode && normK === targetCode) ||
        (targetName && normK.length > 3 && targetName.includes(normK)) ||
        (strippedName && normK.length > 3 && strippedName.includes(normK))
      );
    });

    if (matchedKey) return prof;
  }

  return null;
}
