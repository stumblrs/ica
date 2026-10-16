'use client';

import { useEffect } from 'react';
import { autoSyncDeviceWithBackend } from '@/lib/device';

/**
 * Background client component that automatically fingerprints the user's browser,
 * generates a deterministic hardware SHA-256 hash, and registers the device with Supabase.
 * If the device or fingerprint was previously linked to an @username, it seamlessly restores it.
 */
export function DeviceSyncHandler() {
  useEffect(() => {
    // 1. Initial background device and fingerprint synchronization
    const timer = setTimeout(() => {
      autoSyncDeviceWithBackend(false);
    }, 1200);

    // 2. Re-verify if user returns to the tab after an extended period
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        autoSyncDeviceWithBackend(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
