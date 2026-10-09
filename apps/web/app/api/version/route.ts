import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const versionInfo = {
    version: '1.2.0',
    buildTimestamp: new Date().toISOString(),
    highlights: [
      'Hybrid Conservation Governance Model (25/35/50/75 Quorums & 80% Delisting Supermajority)',
      '3D DEM Terrain Mesh, Atmospheric Sky, & Volumetric Settlements',
      'Traditional 4-Day Market Cycle & Strict Dialect Parity across all 7 Continua',
      'Pluralistic Heritage Evidence & Reversible Lifecycle Archiving',
    ],
  };

  return NextResponse.json(versionInfo, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
