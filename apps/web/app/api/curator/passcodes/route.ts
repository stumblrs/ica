import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  readCuratorPasscodes,
  writeCuratorPasscodes,
  verifyCuratorPasscode,
  type CuratorPasscode,
} from '@/lib/curator-store';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest) {
  const key = req.headers.get('x-curator-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  return verifyCuratorPasscode(key || '');
}

/**
 * GET /api/curator/passcodes
 * List all active/historical passcodes. Requires curator authentication.
 */
export async function GET(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized. Curator passcode required.' }, { status: 401 });
  }

  const passcodes = readCuratorPasscodes();
  return NextResponse.json({ passcodes });
}

/**
 * POST /api/curator/passcodes
 * Generate or create a new curator passcode.
 */
export async function POST(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized. Curator passcode required.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { customCode, label, role, expiresInDays } = body;

    // Generate random secure token if no custom code specified
    const generatedCode =
      customCode && typeof customCode === 'string' && customCode.trim()
        ? customCode.trim()
        : `ica_${crypto.randomBytes(6).toString('hex')}`;

    let expiresAt: string | null = null;
    if (typeof expiresInDays === 'number' && expiresInDays > 0) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const newPasscode: CuratorPasscode = {
      id: `pass-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: generatedCode,
      label: (label && typeof label === 'string' && label.trim()) || 'Curator Key',
      role: role === 'field_researcher' ? 'field_researcher' : 'curator',
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
    };

    const currentList = readCuratorPasscodes();
    currentList.unshift(newPasscode);
    writeCuratorPasscodes(currentList);

    return NextResponse.json({
      success: true,
      passcode: newPasscode,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create passcode: ' + err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/curator/passcodes
 * Revoke or deactivate a passcode by ID.
 */
export async function DELETE(req: NextRequest) {
  const auth = checkAuth(req);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized. Curator passcode required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Passcode id is required.' }, { status: 400 });
    }

    const currentList = readCuratorPasscodes();
    const updated = currentList.map((p) => (p.id === id ? { ...p, isActive: false } : p));
    writeCuratorPasscodes(updated);

    return NextResponse.json({ success: true, message: 'Passcode revoked successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to revoke passcode: ' + err.message }, { status: 500 });
  }
}
