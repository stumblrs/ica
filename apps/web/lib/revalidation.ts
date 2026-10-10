import { revalidatePath } from 'next/cache';

/**
 * Revalidates public Atlas cached routes whenever settlements or kindred landmarks change.
 */
export function revalidateAtlasData() {
  try {
    revalidatePath('/api/map/communities.geojson');
    revalidatePath('/api/communities');
    revalidatePath('/api/landmarks');
    revalidatePath('/');
  } catch (err) {
    // Graceful fallback if invoked outside of request context or in static worker
    console.warn('[revalidateAtlasData] Path revalidation error (non-fatal):', err);
  }
}
