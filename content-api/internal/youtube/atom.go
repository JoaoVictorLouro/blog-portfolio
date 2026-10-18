package youtube

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type Video struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url"`
	PublishedAt  string `json:"published_at"`
}

type Channel struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

type VideosPayload struct {
	UpdatedAt string  `json:"updated_at"`
	Channel   Channel `json:"channel"`
	Videos    []Video `json:"videos"`
}

func EmptyVideosPayload() VideosPayload {
	return VideosPayload{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Channel:   Channel{ID: "", Title: "", URL: ""},
		Videos:    []Video{},
	}
}

func FeedURL(channelID string) string {
	return fmt.Sprintf(
		"https://www.youtube.com/feeds/videos.xml?channel_id=%s",
		url.QueryEscape(channelID),
	)
}

func ParseAtomFeed(xml string, channelID string, limit int) VideosPayload {
	if limit <= 0 {
		limit = 4
	}

	feedTitle := extractTag(xml, "title")
	if feedTitle == "" {
		feedTitle = channelID
	}

	channelURL := fmt.Sprintf("https://www.youtube.com/channel/%s", channelID)
	if href := extractAttr(xml, "link", "href"); href != "" && strings.Contains(href, "channel") {
		channelURL = href
	}

	authorURIRe := regexp.MustCompile(`<author>\s*<name>[\s\S]*?</name>\s*<uri>([\s\S]*?)</uri>`)
	if m := authorURIRe.FindStringSubmatch(xml); len(m) > 1 {
		channelURL = decodeXMLEntities(strings.TrimSpace(m[1]))
	}

	displayTitle := feedTitle
	if strings.HasSuffix(displayTitle, " - YouTube") {
		displayTitle = strings.TrimSuffix(displayTitle, " - YouTube")
	}

	videos := make([]Video, 0, limit)
	entryRe := regexp.MustCompile(`(?i)<entry\b[^>]*>([\s\S]*?)</entry>`)
	for _, entry := range entryRe.FindAllString(xml, -1) {
		if len(videos) >= limit {
			break
		}

		id := extractTag(entry, "yt:videoId")
		if id == "" {
			rawID := extractTag(entry, "id")
			if rawID != "" {
				id = strings.TrimPrefix(rawID, "yt:video:")
			}
		}
		title := extractTag(entry, "title")
		published := extractTag(entry, "published")
		videoURL := extractAttr(entry, "link", "href")
		if videoURL == "" && id != "" {
			videoURL = fmt.Sprintf("https://www.youtube.com/watch?v=%s", id)
		}
		thumbnail := extractAttr(entry, "media:thumbnail", "url")
		if thumbnail == "" && id != "" {
			thumbnail = fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", id)
		}

		if id == "" || title == "" || videoURL == "" || thumbnail == "" || published == "" {
			continue
		}

		videos = append(videos, Video{
			ID:           id,
			Title:        title,
			URL:          videoURL,
			ThumbnailURL: thumbnail,
			PublishedAt:  published,
		})
	}

	return VideosPayload{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Channel: Channel{
			ID:    channelID,
			Title: displayTitle,
			URL:   channelURL,
		},
		Videos: videos,
	}
}

func extractTag(block string, tagName string) string {
	re := regexp.MustCompile(fmt.Sprintf(`(?i)<%s(?:\s[^>]*)?>([\s\S]*?)</%s>`, tagName, tagName))
	m := re.FindStringSubmatch(block)
	if len(m) < 2 {
		return ""
	}
	return decodeXMLEntities(strings.TrimSpace(m[1]))
}

func extractAttr(block string, tagName string, attrName string) string {
	re := regexp.MustCompile(fmt.Sprintf(`(?i)<%s\b[^>]*\b%s="([^"]*)"`, tagName, attrName))
	m := re.FindStringSubmatch(block)
	if len(m) < 2 {
		return ""
	}
	return decodeXMLEntities(strings.TrimSpace(m[1]))
}

func decodeXMLEntities(value string) string {
	value = strings.ReplaceAll(value, "&lt;", "<")
	value = strings.ReplaceAll(value, "&gt;", ">")
	value = strings.ReplaceAll(value, "&quot;", "\"")
	value = strings.ReplaceAll(value, "&apos;", "'")
	value = strings.ReplaceAll(value, "&amp;", "&")
	return value
}
