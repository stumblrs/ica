import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getProfileByDeviceId,
  saveProfileForDevice,
  readProfilesStore,
  checkUsernameAvailability,
  cleanUsername,
  type StoredUserProfile,
} from '@/lib/profile-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkUsername = searchParams.get('checkUsername');
  const deviceId = searchParams.get('deviceId');
  const username = searchParams.get('username')?.toLowerCase().replace(/^@+/, '').trim();

  try {
    // 1. Real-time Username Availability Check
    if (checkUsername !== null) {
      const targetHandle = cleanUsername(checkUsername);
      const result = checkUsernameAvailability(targetHandle, deviceId || undefined);
      return NextResponse.json({
        username: targetHandle,
        available: result.available,
        isSelf: result.isSelf,
        reason: result.reason,
      });
    }

    // 2. By Device ID lookup
    if (deviceId) {
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

    // 3. By Username lookup
    if (username) {
      const allProfiles = readProfilesStore();
      const match = Object.values(allProfiles).find(
        (p) => cleanUsername(p.username) === cleanUsername(username)
      );
      if (match) {
        return NextResponse.json(match);
      }
    }

    return NextResponse.json({ profile: null }, { status: 404 });
  } catch (error: any) {
    console.error('Error in profile API GET:', error);
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
      return NextResponse.json(
        { error: 'Device ID is required to bind profile.' },
        { status: 400 }
      );
    }

    const cleanHandle = username ? cleanUsername(username) : '';

    // 1. Validate global unique handle if username is provided
    if (cleanHandle) {
      const check = checkUsernameAvailability(cleanHandle, deviceId);
      if (!check.available && !check.isSelf) {
        return NextResponse.json(
          {
            error: `The handle @${cleanHandle} is already taken by another contributor. Please choose a different username.`,
            isTaken: true,
            username: cleanHandle,
          },
          { status: 409 }
        );
      }
    }

    // 2. Save to persistent offline-first profile store
    let savedProfile: StoredUserProfile;
    try {
      savedProfile = saveProfileForDevice(deviceId, {
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
    } catch (saveErr: any) {
      return NextResponse.json(
        { error: saveErr.message || 'Failed saving profile.' },
        { status: 409 }
      );
    }

    // 3. Upsert in PostgreSQL Prisma Device model if reachable
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
    console.error('Error saving profile in POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
