import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health
 * Comprehensive backend health check, database connectivity check,
 * and atlas statistics dashboard.
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // 1. Check DB connectivity & measure latency
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbPingStart;

    // 2. Fetch atlas metrics
    const [
      totalCommunities,
      activeCommunities,
      delistedCommunities,
      contestedCommunities,
      openInquiries,
      totalComments,
      communitiesWithLandmarks,
    ] = await Promise.all([
      prisma.community.count(),
      prisma.community.count({ where: { lifecycleStatus: 'ACTIVE' } }),
      prisma.community.count({ where: { lifecycleStatus: 'DELISTED' } }),
      prisma.community.count({
        where: { lifecycleStatus: { in: ['CONTESTED_DELIST', 'CONTESTED_REINSTATE'] } },
      }),
      prisma.governanceInquiry.count({ where: { status: 'OPEN' } }),
      prisma.comment.count(),
      prisma.community.findMany({
        where: { evidenceJson: { contains: 'kindredLandmarks' } },
        select: { evidenceJson: true },
      }),
    ]);

    // Count total kindred landmarks
    let totalKindredLandmarks = 0;
    for (const c of communitiesWithLandmarks) {
      if (c.evidenceJson) {
        try {
          const parsed = JSON.parse(c.evidenceJson);
          if (Array.isArray(parsed.kindredLandmarks)) {
            totalKindredLandmarks += parsed.kindredLandmarks.length;
          }
        } catch {
          // Skip
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: totalDurationMs,
      database: {
        status: 'connected',
        latencyMs: dbLatencyMs,
      },
      atlas: {
        totalCommunities,
        activeCommunities,
        delistedCommunities,
        contestedCommunities,
        openInquiries,
        totalComments,
        totalKindredLandmarks,
      },
      environment: process.env.NODE_ENV || 'production',
      version: '1.3.0',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err.message,
        database: {
          status: 'error',
          error: err.message,
        },
      },
      { status: 503 }
    );
  }
}
