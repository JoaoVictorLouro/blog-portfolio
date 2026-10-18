package i18n

import (
	"testing"
)

func TestBuildTranslationMapGroupsPosts(t *testing.T) {
	result := BuildTranslationMap([]Post{
		{
			ID: "1", Title: "Hello World", Slug: "hello-world",
			URL:  "/en-us/articles/hello-world/",
			Tags: []Tag{{Slug: "hash-lang-en-us"}, {Slug: "hash-translation-hello-world"}},
		},
		{
			ID: "2", Title: "Olá Mundo", Slug: "ola-mundo",
			URL:  "/pt-br/articles/ola-mundo/",
			Tags: []Tag{{Slug: "hash-lang-pt-br"}, {Slug: "hash-translation-hello-world"}},
		},
		{
			ID: "3", Title: "Untagged", Slug: "untagged",
			URL:  "/en-us/articles/untagged/",
			Tags: []Tag{{Slug: "hash-lang-en-us"}},
		},
	}, "http://localhost:2368")

	if len(result.Groups) != 1 || result.Groups["hello-world"] == nil {
		t.Fatalf("expected one group hello-world, got %v", result.Groups)
	}
	if result.Groups["hello-world"]["en-us"].URL != "/en-us/articles/hello-world/" {
		t.Fatalf("en-us url: %v", result.Groups["hello-world"]["en-us"])
	}
	if result.Groups["hello-world"]["pt-br"].Title != "Olá Mundo" {
		t.Fatalf("pt-br title: %v", result.Groups["hello-world"]["pt-br"])
	}
	if result.ByURL["http://localhost:2368/en-us/articles/hello-world/"] != "hello-world" {
		t.Fatalf("by_url en: %v", result.ByURL)
	}
}

func TestBuildTranslationMapAbsoluteURLs(t *testing.T) {
	result := BuildTranslationMap([]Post{
		{
			ID: "1", Title: "Hello World", Slug: "hello-world",
			URL:  "http://localhost:2368/en-us/articles/hello-world/",
			Tags: []Tag{{Slug: "hash-lang-en-us"}, {Slug: "hash-translation-hello-world"}},
		},
		{
			ID: "2", Title: "Olá Mundo", Slug: "ola-mundo",
			URL:  "http://localhost:2368/pt-br/articles/ola-mundo/",
			Tags: []Tag{{Slug: "hash-lang-pt-br"}, {Slug: "hash-translation-hello-world"}},
		},
	}, "http://localhost:2368")

	if result.Groups["hello-world"]["en-us"].URL != "/en-us/articles/hello-world/" {
		t.Fatalf("normalized path: %v", result.Groups["hello-world"]["en-us"].URL)
	}
}
