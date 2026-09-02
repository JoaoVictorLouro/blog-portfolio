export type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  published_at: string;
};

export type YouTubeChannel = {
  id: string;
  title: string;
  url: string;
};

export type YouTubeVideosPayload = {
  updated_at: string;
  channel: YouTubeChannel;
  videos: YouTubeVideo[];
};

let cachedVideos: YouTubeVideosPayload | null = null;

export function getYouTubeVideos(): YouTubeVideosPayload | null {
  return cachedVideos;
}

export function setYouTubeVideos(payload: YouTubeVideosPayload): void {
  cachedVideos = payload;
}

export function isYouTubeVideosLoaded(): boolean {
  return cachedVideos !== null;
}

export function clearYouTubeVideos(): void {
  cachedVideos = null;
}
