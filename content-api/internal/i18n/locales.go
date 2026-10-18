package i18n

const DefaultLocale = "en-us"

const TranslationTagPrefix = "hash-translation-"

type localeDef struct {
	Code    string
	TagSlug string
}

var locales = []localeDef{
	{Code: "en-us", TagSlug: "hash-lang-en-us"},
	{Code: "ja-jp", TagSlug: "hash-lang-ja-jp"},
	{Code: "pt-br", TagSlug: "hash-lang-pt-br"},
	{Code: "es-la", TagSlug: "hash-lang-es-la"},
}

func localeFromTagSlug(tagSlug string) string {
	for _, locale := range locales {
		if locale.TagSlug == tagSlug {
			return locale.Code
		}
	}
	return ""
}

func translationGroupFromTagSlug(tagSlug string) string {
	if !hasPrefix(tagSlug, TranslationTagPrefix) {
		return ""
	}
	return tagSlug[len(TranslationTagPrefix):]
}

func hasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
