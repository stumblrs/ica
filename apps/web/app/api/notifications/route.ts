import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notification-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const handle = searchParams.get('handle');

    if (!deviceId && !handle) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`).toLowerCase() : null;

    // 1. Query Supabase directly first
    try {
      let query = supabase
        .from('Notification')
        .select('id, recipientDeviceId, recipientHandle, actorHandle, actorName, commentId, communityId, communityName, coordinates, snippet, type, isRead, createdAt')
        .order('createdAt', { ascending: false })
        .limit(30);

      if (deviceId && cleanHandle) {
        query = query.or(`recipientDeviceId.eq.${deviceId},recipientHandle.eq.${cleanHandle}`);
      } else if (deviceId) {
        query = query.eq('recipientDeviceId', deviceId);
      } else if (cleanHandle) {
        query = query.eq('recipientHandle', cleanHandle);
      }

      const { data, error } = await query;

      if (!error && data) {
        const parsed = data.map((n) => ({
          ...n,
          coordinates: typeof n.coordinates === 'string' ? JSON.parse(n.coordinates) : n.coordinates,
        }));
        const unreadCount = parsed.filter((n) => !n.isRead).length;

        return NextResponse.json({
          notifications: parsed,
          unreadCount,
          source: 'supabase',
        });
      }
    } catch (sbErr) {
      // Fallback to local store
    }

    // 2. Fallback to local file store
    const localData = getNotificationsForUser({ deviceId: deviceId || undefined, handle: handle || undefined });
    return NextResponse.json({ ...localData, source: 'local_store' });
  } catch (err: any) {
    console.error('Error in GET /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, deviceId, handle } = body;
    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`).toLowerCase() : null;

    if ((action === 'mark-read' || action === 'mark_read') && id) {
      // Update Supabase
      try {
        await supabase
          .from('Notification')
          .update({ isRead: true })
          .eq('id', id);
      } catch {}

      // Update local store
      const success = markNotificationAsRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark-all-read' || action === 'mark_all_read') {
      // Update Supabase
      try {
        let updateQuery = supabase.from('Notification').update({ isRead: true });
        if (deviceId && cleanHandle) {
          updateQuery = updateQuery.or(`recipientDeviceId.eq.${deviceId},recipientHandle.eq.${cleanHandle}`);
        } else if (deviceId) {
          updateQuery = updateQuery.eq('recipientDeviceId', deviceId);
        } else if (cleanHandle) {
          updateQuery = updateQuery.eq('recipientHandle', cleanHandle);
        }
        await updateQuery;
      } catch {}

      // Update local store
      const count = markAllNotificationsAsRead({ deviceId, handle });
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
