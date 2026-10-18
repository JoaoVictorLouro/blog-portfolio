package cache

import (
	"sync"

	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/i18n"
	"github.com/joaovictorlouro/blog-portfolio/content-api/internal/youtube"
)

type Store struct {
	mu          sync.RWMutex
	translation *i18n.TranslationMap
	youtube     *youtube.VideosPayload
}

func NewStore() *Store {
	return &Store{}
}

func (s *Store) GetTranslationMap() *i18n.TranslationMap {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.translation
}

func (s *Store) SetTranslationMap(m i18n.TranslationMap) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.translation = &m
}

func (s *Store) IsTranslationMapLoaded() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.translation != nil
}

func (s *Store) GetYouTubeVideos() *youtube.VideosPayload {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.youtube
}

func (s *Store) SetYouTubeVideos(p youtube.VideosPayload) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.youtube = &p
}
