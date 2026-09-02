import { assertEquals } from 'jsr:@std/assert@1';
import { parseYouTubeAtomFeed } from './youtube-client.ts';

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCV3h2_srSVaiEmjrZ8v7Qsw"/>
 <id>yt:channel:V3h2_srSVaiEmjrZ8v7Qsw</id>
 <yt:channelId>V3h2_srSVaiEmjrZ8v7Qsw</yt:channelId>
 <title>Vaan Ch.</title>
 <link rel="alternate" href="https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw"/>
 <author>
  <name>Vaan Ch.</name>
  <uri>https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw</uri>
 </author>
 <published>2017-09-22T14:28:16+00:00</published>
 <entry>
  <id>yt:video:AAA111</id>
  <yt:videoId>AAA111</yt:videoId>
  <yt:channelId>UCV3h2_srSVaiEmjrZ8v7Qsw</yt:channelId>
  <title>First video &amp; friends</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=AAA111"/>
  <author>
   <name>Vaan Ch.</name>
   <uri>https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw</uri>
  </author>
  <published>2026-09-02T16:00:38+00:00</published>
  <media:group>
   <media:title>First video &amp; friends</media:title>
   <media:thumbnail url="https://i.ytimg.com/vi/AAA111/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:BBB222</id>
  <yt:videoId>BBB222</yt:videoId>
  <title>Second video</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=BBB222"/>
  <published>2026-08-31T03:00:23+00:00</published>
  <media:group>
   <media:thumbnail url="https://i.ytimg.com/vi/BBB222/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:CCC333</id>
  <yt:videoId>CCC333</yt:videoId>
  <title>Third video</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=CCC333"/>
  <published>2026-08-30T03:00:23+00:00</published>
  <media:group>
   <media:thumbnail url="https://i.ytimg.com/vi/CCC333/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:DDD444</id>
  <yt:videoId>DDD444</yt:videoId>
  <title>Fourth video</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=DDD444"/>
  <published>2026-08-29T03:00:23+00:00</published>
  <media:group>
   <media:thumbnail url="https://i.ytimg.com/vi/DDD444/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:EEE555</id>
  <yt:videoId>EEE555</yt:videoId>
  <title>Fifth video ignored</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=EEE555"/>
  <published>2026-08-28T03:00:23+00:00</published>
  <media:group>
   <media:thumbnail url="https://i.ytimg.com/vi/EEE555/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>
</feed>`;

Deno.test('parseYouTubeAtomFeed returns channel meta and first 4 videos', () => {
  const payload = parseYouTubeAtomFeed(SAMPLE_FEED, 'UCV3h2_srSVaiEmjrZ8v7Qsw', 4);

  assertEquals(payload.channel.id, 'UCV3h2_srSVaiEmjrZ8v7Qsw');
  assertEquals(payload.channel.title, 'Vaan Ch.');
  assertEquals(payload.channel.url, 'https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw');
  assertEquals(payload.videos.length, 4);
  assertEquals(payload.videos[0].id, 'AAA111');
  assertEquals(payload.videos[0].title, 'First video & friends');
  assertEquals(payload.videos[0].url, 'https://www.youtube.com/watch?v=AAA111');
  assertEquals(payload.videos[0].thumbnail_url, 'https://i.ytimg.com/vi/AAA111/hqdefault.jpg');
  assertEquals(payload.videos[0].published_at, '2026-09-02T16:00:38+00:00');
  assertEquals(payload.videos[3].id, 'DDD444');
});

Deno.test('parseYouTubeAtomFeed respects custom limit', () => {
  const payload = parseYouTubeAtomFeed(SAMPLE_FEED, 'UCV3h2_srSVaiEmjrZ8v7Qsw', 2);
  assertEquals(payload.videos.length, 2);
  assertEquals(payload.videos[1].id, 'BBB222');
});
