'use client';

const DEVICE_ID_KEY = 'ica_client_device_id';
const DEVICE_VOTES_KEY = 'ica_client_votes';
const DEVICE_PETITIONS_KEY = 'ica_client_petitions';

/**
 * Returns a stable, anonymous unique client Device ID stored in localStorage.
 * Used for registration-free community governance, rate limiting, and anti-duplicate voting.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'srv-anonymous';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate RFC4122 v4 UUID
    deviceId = 'dev_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Check if the current device has already voted on a specific inquiry.
 */
export function hasDeviceVoted(inquiryId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    return Boolean(votes[inquiryId]);
  } catch {
    return false;
  }
}

/**
 * Get the vote choice ('FOR' | 'AGAINST') if this device already voted on the inquiry.
 */
export function getDeviceVote(inquiryId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    return votes[inquiryId] || null;
  } catch {
    return null;
  }
}

/**
 * Record a vote locally on this device.
 */
export function recordDeviceVote(inquiryId: string, choice: 'FOR' | 'AGAINST'): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_VOTES_KEY);
    const votes: Record<string, string> = raw ? JSON.parse(raw) : {};
    votes[inquiryId] = choice;
    localStorage.setItem(DEVICE_VOTES_KEY, JSON.stringify(votes));
  } catch {
    /* ignore */
  }
}

/**
 * Check if the device has created a petition for a community within the 24-hr cooldown.
 */
export function getDevicePetitionCooldown(communityId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DEVICE_PETITIONS_KEY);
    const petitions: Record<string, number> = raw ? JSON.parse(raw) : {};
    const timestamp = petitions[communityId];
    if (!timestamp) return false;
    const elapsed = Date.now() - timestamp;
    return elapsed < 24 * 60 * 60 * 1000; // 24 hours cooldown
  } catch {
    return false;
  }
}

/**
 * Record a petition submission for cooldown calculation.
 */
export function recordDevicePetition(communityId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEVICE_PETITIONS_KEY);
    const petitions: Record<string, number> = raw ? JSON.parse(raw) : {};
    petitions[communityId] = Date.now();
    localStorage.setItem(DEVICE_PETITIONS_KEY, JSON.stringify(petitions));
  } catch {
    /* ignore */
  }
}
