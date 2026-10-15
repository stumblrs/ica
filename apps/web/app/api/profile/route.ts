import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import {
  getProfileByDeviceId,
  saveProfileForDevice,
  readProfilesStore,
  checkUsernameAvailability,
  cleanUsername,
  RESERVED_USERNAMES,
  type StoredUserProfile,
} from '@/lib/profile-store';

export const dynamic = 'force-dynamic';

// Micro-cache for username availability checks to prevent Supabase egress exhaustion
interface CacheEntry {
  available: boolean;
  isSelf: boolean;
  reason?: string;
  timestamp: number;
}
const usernameCheckCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000; // 15 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkUsername = searchParams.get('checkUsername');
  const deviceId = searchParams.get('deviceId');
  const username = searchParams.get('username')?.toLowerCase().replace(/^@+/, '').trim();

  try {
    // 1. Real-time Username Availability Check (with batch/egress caching)
    if (checkUsername !== null) {
      const targetHandle = cleanUsername(checkUsername);
      const cacheKey = `${targetHandle}:${deviceId || ''}`;
      const now = Date.now();

      const cached = usernameCheckCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          username: targetHandle,
          available: cached.available,
          isSelf: cached.isSelf,
          reason: cached.reason,
        });
      }

      if (RESERVED_USERNAMES.has(targetHandle)) {
        return NextResponse.json({
          username: targetHandle,
          available: false,
          isSelf: false,
          reason: `@${targetHandle} is a reserved system handle.`,
        });
      }

      let isAvailable = true;
      let isSelf = false;
      let reason = `@${targetHandle} is available!`;

      // Check Supabase first
      try {
        const { data: existing, error } = await supabase
          .from('Profile')
          .select('deviceId, username')
          .eq('username', targetHandle)
          .maybeSingle();

        if (!error && existing) {
          if (deviceId && existing.deviceId === deviceId) {
            isSelf = true;
            isAvailable = true;
            reason = `@${targetHandle} is already registered to your device.`;
          } else {
            isAvailable = false;
            reason = `@${targetHandle} is already registered by another contributor.`;
          }
        }
      } catch (sbErr) {
        // Fallback to local store
        const fileCheck = checkUsernameAvailability(targetHandle, deviceId || undefined);
        isAvailable = fileCheck.available;
        isSelf = Boolean(fileCheck.isSelf);
        reason = fileCheck.reason || (isAvailable ? `@${targetHandle} is available!` : `@${targetHandle} is taken.`);
      }

      // Store in micro-cache
      usernameCheckCache.set(cacheKey, {
        available: isAvailable,
        isSelf,
        reason,
        timestamp: now,
      });

      return NextResponse.json({
        username: targetHandle,
        available: isAvailable,
        isSelf,
        reason,
      });
    }

    // 2. By Device ID lookup
    if (deviceId) {
      // Try Supabase Profile first
      try {
        const { data: sbProfile, error } = await supabase
          .from('Profile')
          .select('deviceId, username, displayName, homeTown, stateOfOrigin, kindredClan, bio, avatarSymbol, role, createdAt, updatedAt')
          .eq('deviceId', deviceId)
          .maybeSingle();

        if (!error && sbProfile) {
          return NextResponse.json({
            ...sbProfile,
            autoSignContributions: true,
          });
        }
      } catch {}

      // Fallback to local file store
      const fileProfile = getProfileByDeviceId(deviceId);
      if (fileProfile) {
        return NextResponse.json(fileProfile);
      }
    }

    // 3. By Username lookup
    if (username) {
      try {
        const { data: sbProfile, error } = await supabase
          .from('Profile')
          .select('deviceId, username, displayName, homeTown, stateOfOrigin, kindredClan, bio, avatarSymbol, role, createdAt, updatedAt')
          .eq('username', cleanUsername(username))
          .maybeSingle();

        if (!error && sbProfile) {
          return NextResponse.json(sbProfile);
        }
      } catch {}

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

    // 1. Validate unique handle in Supabase
    if (cleanHandle) {
      if (RESERVED_USERNAMES.has(cleanHandle)) {
        return NextResponse.json(
          { error: `@${cleanHandle} is a reserved system handle.` },
          { status: 400 }
        );
      }

      try {
        const { data: existing, error } = await supabase
          .from('Profile')
          .select('deviceId, username')
          .eq('username', cleanHandle)
          .maybeSingle();

        if (!error && existing && existing.deviceId !== deviceId) {
          return NextResponse.json(
            {
              error: `The handle @${cleanHandle} is already taken by another contributor. Please choose a different username.`,
              isTaken: true,
              username: cleanHandle,
            },
            { status: 409 }
          );
        }
      } catch {
        const check = checkUsernameAvailability(cleanHandle, deviceId);
        if (!check.available && !check.isSelf) {
          return NextResponse.json(
            {
              error: `The handle @${cleanHandle} is already taken by another contributor.`,
              isTaken: true,
              username: cleanHandle,
            },
            { status: 409 }
          );
        }
      }
    }

    const targetDisplayName = displayName ? String(displayName).trim() : cleanHandle ? `@${cleanHandle}` : 'Contributor';
    const targetAvatar = avatarSymbol || 'ọ';
    const targetRole = role || 'Native Contributor';
    const targetTown = homeTown ? String(homeTown).trim() : null;
    const targetState = stateOfOrigin ? String(stateOfOrigin).trim() : null;
    const targetClan = kindredClan ? String(kindredClan).trim() : null;
    const targetBio = bio ? String(bio).trim() : null;

    // 2. Persist to Supabase Profile table
    let savedProfile: any = null;
    try {
      const { data: sbSaved, error: sbErr } = await supabase
        .from('Profile')
        .upsert({
          deviceId,
          username: cleanHandle,
          displayName: targetDisplayName,
          homeTown: targetTown,
          stateOfOrigin: targetState,
          kindredClan: targetClan,
          bio: targetBio,
          avatarSymbol: targetAvatar,
          role: targetRole,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (!sbErr && sbSaved) {
        savedProfile = sbSaved;
      }
    } catch (err: any) {
      console.warn('[ProfileAPI] Supabase Profile upsert failed, falling back to local file store:', err.message);
    }

    // 3. Also update Device table in Supabase / Prisma
    try {
      await supabase.from('Device').upsert({ id: deviceId, trustScore: 100 }).select();
    } catch {}

    // 4. Mirror to local file store as offline backup
    try {
      const fileSaved = saveProfileForDevice(deviceId, {
        deviceId,
        username: cleanHandle,
        displayName: targetDisplayName,
        homeTown: targetTown || '',
        stateOfOrigin: targetState || '',
        kindredClan: targetClan || '',
        bio: targetBio || '',
        avatarSymbol: targetAvatar,
        role: targetRole,
        autoSignContributions: autoSignContributions ?? true,
      });
      if (!savedProfile) savedProfile = fileSaved;
    } catch {}

    // Clear username check micro-cache for this handle
    if (cleanHandle) {
      usernameCheckCache.delete(`${cleanHandle}:${deviceId}`);
      usernameCheckCache.delete(`${cleanHandle}:`);
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...savedProfile,
        autoSignContributions: autoSignContributions ?? true,
      },
      message: 'Profile successfully linked to device and synchronized globally.',
    });
  } catch (error: any) {
    console.error('Error saving profile in POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
