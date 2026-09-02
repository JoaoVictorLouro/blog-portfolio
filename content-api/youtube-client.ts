import type { YouTubeVideo, YouTubeVideosPayload } from './youtube-cache.ts';

const FEED_URL = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = block.match(re);
  if (!match) {
    return null;
  }
  return decodeXmlEntities(match[1].trim());
}

function extractAttr(block: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}="([^"]*)"`, 'i');
  const match = block.match(re);
  if (!match) {
    return null;
  }
  return decodeXmlEntities(match[1].trim());
}

function extractEntries(xml: string): string[] {
  const entries: string[] = [];
  const re = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    entries.push(match[0]);
  }
  return entries;
}

export function parseYouTubeAtomFeed(
  xml: string,
  channelId: string,
  limit = 4,
): YouTubeVideosPayload {
  const feedTitle = extractTag(xml, 'title') ?? channelId;
  const channelUrl = extractAttr(xml, 'link', 'href')?.includes('channel')
    ? extractAttr(xml, 'link', 'href')!
    : `https://www.youtube.com/channel/${channelId}`;

  // Prefer author/uri or alternate link for channel; fall back to constructed URL.
  const authorUriMatch = xml.match(/<author>\s*<name>[\s\S]*?<\/name>\s*<uri>([\s\S]*?)<\/uri>/i);
  const resolvedChannelUrl = authorUriMatch
    ? decodeXmlEntities(authorUriMatch[1].trim())
    : channelUrl;

  const videos: YouTubeVideo[] = [];
  for (const entry of extractEntries(xml)) {
    if (videos.length >= limit) {
      break;
    }

    const id =
      extractTag(entry, 'yt:videoId') ?? extractTag(entry, 'id')?.replace(/^yt:video:/, '') ?? null;
    const title = extractTag(entry, 'title');
    const published = extractTag(entry, 'published');
    const url =
      extractAttr(entry, 'link', 'href') ?? (id ? `https://www.youtube.com/watch?v=${id}` : null);
    const thumbnail =
      extractAttr(entry, 'media:thumbnail', 'url') ??
      (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null);

    if (!id || !title || !url || !thumbnail || !published) {
      continue;
    }

    videos.push({
      id,
      title,
      url,
      thumbnail_url: thumbnail,
      published_at: published,
    });
  }

  return {
    updated_at: new Date().toISOString(),
    channel: {
      id: channelId,
      title: feedTitle.includes(' - YouTube') ? feedTitle.replace(/ - YouTube$/, '') : feedTitle,
      url: resolvedChannelUrl,
    },
    videos,
  };
}

export async function fetchChannelVideos(
  channelId: string,
  limit = 4,
): Promise<YouTubeVideosPayload> {
  if (!channelId) {
    throw new Error('YOUTUBE_CHANNEL_ID is required');
  }

  const response = await fetch(FEED_URL(channelId), {
    headers: {
      Accept: 'application/atom+xml, application/xml, text/xml, */*',
      'User-Agent': 'new-blog-content-api/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube RSS HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseYouTubeAtomFeed(xml, channelId, limit);
}
