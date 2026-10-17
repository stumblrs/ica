import fs from 'node:fs';
import path from 'node:path';
import { readCommunityStore } from '@/lib/community-store';

export interface StoredComment {
  id: string;
  communityId: string;
  communityName: string;
  lgaName?: string;
  stateName?: string;
  coordinates: [number, number];
  deviceId?: string | null;
  authorName: string;
  handle?: string;
  affiliation?: string;
  category: string;
  comment: string;
  likes: number;
  createdAt: string;
}

export function getCommentCandidatePaths(): string[] {
  const cwd = process.cwd();
  return Array.from(
    new Set([
      path.resolve(cwd, 'apps/web/.data/comments_store.json'),
      path.resolve(cwd, '.data/comments_store.json'),
      path.resolve(cwd, '../.data/comments_store.json'),
      path.resolve(__dirname, '../../.data/comments_store.json'),
      path.resolve(__dirname, '../../../.data/comments_store.json'),
    ])
  );
}

export function findExistingCommentStorePath(): string | null {
  for (const p of getCommentCandidatePaths()) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function readCommentsStore(): StoredComment[] {
  const existingPath = findExistingCommentStorePath();
  if (!existingPath) return [];

  try {
    const raw = fs.readFileSync(existingPath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.error(`[CommentStore] Failed reading comments from ${existingPath}:`, err.message);
    return [];
  }
}

export function writeCommentsStore(comments: StoredComment[]): boolean {
  // On serverless / Vercel production, local filesystem is read-only.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const cwd = process.cwd();
  const existing = findExistingCommentStorePath();
  const target = existing || path.resolve(cwd, '.data/comments_store.json');

  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(comments, null, 2), 'utf8');
    return true;
  } catch (err: any) {
    console.warn(`[CommentStore] Local write disabled:`, err.message);
    return false;
  }
}

/**
 * Saves a new comment to the store, enriching it with community metadata if available
 */
export function saveCommentToStore(item: {
  communityId: string;
  authorName?: string;
  handle?: string;
  comment: string;
  category?: string;
  affiliation?: string;
  deviceId?: string | null;
  location?: string;
}): StoredComment {
  const comments = readCommentsStore();

  // Try to find community info from communities_store
  const communities = readCommunityStore();
  const matchedComm = communities.find(
    (c) => c.id === item.communityId || c.name.toLowerCase() === item.communityId.toLowerCase()
  );

  const author = item.authorName?.trim() || 'Anonymous Resident';
  const handle = item.handle?.trim()
    ? (item.handle.trim().startsWith('@') ? item.handle.trim() : `@${item.handle.trim()}`)
    : `@${author.toLowerCase().replace(/[^a-z0-9]/g, '') || 'resident'}`;

  const newComment: StoredComment = {
    id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    communityId: matchedComm?.id || item.communityId,
    communityName: matchedComm?.name || item.location || 'Igbo Settlement',
    lgaName: matchedComm?.lgaName,
    stateName: matchedComm?.stateName,
    coordinates: [matchedComm?.longitude || 7.0, matchedComm?.latitude || 6.2],
    deviceId: item.deviceId || null,
    authorName: author,
    handle,
    affiliation: item.affiliation || 'Community Member',
    category: item.category || 'general',
    comment: item.comment.trim(),
    likes: 0,
    createdAt: new Date().toISOString(),
  };

  // Prepend to top of array (newest first)
  comments.unshift(newComment);
  writeCommentsStore(comments);

  return newComment;
}

/**
 * Increment likes count on a comment in store
 */
export function likeCommentInStore(commentId: string): number {
  const comments = readCommentsStore();
  const cmt = comments.find((c) => c.id === commentId);
  if (cmt) {
    cmt.likes = (cmt.likes || 0) + 1;
    writeCommentsStore(comments);
    return cmt.likes;
  }
  return 0;
}

/**
 * Get paginated and filtered comments from store
 */
export function getCommentsFromStore(params: {
  communityId?: string;
  state?: string;
  limit?: number;
  cursor?: string;
}): {
  comments: StoredComment[];
  nextCursor: string | null;
  hasMore: boolean;
} {
  let list = readCommentsStore();

  if (params.communityId) {
    list = list.filter(
      (c) =>
        c.communityId === params.communityId ||
        c.communityName.toLowerCase() === params.communityId!.toLowerCase()
    );
  }

  if (params.state && params.state !== 'all') {
    const s = params.state.toLowerCase();
    list = list.filter((c) => c.stateName?.toLowerCase() === s);
  }

  const limit = Math.min(Math.max(params.limit || 5, 1), 50);

  let startIndex = 0;
  if (params.cursor) {
    const foundIndex = list.findIndex((c) => c.id === params.cursor);
    if (foundIndex !== -1) {
      startIndex = foundIndex + 1;
    }
  }

  const sliced = list.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < list.length;
  const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

  return {
    comments: sliced,
    nextCursor,
    hasMore,
  };
}
