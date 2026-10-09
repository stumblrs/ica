import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'public/data/communities_store.json');

import { prisma } from '@/lib/prisma';

// The 5 Southeast Nigerian states
const SOUTHEAST_STATE_PCODS = ['NG001', 'NG004', 'NG011', 'NG014', 'NG017'];
const EXCLUDED_NON_IGBO_STATE_PCODS = ['NG032', 'NG002']; // Plateau, Adamawa

/**
 * GET /api/map/active-lgas
 * Returns the list of LGAs outside the Southeast that currently have documented Igbo communities
 */
export async function GET(req: NextRequest) {
  const activeExternalLgaCodes = new Set<string>();

  try {
    const communities = await prisma.community.findMany({
      where: {
        stateId: { notIn: SOUTHEAST_STATE_PCODS },
        identityStatus: { in: ['igbo', 'mixed', 'historically_igbo', 'igbo_associated'] },
        verificationStatus: { not: 'challenged' },
      },
      select: { lgaId: true, stateId: true, stateName: true },
    });

    for (const c of communities) {
      if (
        c.lgaId &&
        !SOUTHEAST_STATE_PCODS.includes(c.stateId) &&
        !EXCLUDED_NON_IGBO_STATE_PCODS.includes(c.stateId) &&
        !c.lgaId.startsWith('NG032') &&
        !c.lgaId.startsWith('NG002') &&
        (c.stateName || '').toLowerCase() !== 'plateau' &&
        (c.stateName || '').toLowerCase() !== 'adamawa'
      ) {
        activeExternalLgaCodes.add(c.lgaId);
      }
    }
  } catch (err) {
    // Fallback to local store if DB connection fails
    if (fs.existsSync(DB_FILE)) {
      const communities = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const c of communities) {
        if (
          !SOUTHEAST_STATE_PCODS.includes(c.stateId) &&
          !EXCLUDED_NON_IGBO_STATE_PCODS.includes(c.stateId) &&
          c.lgaId &&
          !c.lgaId.startsWith('NG032') &&
          !c.lgaId.startsWith('NG002')
        ) {
          if (['igbo', 'mixed', 'historically_igbo', 'igbo_associated'].includes(c.identityStatus)) {
            activeExternalLgaCodes.add(c.lgaId);
          }
        }
      }
    }
  }

  return NextResponse.json({
    southeastStates: SOUTHEAST_STATE_PCODS,
    activeExternalLgas: Array.from(activeExternalLgaCodes),
  });
}
