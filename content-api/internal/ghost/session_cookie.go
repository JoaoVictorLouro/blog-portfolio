package ghost

import (
	"net/http"
	"regexp"
	"strings"
)

var sessionPairRe = regexp.MustCompile(`(?i)((?:__Host-|__Secure-)?ghost-admin-api-session=[^;,]*)`)

func extractAdminSessionCookie(header http.Header) string {
	for _, cookie := range header.Values("Set-Cookie") {
		if m := sessionPairRe.FindStringSubmatch(cookie); len(m) > 1 {
			return strings.TrimSpace(m[1])
		}
	}
	return ""
}

func setCookieNames(header http.Header) []string {
	var names []string
	for _, cookie := range header.Values("Set-Cookie") {
		pair := strings.SplitN(cookie, ";", 2)[0]
		eq := strings.Index(pair, "=")
		name := pair
		if eq >= 0 {
			name = pair[:eq]
		}
		name = strings.TrimSpace(name)
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}
