import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateAtlasData } from '@/lib/revalidation';

/**
 * GET /api/communities - List and filter communities from Supabase
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const state = searchParams.get('state')?.trim();
    const status = searchParams.get('status')?.trim();
    const lifecycle = searchParams.get('lifecycle')?.trim();

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { lgaName: { contains: q, mode: 'insensitive' } },
        { stateName: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (state) {
      where.OR = [
        ...(where.OR || []),
        { stateName: { equals: state, mode: 'insensitive' } },
        { stateId: { equals: state, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.verificationStatus = status;
    }

    if (lifecycle && lifecycle !== 'all') {
      if (lifecycle === 'active') {
        where.lifecycleStatus = 'ACTIVE';
      } else if (lifecycle === 'delisted' || lifecycle === 'dormant') {
        where.lifecycleStatus = 'DELISTED';
      } else if (lifecycle === 'contested') {
        where.lifecycleStatus = { in: ['CONTESTED_DELIST', 'CONTESTED_REINSTATE'] };
      }
    }

    const communities = await prisma.community.findMany({
      where,
      orderBy: [{ confidence: 'desc' }, { name: 'asc' }],
    });

    const parsed = communities.map((c) => ({
      ...c,
      evidence: c.evidenceJson ? JSON.parse(c.evidenceJson) : [],
    }));

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Database query error in /api/communities:', err);
    return NextResponse.json([], {
      status: 200,
      headers: {
        'x-db-status': 'fallback',
        'x-db-error': err.message || 'Database unavailable',
      },
    });
  }
}

/**
 * POST /api/communities - Create new community contribution
 * Authoritatively resolves administrative geography and persists to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      description,
      latitude,
      longitude,
      identityStatus,
      languageStatus,
      historicalStatus,
      evidence,
    } = body;

    if (!name || !type || latitude == null || longitude == null || !identityStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, latitude, longitude, identityStatus' },
        { status: 400 }
      );
    }

    // Call internal administrative resolver
    const resolveRes = await fetch(new URL('/api/spatial/resolve-admin', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longitude, latitude }),
    });

    if (!resolveRes.ok) {
      const errData = await resolveRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || 'Failed to resolve authoritative administrative boundaries.' },
        { status: resolveRes.status }
      );
    }

    const resolveData = await resolveRes.json();
    if (resolveData.ambiguous) {
      return NextResponse.json(
        {
          error: 'Location falls on an ambiguous boundary. Please confirm exact point.',
          candidates: resolveData.candidates,
        },
        { status: 409 }
      );
    }

    // Guard against erroneous states (Section 12.1 integrity)
    if (
      resolveData.state.code === 'NG032' ||
      resolveData.state.name?.toLowerCase().includes('plateau') ||
      resolveData.state.code === 'NG002' ||
      resolveData.state.name?.toLowerCase().includes('adamawa')
    ) {
      return NextResponse.json(
        { error: 'Specified coordinates fall within Plateau or Adamawa State, which are outside the Igbo cultural baseline and borderland contact zones.' },
        { status: 422 }
      );
    }

    const deviceId = req.headers.get('x-device-id') || body.deviceId || null;

    // Ensure client device profile exists if deviceId is provided
    if (deviceId) {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: { lastActiveAt: new Date() },
        create: { id: deviceId, trustScore: 100 },
      });
    }

    const newRecord = await prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          id: 'comm-' + Date.now(),
          name: name.trim(),
          type,
          description: description?.trim() || null,
          latitude,
          longitude,
          stateId: resolveData.state.code,
          stateName: resolveData.state.name,
          lgaId: resolveData.lga.code,
          lgaName: resolveData.lga.name,
          identityStatus,
          languageStatus: languageStatus?.trim() || null,
          historicalStatus: historicalStatus?.trim() || null,
          verificationStatus: 'pending', // Defaults to pending
          lifecycleStatus: 'ACTIVE',
          confidence: 0.5,
          evidenceJson: evidence
            ? JSON.stringify([
                {
                  id: 'ev-' + Date.now(),
                  sourceType: evidence.sourceType,
                  citationOrUrl: evidence.citationOrUrl || null,
                  description: evidence.description,
                  isVerified: false,
                },
              ])
            : null,
          confirmationsCount: 0,
          challengesCount: 0,
        },
      });

      await tx.communityAuditLog.create({
        data: {
          communityId: community.id,
          deviceId: deviceId || null,
          action: 'CREATED',
          summary: `Community submission '${community.name}' registered for verification in ${community.lgaName}, ${community.stateName}.`,
        },
      });

      return community;
    });

    revalidateAtlasData();

    return NextResponse.json(
      {
        ...newRecord,
        evidence: newRecord.evidenceJson ? JSON.parse(newRecord.evidenceJson) : [],
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
