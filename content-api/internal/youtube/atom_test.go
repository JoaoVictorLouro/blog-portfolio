package youtube

import (
	_ "embed"
	"testing"
)

//go:embed testdata/sample_feed.xml
var sampleFeed string

func TestParseAtomFeedFirstFour(t *testing.T) {
	payload := ParseAtomFeed(sampleFeed, "UCV3h2_srSVaiEmjrZ8v7Qsw", 4)

	if payload.Channel.ID != "UCV3h2_srSVaiEmjrZ8v7Qsw" {
		t.Fatalf("channel id: %s", payload.Channel.ID)
	}
	if payload.Channel.Title != "Vaan Ch." {
		t.Fatalf("channel title: %s", payload.Channel.Title)
	}
	if payload.Channel.URL != "https://www.youtube.com/channel/UCV3h2_srSVaiEmjrZ8v7Qsw" {
		t.Fatalf("channel url: %s", payload.Channel.URL)
	}
	if len(payload.Videos) != 4 {
		t.Fatalf("videos: %d", len(payload.Videos))
	}
	if payload.Videos[0].ID != "AAA111" || payload.Videos[0].Title != "First video & friends" {
		t.Fatalf("first video: %+v", payload.Videos[0])
	}
	if payload.Videos[3].ID != "DDD444" {
		t.Fatalf("fourth id: %s", payload.Videos[3].ID)
	}
}

func TestParseAtomFeedLimit(t *testing.T) {
	payload := ParseAtomFeed(sampleFeed, "UCV3h2_srSVaiEmjrZ8v7Qsw", 2)
	if len(payload.Videos) != 2 || payload.Videos[1].ID != "BBB222" {
		t.Fatalf("videos: %+v", payload.Videos)
	}
}
