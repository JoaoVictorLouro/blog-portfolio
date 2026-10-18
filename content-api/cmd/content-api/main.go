package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/cache"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/config"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/httpapi"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/i18n"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/youtube"
)

func main() {
	once := flag.Bool("once", false, "refresh caches once and exit")
	health := flag.Bool("health", false, "check /health on localhost and exit")
	flag.Parse()

	cfg := config.LoadFromEnv()
	store := cache.NewStore()
	i18nRefresh := i18n.NewRefresher(cfg, store)
	ytRefresh := youtube.NewRefresher(cfg.YouTubeChannelID, store)

	if *health {
		exitHealthCheck(cfg.Port)
	}

	if err := i18nRefresh.RefreshSingleFlight(); err != nil {
		log.Println(err.Error())
		os.Exit(1)
	}
	refreshYouTubeSafe(cfg, store, ytRefresh)

	if *once {
		os.Exit(0)
	}

	go startI18nLoop(cfg, i18nRefresh)
	if cfg.YouTubeEnabled {
		go startYouTubeLoop(cfg, ytRefresh)
	}

	addr := fmt.Sprintf("0.0.0.0:%d", cfg.Port)
	server := httpapi.NewServer(cfg, store, i18nRefresh)
	log.Printf("Content API listening on http://%s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}

func exitHealthCheck(port int) {
	resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/health", port))
	if err != nil {
		os.Exit(1)
	}
	status := resp.StatusCode
	_ = resp.Body.Close()
	if status != http.StatusOK {
		os.Exit(1)
	}
	os.Exit(0)
}

func refreshYouTubeSafe(cfg config.Config, store *cache.Store, ytRefresh *youtube.Refresher) {
	if !cfg.YouTubeEnabled {
		store.SetYouTubeVideos(youtube.EmptyVideosPayload())
		return
	}
	if err := ytRefresh.RefreshSingleFlight(); err != nil {
		log.Printf("YouTube refresh failed: %s", err.Error())
	}
}

func startI18nLoop(cfg config.Config, refresher *i18n.Refresher) {
	ticker := time.NewTicker(time.Duration(cfg.I18nRefreshMs) * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		if err := refresher.RefreshSingleFlight(); err != nil {
			log.Println(err.Error())
		}
	}
}

func startYouTubeLoop(cfg config.Config, refresher *youtube.Refresher) {
	ticker := time.NewTicker(time.Duration(cfg.YouTubeRefreshMs) * time.Millisecond)
	defer ticker.Stop()
	for range ticker.C {
		if err := refresher.RefreshSingleFlight(); err != nil {
			log.Printf("YouTube refresh failed: %s", err.Error())
		}
	}
}
