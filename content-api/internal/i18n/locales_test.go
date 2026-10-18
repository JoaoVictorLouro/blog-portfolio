package i18n

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestLocalesMatchScriptsRegistry(t *testing.T) {
	repoRoot := filepath.Join("..", "..", "..")
	localesPath := filepath.Join(repoRoot, "scripts", "i18n", "locales.mjs")
	data, err := os.ReadFile(localesPath)
	if err != nil {
		t.Skip("locales.mjs not found from test cwd:", err)
	}

	tagSlugRe := regexp.MustCompile(`tagSlug:\s*'([^']+)'`)
	codeRe := regexp.MustCompile(`code:\s*'([^']+)'`)

	content := string(data)
	tagSlugs := tagSlugRe.FindAllStringSubmatch(content, -1)
	codes := codeRe.FindAllStringSubmatch(content, -1)
	if len(tagSlugs) != len(locales) || len(codes) != len(locales) {
		t.Fatalf("locale count mismatch: mjs tags=%d codes=%d go=%d", len(tagSlugs), len(codes), len(locales))
	}

	for i, locale := range locales {
		if codes[i][1] != locale.Code {
			t.Errorf("code[%d]: go=%s mjs=%s", i, locale.Code, codes[i][1])
		}
		if tagSlugs[i][1] != locale.TagSlug {
			t.Errorf("tagSlug[%d]: go=%s mjs=%s", i, locale.TagSlug, tagSlugs[i][1])
		}
	}

	if !strings.Contains(content, TranslationTagPrefix) {
		t.Fatalf("expected prefix %s in locales.mjs", TranslationTagPrefix)
	}
}
