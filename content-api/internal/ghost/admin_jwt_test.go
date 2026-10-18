package ghost

import (
	"strings"
	"testing"
)

const keyID = "64c3f3a1b2c3d4e5f6071829"
const secretHex = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
const adminKey = keyID + ":" + secretHex

func TestParseAdminAPIKey(t *testing.T) {
	k, err := ParseAdminAPIKey(" " + adminKey + " \n")
	if err != nil || k.ID != keyID || k.SecretHex != secretHex {
		t.Fatalf("parse: %v %+v", err, k)
	}
	if _, err := ParseAdminAPIKey("nocolon"); err == nil || !strings.Contains(err.Error(), "id:secret") {
		t.Fatalf("nocolon: %v", err)
	}
	if _, err := ParseAdminAPIKey("id:not-hex"); err == nil {
		t.Fatal("not-hex")
	}
}

func TestCreateAdminJWT(t *testing.T) {
	now := int64(1_700_000_000)
	token, err := CreateAdminJWT(adminKey, now, jwtTTLSeconds)
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("parts: %d", len(parts))
	}
	header, err := DecodeJWTPart(parts[0])
	if err != nil || header["alg"] != "HS256" || header["kid"] != keyID {
		t.Fatalf("header: %v %v", err, header)
	}
	payload, err := DecodeJWTPart(parts[1])
	if err != nil {
		t.Fatal(err)
	}
	if payload["iat"] != float64(now) || payload["exp"] != float64(now+300) || payload["aud"] != "/admin/" {
		t.Fatalf("payload: %v", payload)
	}
}

func TestCreateAdminJWTRejectsLongTTL(t *testing.T) {
	_, err := CreateAdminJWT(adminKey, 1, 301)
	if err == nil || !strings.Contains(err.Error(), "JWT ttl") {
		t.Fatalf("ttl: %v", err)
	}
}

func TestAdminTransportHeaders(t *testing.T) {
	h := AdminTransportHeaders("https://site.example")
	if h["Host"] != "site.example" || h["X-Forwarded-Proto"] != "https" {
		t.Fatalf("%v", h)
	}
	if len(AdminTransportHeaders("http://localhost:2368")) != 0 {
		t.Fatal("http should be empty")
	}
}
