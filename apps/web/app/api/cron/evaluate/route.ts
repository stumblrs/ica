import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateInquiryOutcome } from '@/lib/governance';

export const dynamic = 'force-dynamic';

/**
 * GET or POST /api/cron/evaluate
 * Automated Governance Resolution Worker
 * Evaluates all expired inquiries, tallies votes against conservation quorum & supermajority,
 * updates community lifecycle statuses, and creates immutable audit logs.
 */
async function handleEvaluate(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // SEC-05: Authenticate cron requests using CRON_SECRET
    if (process.env.NODE_ENV === 'production' || cronSecret) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing or invalid cron authorization token.' },
          { status: 401 }
        );
      }
    }

    const now = new Date();

    // Query all OPEN inquiries whose deadline has elapsed
    const expiredInquiries = await prisma.governanceInquiry.findMany({
      where: {
        status: 'OPEN',
        expiresAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        communityId: true,
        type: true,
        quorumThreshold: true,
        votesFor: true,
        votesAgainst: true,
      },
    });

    const results = [];

    for (const inq of expiredInquiries) {
      const outcome = await evaluateInquiryOutcome(inq.id);
      results.push({
        inquiryId: inq.id,
        communityId: inq.communityId,
        type: inq.type,
        evaluated: outcome.evaluated,
        resolvedState: outcome.resolvedState,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      expiredFound: expiredInquiries.length,
      evaluatedCount: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Governance evaluation worker failed: ' + err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleEvaluate(req);
}

export async function POST(req: NextRequest) {
  return handleEvaluate(req);
}
