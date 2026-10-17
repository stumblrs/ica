import fs from 'node:fs';
import path from 'node:path';
import { cleanUsername } from '@/lib/profile-store';

export interface StoredNotification {
  id: string;
  recipientDeviceId?: string | null;
  recipientHandle: string; // e.g. "@salamander"
  actorHandle: string; // e.g. "@okafor_native"
  actorName: string; // e.g. "Chidi Okafor"
  commentId: string;
  communityId: string;
  communityName: string;
  coordinates?: [number, number];
  snippet: string; // Preview of the comment or citation
  type: 'citation' | 'mention';
  createdAt: string;
  isRead: boolean;
}

export function getNotificationCandidatePaths(): string[] {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      path.resolve(cwd, 'apps/web/.data/notifications_store.json'),
      path.resolve(cwd, '.data/notifications_store.json'),
      path.resolve(cwd, '../.data/notifications_store.json'),
      path.resolve(__dirname, '../../.data/notifications_store.json'),
      path.resolve(__dirname, '../../../.data/notifications_store.json'),
    ])
  );
}

export function findExistingNotificationStorePath(): string | null {
  for (const p of getNotificationCandidatePaths()) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function readNotificationsStore(): StoredNotification[] {
  const existingPath = findExistingNotificationStorePath();
  if (!existingPath) return [];

  try {
    const raw = fs.readFileSync(existingPath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.error(`[NotificationStore] Failed reading notifications:`, err.message);
    return [];
  }
}

export function writeNotificationsStore(notifications: StoredNotification[]): boolean {
  // On serverless / Vercel production, local filesystem is read-only.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const cwd = process.cwd();
  const existing = findExistingNotificationStorePath();
  const target = existing || path.resolve(cwd, '.data/notifications_store.json');

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(notifications, null, 2), 'utf8');
    return true;
  } catch (err: any) {
    console.warn(`[NotificationStore] Local write disabled:`, err.message);
    return false;
  }
}

/**
 * Creates an in-app notification when a user cites another comment or mentions someone
 */
export function createNotification(params: {
  recipientDeviceId?: string | null;
  recipientHandle: string;
  actorHandle: string;
  actorName: string;
  commentId: string;
  communityId: string;
  communityName: string;
  coordinates?: [number, number];
  snippet: string;
  type?: 'citation' | 'mention';
}): StoredNotification {
  const notifications = readNotificationsStore();

  const cleanRecipient = cleanUsername(params.recipientHandle);
  const cleanActor = cleanUsername(params.actorHandle);

  // Avoid self-notification
  if (cleanRecipient && cleanActor && cleanRecipient === cleanActor) {
    return null as any;
  }

  const notification: StoredNotification = {
    id: 'ntf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    recipientDeviceId: params.recipientDeviceId || null,
    recipientHandle: cleanRecipient ? `@${cleanRecipient}` : params.recipientHandle,
    actorHandle: cleanActor ? `@${cleanActor}` : params.actorHandle,
    actorName: params.actorName.trim() || 'Contributor',
    commentId: params.commentId,
    communityId: params.communityId,
    communityName: params.communityName,
    coordinates: params.coordinates,
    snippet: params.snippet.slice(0, 180),
    type: params.type || 'citation',
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  notifications.unshift(notification);
  // Keep last 500 notifications max
  if (notifications.length > 500) {
    notifications.length = 500;
  }
  writeNotificationsStore(notifications);

  return notification;
}

/**
 * Returns notifications for a device or handle
 */
export function getNotificationsForUser(params: {
  deviceId?: string | null;
  handle?: string | null;
}): { notifications: StoredNotification[]; unreadCount: number } {
  const notifications = readNotificationsStore();
  const cleanHandle = params.handle ? cleanUsername(params.handle) : null;
  const targetHandleFormatted = cleanHandle ? `@${cleanHandle}` : null;

  const userNotifications = notifications.filter((n) => {
    if (params.deviceId && n.recipientDeviceId && n.recipientDeviceId === params.deviceId) {
      return true;
    }
    if (targetHandleFormatted && n.recipientHandle.toLowerCase() === targetHandleFormatted.toLowerCase()) {
      return true;
    }
    return false;
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  return {
    notifications: userNotifications,
    unreadCount,
  };
}

/**
 * Mark a notification as read
 */
export function markNotificationAsRead(id: string): boolean {
  const notifications = readNotificationsStore();
  const found = notifications.find((n) => n.id === id);
  if (found) {
    found.isRead = true;
    writeNotificationsStore(notifications);
    return true;
  }
  return false;
}

/**
 * Mark all notifications as read for a user
 */
export function markAllNotificationsAsRead(params: {
  deviceId?: string | null;
  handle?: string | null;
}): number {
  const notifications = readNotificationsStore();
  const cleanHandle = params.handle ? cleanUsername(params.handle) : null;
  const targetHandleFormatted = cleanHandle ? `@${cleanHandle}` : null;

  let markedCount = 0;
  notifications.forEach((n) => {
    const isForUser =
      (params.deviceId && n.recipientDeviceId === params.deviceId) ||
      (targetHandleFormatted && n.recipientHandle.toLowerCase() === targetHandleFormatted.toLowerCase());

    if (isForUser && !n.isRead) {
      n.isRead = true;
      markedCount++;
    }
  });

  if (markedCount > 0) {
    writeNotificationsStore(notifications);
  }

  return markedCount;
}
