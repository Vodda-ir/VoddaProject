// Shared blog helpers: server-side fetching from the Go backend,
// a tiny content-block parser shared by the list/detail pages, and
// Persian date formatting for blog metadata.

import { formatDate } from './datetime';

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string;
  category: string;
  status: string;
  read_minutes: number;
  views: number;
  published_at?: string | null;
  created_at: string;
};

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');

async function fetchBlog<T>(path: string): Promise<{ data: T; total: number } | null> {
  try {
    const response = await fetch(`${API_BASE}/${path}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as { data: T; total: number };
  } catch {
    return null;
  }
}

export function fetchPublishedPosts(params?: { category?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  const query = search.toString();
  return fetchBlog<BlogPost[]>(`blog/posts${query ? `?${query}` : ''}`);
}

export function fetchPostBySlug(slug: string) {
  return fetchBlog<BlogPost>(`blog/posts/${encodeURIComponent(slug)}`);
}

export type ContentBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Parses the CMS content format understood by the renderer:
 * blank lines separate blocks, "## " prefixes a heading and consecutive
 * "- " lines form a bullet list. A heading may be followed by list items
 * or paragraphs within the same block without a blank line.
 */
export function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const chunk of content.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (line.startsWith('## ')) {
        blocks.push({ kind: 'heading', text: line.slice(3).trim() });
        index += 1;
        continue;
      }
      if (line.startsWith('- ')) {
        const items: string[] = [];
        while (index < lines.length && lines[index].startsWith('- ')) {
          items.push(lines[index].slice(2).trim());
          index += 1;
        }
        blocks.push({ kind: 'list', items });
        continue;
      }
      blocks.push({ kind: 'paragraph', text: line });
      index += 1;
    }
  }
  return blocks;
}

/** Persian (Jalali) date via central datetime util — falls back to the raw ISO date. */
export function faBlogDate(iso?: string | null): string {
  if (!iso) return '';
  return formatDate(iso) || iso.slice(0, 10);
}

export function readTimeLabel(minutes: number): string {
  return `${Math.max(1, minutes)} دقیقه مطالعه`;
}
