// Shared blog helpers: server-side fetching from the Go backend,
// a tiny content-block parser shared by the list/detail pages, and
// Persian date formatting for blog metadata.

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
 * "- " lines form a bullet list.
 */
export function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const chunks = content.split(/\n\s*\n/);
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ kind: 'list', items: lines.map((line) => line.slice(2).trim()) });
      continue;
    }
    if (lines[0].startsWith('## ')) {
      blocks.push({ kind: 'heading', text: lines[0].slice(3).trim() });
      for (const line of lines.slice(1)) blocks.push({ kind: 'paragraph', text: line });
      continue;
    }
    blocks.push({ kind: 'paragraph', text: lines.join(' ') });
  }
  return blocks;
}

/** Persian (Jalali) date via Intl — falls back to the raw ISO date. */
export function faBlogDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function readTimeLabel(minutes: number): string {
  return `${Math.max(1, minutes)} دقیقه مطالعه`;
}
