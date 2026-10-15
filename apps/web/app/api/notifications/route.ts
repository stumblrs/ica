import { NextRequest, NextResponse } from 'next/server';
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

    const data = getNotificationsForUser({ deviceId, handle });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in GET /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, deviceId, handle } = body;

    if ((action === 'mark-read' || action === 'mark_read') && id) {
      const success = markNotificationAsRead(id);
      return NextResponse.json({ success });
    }

    if (action === 'mark-all-read' || action === 'mark_all_read') {
      const count = markAllNotificationsAsRead({ deviceId, handle });
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/notifications:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
