package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	GhostAPIURL      string
	Origin           string
	AdminAPIKey      string
	AdminEmail       string
	AdminPassword    string
	WebhookSecret    string
	Port             int
	I18nRefreshMs    int64
	YouTubeChannelID string
	YouTubeRefreshMs int64
	YouTubeEnabled   bool
}

func LoadFromEnv() Config {
	port, _ := strconv.Atoi(envOr("CONTENT_API_PORT", "8080"))
	i18nMs, _ := strconv.ParseInt(envOr("I18N_REFRESH_MS", "3600000"), 10, 64)
	ytMs, _ := strconv.ParseInt(envOr("YOUTUBE_REFRESH_MS", "3600000"), 10, 64)
	channelID := strings.TrimSpace(os.Getenv("YOUTUBE_CHANNEL_ID"))

	return Config{
		GhostAPIURL:      envOr("GHOST_API_URL", "http://127.0.0.1:2368"),
		Origin:           envOr("URL", "http://localhost:2368"),
		AdminAPIKey:      strings.TrimSpace(os.Getenv("GHOST_ADMIN_API_KEY")),
		AdminEmail:       strings.TrimSpace(os.Getenv("GHOST_ADMIN_EMAIL")),
		AdminPassword:    os.Getenv("GHOST_ADMIN_PASSWORD"),
		WebhookSecret:    os.Getenv("CONTENT_API_WEBHOOK_SECRET"),
		Port:             port,
		I18nRefreshMs:    i18nMs,
		YouTubeChannelID: channelID,
		YouTubeRefreshMs: ytMs,
		YouTubeEnabled:   channelID != "",
	}
}

func envOr(key string, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
