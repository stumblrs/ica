import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

// The 5 core Southeast Nigerian states
const SOUTHEAST_STATE_PCODS = ['NG001', 'NG004', 'NG011', 'NG014', 'NG017'];

/**
 * GET /api/map/active-lgas
 * Returns the list of LGAs outside the Southeast that currently have documented Igbo communities
 */
export async function GET(req: NextRequest) {
  let communities: any[] = [];
  if (fs.existsSync(DB_FILE)) {
    communities = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }

  // Filter for documented communities outside the 5 Southeast states
  const activeExternalLgaCodes = new Set<string>();
  for (const c of communities) {
    if (!SOUTHEAST_STATE_PCODS.includes(c.stateId) && c.lgaId) {
      if (['igbo', 'mixed', 'historically_igbo', 'igbo_associated'].includes(c.identityStatus)) {
        activeExternalLgaCodes.add(c.lgaId);
      }
    }
  }

  return NextResponse.json({
    southeastStates: SOUTHEAST_STATE_PCODS,
    activeExternalLgas: Array.from(activeExternalLgaCodes),
  });
}
