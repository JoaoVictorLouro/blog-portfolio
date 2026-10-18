package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/cache"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/config"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/i18n"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/youtube"
)

func testServer(store *cache.Store) *Server {
	cfg := config.Config{WebhookSecret: "secret"}
	return NewServer(cfg, store, i18n.NewRefresher(cfg, store))
}

func TestHealth503WhenEmpty(t *testing.T) {
	store := cache.NewStore()
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status: %d", rec.Code)
	}
}

func TestTranslationsCached(t *testing.T) {
	store := cache.NewStore()
	store.SetTranslationMap(i18n.TranslationMap{
		UpdatedAt: "2026-01-01T00:00:00.000Z",
		ByURL:     map[string]string{},
		Groups:    map[string]map[string]i18n.TranslationEntry{},
	})
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodGet, "/i18n/article-translations.json", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "2026-01-01") {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
}

func TestYouTubeEmpty(t *testing.T) {
	store := cache.NewStore()
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodGet, "/youtube/videos.json", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"videos":[]`) {
		t.Fatalf("%s", rec.Body.String())
	}
}

func TestYouTubeCached(t *testing.T) {
	store := cache.NewStore()
	store.SetYouTubeVideos(youtube.VideosPayload{
		UpdatedAt: "2026-01-01T00:00:00.000Z",
		Channel:   youtube.Channel{ID: "UC", Title: "T", URL: "https://example.com"},
		Videos: []youtube.Video{{
			ID: "AAA111", Title: "Sample",
			URL:          "https://www.youtube.com/watch?v=AAA111",
			ThumbnailURL: "https://i.ytimg.com/vi/AAA111/hqdefault.jpg",
			PublishedAt:  "2026-01-01T00:00:00.000Z",
		}},
	})
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodGet, "/youtube/videos.json", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), "AAA111") {
		t.Fatalf("%s", rec.Body.String())
	}
}

func TestWebhookUnauthorized(t *testing.T) {
	store := cache.NewStore()
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/ghost", strings.NewReader("{}"))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("%d", rec.Code)
	}
}

func TestNotFound(t *testing.T) {
	store := cache.NewStore()
	srv := testServer(store)
	req := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("%d", rec.Code)
	}
}
