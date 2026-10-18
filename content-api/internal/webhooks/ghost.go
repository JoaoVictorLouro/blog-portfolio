package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"strings"
	"sync"
	"time"
)

const DebounceMs = 5000

type RefreshFunc func()

type Debouncer struct {
	mu      sync.Mutex
	timer   *time.Timer
	refresh RefreshFunc
}

func NewDebouncer(refresh RefreshFunc) *Debouncer {
	return &Debouncer{refresh: refresh}
}

func (d *Debouncer) Schedule() {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.timer != nil {
		d.timer.Stop()
	}
	d.timer = time.AfterFunc(time.Duration(DebounceMs)*time.Millisecond, func() {
		d.mu.Lock()
		d.timer = nil
		d.mu.Unlock()
		if d.refresh != nil {
			d.refresh()
		}
	})
}

func ParseGhostSignature(header string) (sha256Hex string, timestamp string, ok bool) {
	parts := strings.Split(header, ",")
	parsed := make(map[string]string)
	for _, part := range parts {
		part = strings.TrimSpace(part)
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 && kv[0] != "" && kv[1] != "" {
			parsed[kv[0]] = kv[1]
		}
	}
	if parsed["sha256"] == "" || parsed["t"] == "" {
		return "", "", false
	}
	return parsed["sha256"], parsed["t"], true
}

func VerifyGhostWebhookSignature(body string, signatureHeader string, secret string) bool {
	if secret == "" {
		return false
	}
	sha256Hex, timestamp, ok := ParseGhostSignature(signatureHeader)
	if !ok {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	mac.Write([]byte(timestamp))
	expected := hex.EncodeToString(mac.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(expected), []byte(sha256Hex)) == 1
}
