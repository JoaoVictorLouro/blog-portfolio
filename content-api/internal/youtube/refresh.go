package youtube

import (
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

const defaultLimit = 4

type VideosWriter interface {
	SetYouTubeVideos(p VideosPayload)
}

type Refresher struct {
	channelID string
	limit     int
	writer    VideosWriter
	client    *http.Client

	mu       sync.Mutex
	inFlight *flight
}

type flight struct {
	done chan struct{}
	err  error
}

func NewRefresher(channelID string, writer VideosWriter) *Refresher {
	return &Refresher{
		channelID: channelID,
		limit:     defaultLimit,
		writer:    writer,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
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
	if r.channelID == "" {
		return fmt.Errorf("YOUTUBE_CHANNEL_ID is required")
	}

	req, err := http.NewRequest(http.MethodGet, FeedURL(r.channelID), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/atom+xml, application/xml, text/xml, */*")
	req.Header.Set("User-Agent", "new-blog-content-api/1.0")

	resp, err := r.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("YouTube RSS HTTP %d", resp.StatusCode)
	}

	xml, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	payload := ParseAtomFeed(string(xml), r.channelID, r.limit)
	r.writer.SetYouTubeVideos(payload)
	fmt.Printf(
		"Updated YouTube videos cache (%d videos) for %s\n",
		len(payload.Videos),
		payload.Channel.Title,
	)
	return nil
}
