import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { Pool } from 'pg';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notification-store';

export const dynamic = 'force-dynamic';

let pgPool: Pool | null = null;
function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    pgPool = new Pool({
      connectionString: connectionString || undefined,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  }
  return pgPool;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const handle = searchParams.get('handle');

    if (!deviceId && !handle) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Sanitize filter parameters
    const cleanDevId = deviceId ? deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : null;
    const cleanHandleNoAt = handle ? handle.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50) : null;
    const cleanHandleWithAt = cleanHandleNoAt ? `@${cleanHandleNoAt}` : null;

    // Tier 1: Query Supabase directly first (omit recipientDeviceId from public response)
    try {
      let query = supabase
        .from('Notification')
        .select('id, recipientHandle, actorHandle, actorName, commentId, communityId, communityName, coordinates, snippet, type, isRead, createdAt')
        .order('createdAt', { ascending: false })
        .limit(40);

      if (cleanDevId && cleanHandleWithAt) {
        query = query.or(`recipientDeviceId.eq.${cleanDevId},recipientHandle.eq.${cleanHandleWithAt},recipientHandle.eq.${cleanHandleNoAt}`);
      } else if (cleanDevId) {
        query = query.eq('recipientDeviceId', cleanDevId);
      } else if (cleanHandleWithAt) {
        query = query.or(`recipientHandle.eq.${cleanHandleWithAt},recipientHandle.eq.${cleanHandleNoAt}`);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
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

    // Tier 2: Query Prisma if Supabase was unavailable or empty
    try {
      const where: any = {};
      const handleVariants = cleanHandleWithAt && cleanHandleNoAt ? [cleanHandleWithAt, cleanHandleNoAt] : [];
      if (cleanDevId && handleVariants.length > 0) {
        where.OR = [
          { recipientDeviceId: cleanDevId },
          { recipientHandle: { in: handleVariants } },
        ];
      } else if (cleanDevId) {
        where.recipientDeviceId = cleanDevId;
      } else if (handleVariants.length > 0) {
        where.recipientHandle = { in: handleVariants };
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
        take: 40,
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

    // Tier 2.5: Direct SQL Pool
    try {
      const pool = getPgPool();
      const res = await pool.query(
        `SELECT id, "recipientHandle", "actorHandle", "actorName", "commentId", "communityId", "communityName", coordinates, snippet, type, "isRead", "createdAt"
         FROM "Notification"
         WHERE ("recipientDeviceId" = $1 AND $1 IS NOT NULL)
            OR "recipientHandle" = $2
            OR "recipientHandle" = $3
         ORDER BY "createdAt" DESC
         LIMIT 40`,
        [cleanDevId, cleanHandleWithAt, cleanHandleNoAt]
      );

      if (res.rows.length > 0) {
        const parsed = res.rows.map((n) => ({
          ...n,
          coordinates: n.coordinates ? JSON.parse(n.coordinates) : null,
          createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : new Date(n.createdAt).toISOString(),
        }));
        const unreadCount = parsed.filter((n) => !n.isRead).length;
        return NextResponse.json({
          notifications: parsed,
          unreadCount,
          source: 'sql_pool',
        });
      }
    } catch {}

    // Tier 3: Fallback to local file store
    const localData = getNotificationsForUser({
      deviceId: cleanDevId || undefined,
      handle: cleanHandleWithAt || cleanHandleNoAt || undefined,
    });
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
    const cleanHandleNoAt = handle ? String(handle).replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50) : null;
    const cleanHandleWithAt = cleanHandleNoAt ? `@${cleanHandleNoAt}` : null;

    if ((action === 'mark-read' || action === 'mark_read') && id) {
      try {
        const pool = getPgPool();
        await pool.query('UPDATE "Notification" SET "isRead" = true WHERE id = $1', [String(id)]);
      } catch {
        try {
          await prisma.notification.update({
            where: { id: String(id) },
            data: { isRead: true },
          });
        } catch {}
      }

      markNotificationAsRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark-all-read' || action === 'mark_all_read') {
      try {
        const pool = getPgPool();
        await pool.query(
          `UPDATE "Notification" SET "isRead" = true
           WHERE ("recipientDeviceId" = $1 AND $1 IS NOT NULL)
              OR "recipientHandle" = $2
              OR "recipientHandle" = $3`,
          [cleanDevId, cleanHandleWithAt, cleanHandleNoAt]
        );
      } catch {
        try {
          const where: any = {};
          const handleVariants = cleanHandleWithAt && cleanHandleNoAt ? [cleanHandleWithAt, cleanHandleNoAt] : [];
          if (cleanDevId && handleVariants.length > 0) {
            where.OR = [
              { recipientDeviceId: cleanDevId },
              { recipientHandle: { in: handleVariants } },
            ];
          } else if (cleanDevId) {
            where.recipientDeviceId = cleanDevId;
          } else if (handleVariants.length > 0) {
            where.recipientHandle = { in: handleVariants };
          }

          await prisma.notification.updateMany({
            where,
            data: { isRead: true },
          });
        } catch {}
      }

      const count = markAllNotificationsAsRead({
        deviceId: cleanDevId || undefined,
        handle: cleanHandleWithAt || cleanHandleNoAt || undefined,
      });
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
