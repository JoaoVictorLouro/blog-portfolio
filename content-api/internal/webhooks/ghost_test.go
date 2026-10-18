package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestParseGhostSignature(t *testing.T) {
	sha, ts, ok := ParseGhostSignature("t=1234567890, sha256=abc123")
	if !ok || sha != "abc123" || ts != "1234567890" {
		t.Fatalf("parse failed: %v %v %v", ok, sha, ts)
	}
	_, _, ok = ParseGhostSignature("invalid")
	if ok {
		t.Fatal("expected invalid")
	}
}

func TestVerifyGhostWebhookSignature(t *testing.T) {
	secret := "test-secret"
	body := `{"post":{"current":{}}}`
	timestamp := "1700000000"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	mac.Write([]byte(timestamp))
	sha256Hex := hex.EncodeToString(mac.Sum(nil))

	if !VerifyGhostWebhookSignature(body, "t="+timestamp+", sha256="+sha256Hex, secret) {
		t.Fatal("expected valid signature")
	}
	if VerifyGhostWebhookSignature(body, "t="+timestamp+", sha256=deadbeef", secret) {
		t.Fatal("expected invalid signature")
	}
}
