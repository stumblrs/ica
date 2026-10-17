import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';
import { getProfileByDeviceId, saveProfileForDevice } from '@/lib/profile-store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, fingerprintHash } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required.' }, { status: 400 });
    }

    const cleanFingerprint = fingerprintHash && String(fingerprintHash).startsWith('fp_')
      ? String(fingerprintHash)
      : null;

    // 1. Upsert Device via Prisma
    try {
      await prisma.device.upsert({
        where: { id: deviceId },
        update: {
          fingerprintHash: cleanFingerprint,
          lastActiveAt: new Date(),
        },
        create: {
          id: deviceId,
          fingerprintHash: cleanFingerprint,
          trustScore: 100,
          lastActiveAt: new Date(),
        },
      });
    } catch (prismaErr: any) {
      console.warn('[DeviceSync] Prisma Device upsert error:', prismaErr.message);
    }

    // 2. Check if a Profile is already linked to this device or fingerprint
    let matchedProfile: any = null;

    try {
      // Direct lookup by deviceId via Prisma
      matchedProfile = await prisma.profile.findUnique({
        where: { deviceId },
      });

      if (!matchedProfile && cleanFingerprint) {
        // Fallback: lookup by hardware fingerprint hash
        matchedProfile = await prisma.profile.findFirst({
          where: { fingerprintHash: cleanFingerprint },
        });
      }
    } catch (err: any) {
      console.warn('[DeviceSync] Profile lookup error:', err.message);
    }

    // Fallback to local profile store if Prisma returned nothing
    if (!matchedProfile) {
      const localProfile = getProfileByDeviceId(deviceId);
      if (localProfile) {
        matchedProfile = localProfile;
      }
    }

    // 3. If a profile exists, ensure its fingerprintHash and deviceId are linked
    if (matchedProfile && cleanFingerprint && !matchedProfile.fingerprintHash) {
      try {
        await prisma.profile.update({
          where: { deviceId: matchedProfile.deviceId },
          data: { fingerprintHash: cleanFingerprint },
        });
      } catch {}
    }

    // Strip sensitive fingerprint hash from profile before returning
    const safeProfile = matchedProfile ? {
      deviceId: matchedProfile.deviceId,
      username: matchedProfile.username,
      displayName: matchedProfile.displayName,
      homeTown: matchedProfile.homeTown,
      stateOfOrigin: matchedProfile.stateOfOrigin,
      kindredClan: matchedProfile.kindredClan,
      bio: matchedProfile.bio,
      avatarSymbol: matchedProfile.avatarSymbol,
      role: matchedProfile.role,
      createdAt: matchedProfile.createdAt,
      updatedAt: matchedProfile.updatedAt,
    } : null;

    return NextResponse.json({
      success: true,
      deviceId,
      verified: true,
      profile: safeProfile,
      message: safeProfile
        ? `Device verified and linked to @${safeProfile.username}.`
        : 'Device and browser identity verified anonymously.',
    });
  } catch (error: any) {
    console.error('[DeviceSync] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
