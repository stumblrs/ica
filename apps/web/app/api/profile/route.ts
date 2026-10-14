import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getProfileByDeviceId,
  saveProfileForDevice,
  readProfilesStore,
  type StoredUserProfile,
} from '@/lib/profile-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const username = searchParams.get('username')?.toLowerCase().replace(/^@+/, '').trim();

  try {
    // 1. By Device ID lookup
    if (deviceId) {
      // Check file store first or fallback
      const fileProfile = getProfileByDeviceId(deviceId);

      // Attempt Prisma lookup if online
      try {
        const device = await prisma.device.findUnique({
          where: { id: deviceId },
        });

        if (device && fileProfile) {
          return NextResponse.json({ ...fileProfile, trustScore: device.trustScore });
        }
      } catch {
        // Postgres offline - proceed with fileProfile
      }

      if (fileProfile) {
        return NextResponse.json(fileProfile);
      }
    }

    // 2. By Username lookup
    if (username) {
      const allProfiles = readProfilesStore();
      const match = Object.values(allProfiles).find(
        (p) => p.username?.toLowerCase() === username
      );
      if (match) {
        return NextResponse.json(match);
      }
    }

    return NextResponse.json({ profile: null }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deviceId,
      username,
      displayName,
      homeTown,
      stateOfOrigin,
      kindredClan,
      bio,
      avatarSymbol,
      role,
      autoSignContributions,
    } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required to bind profile.' }, { status: 400 });
    }

    const cleanHandle = username
      ? username.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '').slice(0, 30)
      : '';

    // 1. Save to persistent offline-first profile store
    const savedProfile = saveProfileForDevice(deviceId, {
      deviceId,
      username: cleanHandle,
      displayName: displayName ? String(displayName).trim() : '',
      homeTown: homeTown ? String(homeTown).trim() : '',
      stateOfOrigin: stateOfOrigin ? String(stateOfOrigin).trim() : '',
      kindredClan: kindredClan ? String(kindredClan).trim() : '',
      bio: bio ? String(bio).trim() : '',
      avatarSymbol: avatarSymbol || 'ọ',
      role: role || 'Native Contributor',
      autoSignContributions: autoSignContributions ?? true,
    });

    // 2. Upsert in PostgreSQL Prisma Device model if reachable
    try {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: {
          lastActiveAt: new Date(),
        },
        create: {
          id: deviceId,
          trustScore: 100,
        },
      });
    } catch (err: any) {
      console.warn(`[ProfileAPI] PostgreSQL offline (${err.message}). Profile safely persisted in profiles_store.json.`);
    }

    return NextResponse.json({
      success: true,
      profile: savedProfile,
      message: 'Profile successfully linked to device and synced to backend.',
    });
  } catch (error: any) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
