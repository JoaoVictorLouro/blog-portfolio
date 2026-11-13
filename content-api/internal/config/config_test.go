package config

import "testing"

func TestParseTurnstileHostnamesExplicit(t *testing.T) {
	got := ParseTurnstileHostnames("localhost,127.0.0.1,konogaijin.com", "http://ignored")
	want := []string{"localhost", "127.0.0.1", "konogaijin.com"}
	if len(got) != len(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}

func TestDefaultTurnstileHostnamesLocalOrigin(t *testing.T) {
	got := ParseTurnstileHostnames("", "http://localhost:2368")
	if len(got) != 2 || got[0] != "localhost" || got[1] != "127.0.0.1" {
		t.Fatalf("got %v", got)
	}
}

func TestDefaultTurnstileHostnamesProductionOrigin(t *testing.T) {
	got := ParseTurnstileHostnames("", "https://konogaijin.com")
	if len(got) != 1 || got[0] != "konogaijin.com" {
		t.Fatalf("got %v", got)
	}
}
