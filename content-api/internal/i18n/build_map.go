package i18n

import (
	"net/url"
	"strings"
	"time"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/ghost"
)

type Tag struct {
	Slug string `json:"slug"`
}

type Post struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
	URL   string `json:"url,omitempty"`
	Tags  []Tag  `json:"tags,omitempty"`
}

func PostsFromGhost(contents []ghost.Content) []Post {
	posts := make([]Post, 0, len(contents))
	for _, item := range contents {
		tags := make([]Tag, 0, len(item.Tags))
		for _, tag := range item.Tags {
			tags = append(tags, Tag{Slug: tag.Slug})
		}
		posts = append(posts, Post{
			ID: item.ID, Title: item.Title, Slug: item.Slug, URL: item.URL, Tags: tags,
		})
	}
	return posts
}

type TranslationEntry struct {
	URL   string `json:"url"`
	Title string `json:"title"`
}

type TranslationMap struct {
	UpdatedAt string                                 `json:"updated_at"`
	ByURL     map[string]string                      `json:"by_url"`
	Groups    map[string]map[string]TranslationEntry `json:"groups"`
}

func BuildTranslationMap(posts []Post, siteURL string) TranslationMap {
	groups := make(map[string]map[string]TranslationEntry)
	byURL := make(map[string]string)

	for _, post := range posts {
		groupID := translationGroupForPost(post)
		locale := localeForPost(post)
		if groupID == "" || locale == "" {
			continue
		}

		absURL := postAbsoluteURL(post, siteURL)
		path := postPath(post)

		if groups[groupID] == nil {
			groups[groupID] = make(map[string]TranslationEntry)
		}
		groups[groupID][locale] = TranslationEntry{
			URL:   path,
			Title: post.Title,
		}
		byURL[absURL] = groupID
	}

	return TranslationMap{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		ByURL:     byURL,
		Groups:    groups,
	}
}

func localeForPost(post Post) string {
	for _, tag := range post.Tags {
		if code := localeFromTagSlug(tag.Slug); code != "" {
			return code
		}
	}
	return ""
}

func translationGroupForPost(post Post) string {
	for _, tag := range post.Tags {
		if group := translationGroupFromTagSlug(tag.Slug); group != "" {
			return group
		}
	}
	return ""
}

func isAbsoluteURL(value string) bool {
	return strings.HasPrefix(strings.ToLower(value), "http://") ||
		strings.HasPrefix(strings.ToLower(value), "https://")
}

func absoluteURL(siteURL, path string) string {
	base := strings.TrimSuffix(siteURL, "/")
	suffix := path
	if !strings.HasPrefix(suffix, "/") {
		suffix = "/" + suffix
	}
	return base + suffix
}

func postPath(post Post) string {
	raw := post.URL
	if raw == "" {
		raw = "/" + DefaultLocale + "/articles/" + post.Slug + "/"
	}
	if isAbsoluteURL(raw) {
		parsed, err := url.Parse(raw)
		if err == nil {
			return parsed.Path
		}
		if strings.HasPrefix(raw, "/") {
			return raw
		}
		return "/" + raw
	}
	if strings.HasPrefix(raw, "/") {
		return raw
	}
	return "/" + raw
}

func postAbsoluteURL(post Post, siteURL string) string {
	return absoluteURL(siteURL, postPath(post))
}
