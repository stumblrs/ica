import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // SEC-06: Sanitize filter parameters against PostgREST injection
    const cleanDevId = deviceId ? deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : null;
    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`).toLowerCase() : null;
    const sanitizedHandle = cleanHandle ? cleanHandle.replace(/[^a-zA-Z0-9_@]/g, '').slice(0, 50) : null;

    // 1. Query Supabase directly first (omit recipientDeviceId from public response)
    try {
      let query = supabase
        .from('Notification')
        .select('id, recipientHandle, actorHandle, actorName, commentId, communityId, communityName, coordinates, snippet, type, isRead, createdAt')
        .order('createdAt', { ascending: false })
        .limit(30);

      if (cleanDevId && sanitizedHandle) {
        query = query.or(`recipientDeviceId.eq.${cleanDevId},recipientHandle.eq.${sanitizedHandle}`);
      } else if (cleanDevId) {
        query = query.eq('recipientDeviceId', cleanDevId);
      } else if (sanitizedHandle) {
        query = query.eq('recipientHandle', sanitizedHandle);
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
      // Fallback
    }

    // 2. Query Prisma if Supabase was unavailable
    try {
      const where: any = {};
      if (cleanDevId && sanitizedHandle) {
        where.OR = [
          { recipientDeviceId: cleanDevId },
          { recipientHandle: sanitizedHandle },
        ];
      } else if (cleanDevId) {
        where.recipientDeviceId = cleanDevId;
      } else if (sanitizedHandle) {
        where.recipientHandle = sanitizedHandle;
      }

      const dbNotifs = await prisma.notification.findMany({
        where,
        select: {
          id: true,
          recipientHandle: true,
          actorHandle: true,
          actorName: true,
          commentId: true,
          communityId: true,
          communityName: true,
          coordinates: true,
          snippet: true,
          type: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      if (dbNotifs.length > 0) {
        const parsed = dbNotifs.map((n) => ({
          ...n,
          coordinates: n.coordinates ? JSON.parse(n.coordinates) : null,
          createdAt: n.createdAt.toISOString(),
        }));
        const unreadCount = parsed.filter((n) => !n.isRead).length;
        return NextResponse.json({
          notifications: parsed,
          unreadCount,
          source: 'prisma',
        });
      }
    } catch {}

    // 3. Fallback to local file store
    const localData = getNotificationsForUser({ deviceId: cleanDevId || undefined, handle: sanitizedHandle || undefined });
    // Mask recipientDeviceId in local store output
    const safeNotifications = (localData.notifications || []).map((n: any) => {
      const { recipientDeviceId: _rd, ...safeItem } = n;
      return safeItem;
    });

    return NextResponse.json({
      notifications: safeNotifications,
      unreadCount: localData.unreadCount,
      source: 'local_store',
    });
  } catch (err: any) {
    console.error('Error in GET /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, deviceId, handle } = body;
    const cleanDevId = deviceId ? String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : null;
    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`).toLowerCase() : null;
    const sanitizedHandle = cleanHandle ? cleanHandle.replace(/[^a-zA-Z0-9_@]/g, '').slice(0, 50) : null;

    if ((action === 'mark-read' || action === 'mark_read') && id) {
      try {
        await prisma.notification.update({
          where: { id: String(id) },
          data: { isRead: true },
        });
      } catch {}

      const success = markNotificationAsRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark-all-read' || action === 'mark_all_read') {
      try {
        const where: any = {};
        if (cleanDevId && sanitizedHandle) {
          where.OR = [
            { recipientDeviceId: cleanDevId },
            { recipientHandle: sanitizedHandle },
          ];
        } else if (cleanDevId) {
          where.recipientDeviceId = cleanDevId;
        } else if (sanitizedHandle) {
          where.recipientHandle = sanitizedHandle;
        }

        await prisma.notification.updateMany({
          where,
          data: { isRead: true },
        });
      } catch {}

      const count = markAllNotificationsAsRead({ deviceId: cleanDevId || undefined, handle: sanitizedHandle || undefined });
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
