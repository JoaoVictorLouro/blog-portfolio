package antibot

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTurnstileEnabled(t *testing.T) {
	if !TurnstileEnabled("site", "secret") {
		t.Fatal("expected enabled")
	}
	if TurnstileEnabled("", "secret") || TurnstileEnabled("site", "") {
		t.Fatal("expected disabled")
	}
}

func TestHostnameAllowed(t *testing.T) {
	allowed := []string{"localhost", "konogaijin.com"}
	if !HostnameAllowed("localhost", allowed) || !HostnameAllowed("konogaijin.com", allowed) {
		t.Fatal("expected allowed")
	}
	if HostnameAllowed("evil.example", allowed) {
		t.Fatal("expected denied")
	}
}

func TestVerifySubscribeToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method %s", r.Method)
		}
		_ = r.ParseForm()
		if r.Form.Get("secret") != "test-secret" {
			_ = json.NewEncoder(w).Encode(siteVerifyResponse{Success: false})
			return
		}
		token := r.Form.Get("response")
		switch token {
		case "good-token":
			_ = json.NewEncoder(w).Encode(siteVerifyResponse{
				Success: true, Action: SubscribeAction, Hostname: "localhost",
			})
		case "bad-action":
			_ = json.NewEncoder(w).Encode(siteVerifyResponse{
				Success: true, Action: "login", Hostname: "localhost",
			})
		case "bad-host":
			_ = json.NewEncoder(w).Encode(siteVerifyResponse{
				Success: true, Action: SubscribeAction, Hostname: "evil.example",
			})
		default:
			_ = json.NewEncoder(w).Encode(siteVerifyResponse{Success: false})
		}
	}))
	defer srv.Close()

	prev := SiteVerifyURL
	SiteVerifyURL = srv.URL
	defer func() { SiteVerifyURL = prev }()

	allowed := []string{"localhost", "127.0.0.1"}
	ctx := context.Background()

	ok, err := VerifySubscribeToken(ctx, "test-secret", "good-token", "", allowed)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}

	ok, err = VerifySubscribeToken(ctx, "test-secret", "bad-token", "", allowed)
	if err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}

	ok, err = VerifySubscribeToken(ctx, "test-secret", "bad-action", "", allowed)
	if err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}

	ok, err = VerifySubscribeToken(ctx, "test-secret", "bad-host", "", allowed)
	if err != nil || ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}

	longToken := strings.Repeat("a", MaxTurnstileTokenLen+1)
	_, err = VerifySubscribeToken(ctx, "test-secret", longToken, "", allowed)
	if err == nil {
		t.Fatal("expected token too long error")
	}
}
