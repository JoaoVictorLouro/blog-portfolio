package antibot

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	defaultSiteVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	// SubscribeAction is the Turnstile widget action for newsletter subscribe forms.
	SubscribeAction = "subscribe"
	// MaxTurnstileTokenLen is Cloudflare's documented upper bound for the response token.
	MaxTurnstileTokenLen = 2048
)

// SiteVerifyURL is the Turnstile siteverify endpoint (override in tests).
var SiteVerifyURL = defaultSiteVerifyURL

type siteVerifyResponse struct {
	Success  bool     `json:"success"`
	Action   string   `json:"action"`
	Hostname string   `json:"hostname"`
	Errors   []string `json:"error-codes"`
}

// TurnstileEnabled reports whether both site key and secret are configured.
func TurnstileEnabled(siteKey, secret string) bool {
	return strings.TrimSpace(siteKey) != "" && strings.TrimSpace(secret) != ""
}

// HostnameAllowed reports whether hostname is in the allowlist (lowercase hosts, no ports).
func HostnameAllowed(hostname string, allowed []string) bool {
	host := strings.ToLower(strings.TrimSpace(hostname))
	if host == "" {
		return false
	}
	for _, candidate := range allowed {
		if host == strings.ToLower(strings.TrimSpace(candidate)) {
			return true
		}
	}
	return false
}

// VerifySubscribeToken checks a token with Cloudflare and enforces subscribe action + hostname allowlist.
func VerifySubscribeToken(
	ctx context.Context,
	secret, token, remoteIP string,
	allowedHostnames []string,
) (bool, error) {
	secret = strings.TrimSpace(secret)
	token = strings.TrimSpace(token)
	if secret == "" {
		return false, errors.New("turnstile secret not configured")
	}
	if token == "" {
		return false, errors.New("missing token")
	}
	if len(token) > MaxTurnstileTokenLen {
		return false, errors.New("token too long")
	}
	if len(allowedHostnames) == 0 {
		return false, errors.New("turnstile hostnames not configured")
	}

	payload, err := siteVerify(ctx, secret, token, remoteIP)
	if err != nil {
		return false, err
	}
	if !payload.Success {
		return false, nil
	}
	if payload.Action != SubscribeAction {
		return false, nil
	}
	if !HostnameAllowed(payload.Hostname, allowedHostnames) {
		return false, nil
	}
	return true, nil
}

func siteVerify(ctx context.Context, secret, token, remoteIP string) (siteVerifyResponse, error) {
	var empty siteVerifyResponse

	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", token)
	if remoteIP != "" {
		form.Set("remoteip", remoteIP)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, SiteVerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return empty, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return empty, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return empty, err
	}
	if resp.StatusCode != http.StatusOK {
		return empty, errors.New("turnstile siteverify failed")
	}

	var payload siteVerifyResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return empty, err
	}
	return payload, nil
}
