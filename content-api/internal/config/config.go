package config

import (
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	GhostAPIURL        string
	Origin             string
	AdminAPIKey        string
	AdminEmail         string
	AdminPassword      string
	WebhookSecret      string
	Port               int
	I18nRefreshMs      int64
	YouTubeChannelID   string
	YouTubeRefreshMs   int64
	YouTubeEnabled     bool
	TurnstileSiteKey   string
	TurnstileSecretKey string
	TurnstileHostnames []string
}

func LoadFromEnv() Config {
	port, _ := strconv.Atoi(envOr("CONTENT_API_PORT", "8080"))
	i18nMs, _ := strconv.ParseInt(envOr("I18N_REFRESH_MS", "3600000"), 10, 64)
	ytMs, _ := strconv.ParseInt(envOr("YOUTUBE_REFRESH_MS", "3600000"), 10, 64)
	channelID := strings.TrimSpace(os.Getenv("YOUTUBE_CHANNEL_ID"))
	origin := envOr("URL", "http://localhost:2368")
	turnstileHostnames := ParseTurnstileHostnames(os.Getenv("TURNSTILE_HOSTNAMES"), origin)

	return Config{
		GhostAPIURL:        envOr("GHOST_API_URL", "http://127.0.0.1:2368"),
		Origin:             origin,
		AdminAPIKey:        strings.TrimSpace(os.Getenv("GHOST_ADMIN_API_KEY")),
		AdminEmail:         strings.TrimSpace(os.Getenv("GHOST_ADMIN_EMAIL")),
		AdminPassword:      os.Getenv("GHOST_ADMIN_PASSWORD"),
		WebhookSecret:      os.Getenv("CONTENT_API_WEBHOOK_SECRET"),
		Port:               port,
		I18nRefreshMs:      i18nMs,
		YouTubeChannelID:   channelID,
		YouTubeRefreshMs:   ytMs,
		YouTubeEnabled:     channelID != "",
		TurnstileSiteKey:   strings.TrimSpace(os.Getenv("TURNSTILE_SITE_KEY")),
		TurnstileSecretKey: strings.TrimSpace(os.Getenv("TURNSTILE_SECRET_KEY")),
		TurnstileHostnames: turnstileHostnames,
	}
}

// ParseTurnstileHostnames builds the siteverify hostname allowlist (lowercase, no port).
func ParseTurnstileHostnames(raw string, originURL string) []string {
	raw = strings.TrimSpace(raw)
	if raw != "" {
		return splitHostnames(raw)
	}
	return defaultTurnstileHostnames(originURL)
}

func splitHostnames(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		host := strings.ToLower(strings.TrimSpace(part))
		if host == "" {
			continue
		}
		if _, ok := seen[host]; ok {
			continue
		}
		seen[host] = struct{}{}
		out = append(out, host)
	}
	return out
}

func defaultTurnstileHostnames(originURL string) []string {
	parsed, err := url.Parse(strings.TrimSpace(originURL))
	if err != nil || parsed.Hostname() == "" {
		return []string{"localhost", "127.0.0.1"}
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || host == "127.0.0.1" {
		return []string{"localhost", "127.0.0.1"}
	}
	return []string{host}
}

func envOr(key string, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
