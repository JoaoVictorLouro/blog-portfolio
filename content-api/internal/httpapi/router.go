package httpapi

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strings"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/antibot"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/cache"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/config"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/i18n"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/webhooks"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/youtube"
)

const jsonContentType = "application/json; charset=utf-8"

type Server struct {
	cfg         config.Config
	store       *cache.Store
	i18nRefresh *i18n.Refresher
	webhookDeb  *webhooks.Debouncer
}

func NewServer(cfg config.Config, store *cache.Store, i18nRefresh *i18n.Refresher) *Server {
	s := &Server{
		cfg:         cfg,
		store:       store,
		i18nRefresh: i18nRefresh,
	}
	s.webhookDeb = webhooks.NewDebouncer(func() {
		if err := i18nRefresh.RefreshSingleFlight(); err != nil {
			fmtError(err)
		}
	})
	return s
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/i18n/article-translations.json", s.handleTranslations)
	mux.HandleFunc("/youtube/videos.json", s.handleYouTube)
	mux.HandleFunc("/webhooks/ghost", s.handleGhostWebhook)
	mux.HandleFunc("/antibot/config", s.handleAntibotConfig)
	mux.HandleFunc("/antibot/verify", s.handleAntibotVerify)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, pattern := mux.Handler(r)
		if pattern == "" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not Found"})
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	ok := s.store.IsTranslationMapLoaded()
	status := http.StatusOK
	if !ok {
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, map[string]bool{"ok": ok})
}

func (s *Server) handleTranslations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	translationMap := s.store.GetTranslationMap()
	if translationMap == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Translation map not loaded yet",
		})
		return
	}
	writeJSON(w, http.StatusOK, translationMap)
}

func (s *Server) handleYouTube(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	payload := s.store.GetYouTubeVideos()
	if payload == nil {
		writeJSON(w, http.StatusOK, youtube.EmptyVideosPayload())
		return
	}
	writeJSON(w, http.StatusOK, payload)
}

func (s *Server) handleAntibotConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	enabled := antibot.TurnstileEnabled(s.cfg.TurnstileSiteKey, s.cfg.TurnstileSecretKey)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"enabled": enabled,
		"siteKey": s.cfg.TurnstileSiteKey,
	})
}

type antibotVerifyRequest struct {
	Token string `json:"token"`
}

func (s *Server) handleAntibotVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if !antibot.TurnstileEnabled(s.cfg.TurnstileSiteKey, s.cfg.TurnstileSecretKey) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true, "skipped": true})
		return
	}

	var body antibotVerifyRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad request"})
		return
	}
	token := strings.TrimSpace(body.Token)
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing token"})
		return
	}

	ok, err := antibot.VerifySubscribeToken(
		r.Context(),
		s.cfg.TurnstileSecretKey,
		token,
		clientIP(r),
		s.cfg.TurnstileHostnames,
	)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Verification failed"})
		return
	}
	if !ok {
		writeJSON(w, http.StatusForbidden, map[string]bool{"ok": false})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		parts := strings.Split(fwd, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func (s *Server) handleGhostWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	if s.cfg.WebhookSecret == "" {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "Webhook secret not configured",
		})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Bad request"})
		return
	}

	signature := r.Header.Get("X-Ghost-Signature")
	if !webhooks.VerifyGhostWebhookSignature(string(body), signature, s.cfg.WebhookSecret) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Invalid webhook signature",
		})
		return
	}

	s.webhookDeb.Schedule()
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", jsonContentType)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func methodNotAllowed(w http.ResponseWriter) {
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func fmtError(err error) {
	if err != nil {
		println(err.Error())
	}
}
