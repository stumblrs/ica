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

    // 1. Upsert Device in Supabase with non-null fingerprintHash and lastActiveAt
    try {
      await supabase
        .from('Device')
        .upsert({
          id: deviceId,
          fingerprintHash: cleanFingerprint,
          lastActiveAt: new Date().toISOString(),
          trustScore: 100,
        });
    } catch (sbErr: any) {
      console.warn('[DeviceSync] Supabase Device upsert error, falling back to Prisma:', sbErr.message);
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
    }

    // 2. Check if a Profile is already linked to this device or fingerprint
    let matchedProfile: any = null;

    try {
      // Direct lookup by deviceId
      const { data: profileByDevice, error: devErr } = await supabase
        .from('Profile')
        .select('*')
        .eq('deviceId', deviceId)
        .maybeSingle();

      if (!devErr && profileByDevice) {
        matchedProfile = profileByDevice;
      } else if (cleanFingerprint) {
        // Fallback: lookup by hardware fingerprint hash
        const { data: profileByFp, error: fpErr } = await supabase
          .from('Profile')
          .select('*')
          .eq('fingerprintHash', cleanFingerprint)
          .maybeSingle();

        if (!fpErr && profileByFp) {
          matchedProfile = profileByFp;
        }
      }
    } catch (err: any) {
      console.warn('[DeviceSync] Profile lookup error:', err.message);
    }

    // Fallback to local profile store if Supabase returned nothing
    if (!matchedProfile) {
      const localProfile = getProfileByDeviceId(deviceId);
      if (localProfile) {
        matchedProfile = localProfile;
      }
    }

    // 3. If a profile exists, ensure its fingerprintHash and deviceId are linked
    if (matchedProfile && cleanFingerprint && !matchedProfile.fingerprintHash) {
      try {
        await supabase
          .from('Profile')
          .update({ fingerprintHash: cleanFingerprint })
          .eq('deviceId', matchedProfile.deviceId);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      deviceId,
      fingerprintHash: cleanFingerprint,
      profile: matchedProfile || null,
      message: matchedProfile
        ? `Device verified and linked to @${matchedProfile.username}.`
        : 'Device and browser fingerprint registered anonymously.',
    });
  } catch (error: any) {
    console.error('[DeviceSync] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
