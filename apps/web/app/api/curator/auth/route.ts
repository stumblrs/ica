import { NextRequest, NextResponse } from 'next/server';
import { verifyCuratorPasscode } from '@/lib/curator-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/curator/auth
 * Verifies master admin key or curator passcode.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    const verification = verifyCuratorPasscode(passcode);
    if (!verification.valid) {
      return NextResponse.json({ error: 'Invalid curator passcode.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      role: verification.role || 'curator',
      label: verification.label || 'Curator Session',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Auth failed: ' + err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}


