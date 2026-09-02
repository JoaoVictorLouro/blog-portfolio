import { setYouTubeVideos } from './youtube-cache.ts';
import { fetchChannelVideos } from './youtube-client.ts';

export type YouTubeRefreshConfig = {
  channelId: string;
  limit?: number;
};

let refreshInFlight: Promise<void> | null = null;

export async function refreshYouTubeVideos(config: YouTubeRefreshConfig): Promise<void> {
  const payload = await fetchChannelVideos(config.channelId, config.limit ?? 4);
  setYouTubeVideos(payload);
  console.log(
    `Updated YouTube videos cache (${payload.videos.length} videos) for ${payload.channel.title}`,
  );
}

export function refreshYouTubeVideosSingleFlight(config: YouTubeRefreshConfig): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshYouTubeVideos(config).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
