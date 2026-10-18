package i18n

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/config"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/ghost"
)

type MapWriter interface {
	SetTranslationMap(m TranslationMap)
}

type Refresher struct {
	cfg    config.Config
	writer MapWriter
	client *ghost.Client

	mu       sync.Mutex
	inFlight *flight
}

type flight struct {
	done chan struct{}
	err  error
}

func NewRefresher(cfg config.Config, writer MapWriter) *Refresher {
	return &Refresher{
		cfg:    cfg,
		writer: writer,
		client: ghost.NewClient(cfg.GhostAPIURL, cfg.Origin),
	}
}

func (r *Refresher) RefreshSingleFlight() error {
	r.mu.Lock()
	if r.inFlight != nil {
		f := r.inFlight
		r.mu.Unlock()
		<-f.done
		return f.err
	}
	f := &flight{done: make(chan struct{})}
	r.inFlight = f
	r.mu.Unlock()

	f.err = r.refresh()
	close(f.done)

	r.mu.Lock()
	r.inFlight = nil
	r.mu.Unlock()

	return f.err
}

func (r *Refresher) refresh() error {
	auth, err := r.resolveAuth()
	if err != nil {
		return err
	}

	posts, err := r.client.FetchPublishedPosts(auth)
	if err != nil {
		return err
	}
	pages, err := r.client.FetchPublishedPages(auth)
	if err != nil {
		return err
	}

	combined := PostsFromGhost(append(posts, pages...))
	translationMap := BuildTranslationMap(combined, r.cfg.Origin)
	r.writer.SetTranslationMap(translationMap)
	fmt.Printf("Updated translation map (%d groups) in memory\n", len(translationMap.Groups))
	return nil
}

func (r *Refresher) resolveAuth() (ghost.Auth, error) {
	if r.cfg.AdminAPIKey != "" {
		return ghost.Auth{Kind: ghost.AuthJWT, AdminAPIKey: r.cfg.AdminAPIKey}, nil
	}
	if strings.TrimSpace(r.cfg.AdminEmail) != "" && r.cfg.AdminPassword != "" {
		cookie, err := r.client.CreateAdminSession(r.cfg.AdminEmail, r.cfg.AdminPassword)
		if err != nil {
			return ghost.Auth{}, err
		}
		return ghost.Auth{Kind: ghost.AuthSession, Cookie: cookie}, nil
	}
	return ghost.Auth{}, errors.New("GHOST_ADMIN_API_KEY or GHOST_ADMIN_EMAIL and GHOST_ADMIN_PASSWORD are required")
}
