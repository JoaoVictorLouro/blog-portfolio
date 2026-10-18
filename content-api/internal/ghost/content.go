package ghost

type Tag struct {
	Slug string `json:"slug"`
}

type Content struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
	URL   string `json:"url,omitempty"`
	Tags  []Tag  `json:"tags,omitempty"`
}
