package ghost

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const acceptVersion = "v6.0"

type AuthKind int

const (
	AuthJWT     AuthKind = 1
	AuthSession AuthKind = 2
)

type Auth struct {
	Kind        AuthKind
	AdminAPIKey string
	Cookie      string
}

type Client struct {
	APIBase    string
	Origin     string
	HTTPClient *http.Client
}

func NewClient(apiBase string, origin string) *Client {
	return &Client{
		APIBase: strings.TrimSuffix(apiBase, "/"),
		Origin:  origin,
		HTTPClient: &http.Client{
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
			Timeout: 120 * time.Second,
		},
	}
}

func (c *Client) CreateAdminSession(email string, password string) (string, error) {
	sessionPath := "/ghost/api/admin/session/"
	body, _ := json.Marshal(map[string]string{"username": email, "password": password})

	req, err := http.NewRequest(http.MethodPost, c.APIBase+sessionPath, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	setCommonHeaders(req, c.Origin)
	req.Header.Set("Content-Type", "application/json")

	started := time.Now()
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	logGhostHTTP("POST", sessionPath, resp.StatusCode, time.Since(started), resp.Header,
		fmt.Sprintf("sessionCookie=%s", map[bool]string{true: "yes", false: "no"}[extractAdminSessionCookie(resp.Header) != ""]))

	if err := throwIfAdminRedirect(resp); err != nil {
		return "", err
	}

	session := extractAdminSessionCookie(resp.Header)
	text, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 403 {
		return "", fmt.Errorf(
			"Admin login requires device verification. Set security__staffDeviceVerification=false, configure SMTP, or set GHOST_ADMIN_API_KEY. %s",
			text,
		)
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 300 && session == "" {
		names := setCookieNames(resp.Header)
		return "", fmt.Errorf(
			"Admin login succeeded (%d) but no session Set-Cookie (names: %s)",
			resp.StatusCode,
			strings.Join(names, ","),
		)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 || session == "" {
		return "", fmt.Errorf("Admin login failed (%d): %s", resp.StatusCode, text)
	}
	return session, nil
}

func (c *Client) FetchPublishedPosts(auth Auth) ([]Content, error) {
	return c.fetchPublishedResource(auth, "posts")
}

func (c *Client) FetchPublishedPages(auth Auth) ([]Content, error) {
	return c.fetchPublishedResource(auth, "pages")
}

func (c *Client) fetchPublishedResource(auth Auth, resource string) ([]Content, error) {
	var items []Content
	page := 1
	pages := 1

	for page <= pages {
		path := fmt.Sprintf(
			"/ghost/api/admin/%s/?filter=status:published&include=tags&limit=100&page=%d",
			resource,
			page,
		)
		data, err := c.adminRequest(auth, path)
		if err != nil {
			return nil, err
		}

		raw, ok := data[resource]
		if ok {
			batch, err := decodePosts(raw)
			if err != nil {
				return nil, err
			}
			items = append(items, batch...)
		}

		if meta, ok := data["meta"].(map[string]interface{}); ok {
			if pagination, ok := meta["pagination"].(map[string]interface{}); ok {
				if p, ok := pagination["pages"].(float64); ok {
					pages = int(p)
				}
			}
		}
		page++
	}

	return items, nil
}

func decodePosts(raw interface{}) ([]Content, error) {
	b, err := json.Marshal(raw)
	if err != nil {
		return nil, err
	}
	var posts []Content
	if err := json.Unmarshal(b, &posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func (c *Client) adminRequest(auth Auth, path string) (map[string]interface{}, error) {
	req, err := http.NewRequest(http.MethodGet, c.APIBase+path, nil)
	if err != nil {
		return nil, err
	}
	if err := c.applyAuth(req, auth); err != nil {
		return nil, err
	}

	started := time.Now()
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	logGhostHTTP("GET", path, resp.StatusCode, time.Since(started), resp.Header, "")

	if err := throwIfAdminRedirect(resp); err != nil {
		return nil, err
	}

	text, _ := io.ReadAll(resp.Body)
	var data map[string]interface{}
	if len(text) > 0 {
		if err := json.Unmarshal(text, &data); err != nil {
			data = map[string]interface{}{"raw": string(text)}
		}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Admin request failed (%d) %s: %s", resp.StatusCode, path, text)
	}
	if data == nil {
		data = map[string]interface{}{}
	}
	return data, nil
}

func (c *Client) applyAuth(req *http.Request, auth Auth) error {
	setCommonHeaders(req, c.Origin)
	switch auth.Kind {
	case AuthJWT:
		token, err := CreateAdminJWT(auth.AdminAPIKey, time.Now().Unix(), jwtTTLSeconds)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Ghost "+token)
	case AuthSession:
		req.Header.Set("Cookie", auth.Cookie)
	default:
		return fmt.Errorf("unknown auth kind")
	}
	return nil
}

func setCommonHeaders(req *http.Request, origin string) {
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Version", acceptVersion)
	req.Header.Set("Origin", origin)
	for k, v := range AdminTransportHeaders(origin) {
		if k == "Host" {
			req.Host = v
			continue
		}
		req.Header.Set(k, v)
	}
}

func throwIfAdminRedirect(resp *http.Response) error {
	if resp.StatusCode != 301 && resp.StatusCode != 302 {
		return nil
	}
	location := resp.Header.Get("Location")
	if location == "" {
		location = "unknown location"
	}
	return fmt.Errorf("Admin request redirected (%d) to %s", resp.StatusCode, location)
}

func parseOriginURL(origin string) (*url.URL, error) {
	return url.Parse(origin)
}

func logGhostHTTP(method string, path string, status int, duration time.Duration, header http.Header, extra string) {
	pathForLog := path
	if idx := strings.Index(pathForLog, "?"); idx >= 0 {
		pathForLog = pathForLog[:idx]
	}
	names := setCookieNames(header)
	cookiePart := "-"
	if len(names) > 0 {
		cookiePart = strings.Join(names, ",")
	}
	extraPart := ""
	if extra != "" {
		extraPart = " " + extra
	}
	fmt.Printf(
		"Ghost %s %s -> %d %dms set-cookie=[%s]%s\n",
		method,
		pathForLog,
		status,
		duration.Milliseconds(),
		cookiePart,
		extraPart,
	)
}
