package ghost

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchPublishedPostsHTTPSHeaders(t *testing.T) {
	var captured *http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"posts":[],"meta":{"pagination":{"pages":1}}}`)
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "https://site.example")
	_, err := client.FetchPublishedPosts(Auth{Kind: AuthJWT, AdminAPIKey: adminKey})
	if err != nil {
		t.Fatal(err)
	}
	if captured == nil {
		t.Fatal("no request")
	}
	if captured.Host != "site.example" {
		t.Fatalf("Host: %s", captured.Host)
	}
	if captured.Header.Get("X-Forwarded-Proto") != "https" {
		t.Fatalf("proto: %s", captured.Header.Get("X-Forwarded-Proto"))
	}
	if !strings.HasPrefix(captured.Header.Get("Authorization"), "Ghost ") {
		t.Fatalf("auth: %s", captured.Header.Get("Authorization"))
	}
}

func TestFetchPublishedPostsSessionNoTransport(t *testing.T) {
	var captured *http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"posts":[],"meta":{"pagination":{"pages":1}}}`)
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "http://localhost:2368")
	_, err := client.FetchPublishedPosts(Auth{Kind: AuthSession, Cookie: "ghost-admin-api-session=abc"})
	if err != nil {
		t.Fatal(err)
	}
	if captured.Header.Get("Host") != "" || captured.Header.Get("Cookie") != "ghost-admin-api-session=abc" {
		t.Fatalf("headers: %+v", captured.Header)
	}
}

func TestFetchPublishedPostsRejectsRedirect(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Location", "https://site.example/ghost/api/admin/posts/")
		w.WriteHeader(http.StatusMovedPermanently)
	}))
	defer srv.Close()

	client := NewClient(srv.URL, "https://site.example")
	_, err := client.FetchPublishedPosts(Auth{Kind: AuthJWT, AdminAPIKey: adminKey})
	if err == nil || !strings.Contains(err.Error(), "Admin request redirected (301)") {
		t.Fatalf("err: %v", err)
	}
}
