import { NextRequest, NextResponse } from 'next/server';
import {
  readCuratorSettings,
  writeCuratorSettings,
  verifyCuratorPasscode,
} from '@/lib/curator-store';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-curator-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  return verifyCuratorPasscode(key || '');
}

/**
 * GET /api/curator/settings
 * Publicly exposes current contribution gates and maintenance mode status.
 */
export async function GET() {
  const settings = readCuratorSettings();
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * PUT /api/curator/settings
 * Update settings (e.g. toggle public contributions kill-switch). Requires curator auth.
 */
export async function PUT(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized. Curator passcode required.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { publicSubmissionsEnabled, moderationMode, curatorOnlyModeNotice } = body;

    const updated = writeCuratorSettings({
      ...(typeof publicSubmissionsEnabled === 'boolean' ? { publicSubmissionsEnabled } : {}),
      ...(moderationMode ? { moderationMode } : {}),
      ...(curatorOnlyModeNotice ? { curatorOnlyModeNotice } : {}),
    });

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update settings: ' + err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
