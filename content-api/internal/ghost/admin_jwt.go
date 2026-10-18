package ghost

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

const jwtTTLSeconds = 300

type AdminAPIKey struct {
	ID        string
	SecretHex string
}

func ParseAdminAPIKey(adminAPIKey string) (AdminAPIKey, error) {
	trimmed := strings.TrimSpace(adminAPIKey)
	colon := strings.Index(trimmed, ":")
	if colon <= 0 || colon == len(trimmed)-1 {
		return AdminAPIKey{}, errors.New("GHOST_ADMIN_API_KEY must be in id:secret form")
	}
	id := trimmed[:colon]
	secretHex := trimmed[colon+1:]
	if !isEvenLengthHex(secretHex) {
		return AdminAPIKey{}, errors.New("GHOST_ADMIN_API_KEY secret must be even-length hex")
	}
	return AdminAPIKey{ID: id, SecretHex: secretHex}, nil
}

func isEvenLengthHex(s string) bool {
	if len(s)%2 != 0 {
		return false
	}
	for _, r := range s {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')) {
			return false
		}
	}
	return len(s) > 0
}

func DecodeJWTPart(part string) (map[string]interface{}, error) {
	raw, err := base64URLDecode(part)
	if err != nil {
		return nil, err
	}
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func CreateAdminJWT(adminAPIKey string, nowSeconds int64, ttlSeconds int) (string, error) {
	if ttlSeconds < 1 || ttlSeconds > jwtTTLSeconds {
		return "", fmt.Errorf("JWT ttl must be between 1 and %d seconds", jwtTTLSeconds)
	}

	key, err := ParseAdminAPIKey(adminAPIKey)
	if err != nil {
		return "", err
	}

	header := map[string]string{"alg": "HS256", "typ": "JWT", "kid": key.ID}
	payload := map[string]interface{}{
		"iat": nowSeconds,
		"exp": nowSeconds + int64(ttlSeconds),
		"aud": "/admin/",
	}

	headerB64 := base64URLEncode(mustJSON(header))
	payloadB64 := base64URLEncode(mustJSON(payload))
	signingInput := headerB64 + "." + payloadB64

	secret, err := hex.DecodeString(key.SecretHex)
	if err != nil {
		return "", err
	}

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(signingInput))
	sig := base64URLEncode(mac.Sum(nil))

	return signingInput + "." + sig, nil
}

func mustJSON(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func base64URLEncode(data []byte) string {
	return strings.TrimRight(base64.URLEncoding.EncodeToString(data), "=")
}

func base64URLDecode(value string) ([]byte, error) {
	padded := value
	switch len(padded) % 4 {
	case 2:
		padded += "=="
	case 3:
		padded += "="
	}
	return base64.URLEncoding.DecodeString(padded)
}

func AdminTransportHeaders(origin string) map[string]string {
	u, err := parseOriginURL(origin)
	if err != nil || u.Scheme != "https" {
		return map[string]string{}
	}
	host := u.Host
	if host == "" {
		return map[string]string{}
	}
	return map[string]string{
		"Host":              host,
		"X-Forwarded-Proto": "https",
	}
}
