/** @typedef {{ title: string, excerpt: string, html: string, slug: string }} DemoArticleCopy */

/** @typedef {{ id: string, publicTag: string, locales: Record<string, DemoArticleCopy> }} DemoArticleGroup */

/** @type {readonly DemoArticleGroup[]} */
export const DEMO_ARTICLE_GROUPS = [
  {
    id: 'neon-protocol-overview',
    publicTag: 'Architecture',
    locales: {
      'en-us': {
        title: 'NEON_PROTOCOL // SYSTEM_OVERVIEW',
        excerpt: 'A cyber-nomad blog stack — Ghost 6, locale routes, and terminal chrome.',
        slug: 'neon-protocol-overview',
        html: `<p>The neon-protocol theme runs on Ghost with locale-prefixed routes: <code>/en-us/</code>, <code>/ja-jp/</code>, <code>/pt-br/</code>, and <code>/es-la/</code>.</p>
<p>Each article carries an internal language tag and an optional translation group tag so the language switcher can link localized versions.</p>
<h2 id="signal-chain">Signal chain</h2>
<ul>
  <li>Theme UI strings via Handlebars <code>np-t</code> partial</li>
  <li>Content filtered by internal <code>#lang-*</code> tags</li>
  <li>Translation map built by the Deno sidecar</li>
</ul>`,
      },
      'ja-jp': {
        title: 'NEON_PROTOCOL // システム概要',
        excerpt: 'サイバーノマド向けブログ — Ghost 6、ロケールルート、ターミナルUI。',
        slug: 'neon-protocol-overview-ja',
        html: `<p>neon-protocol テーマは Ghost 上で動作し、<code>/en-us/</code>、<code>/ja-jp/</code>、<code>/pt-br/</code>、<code>/es-la/</code> のロケール付きルートを提供します。</p>
<p>各記事には内部言語タグと、任意の翻訳グループタグが付き、言語スイッターがローカライズ版をリンクします。</p>
<h2 id="signal-chain">シグナルチェーン</h2>
<ul>
  <li>Handlebars <code>np-t</code> パーシャルによる UI 文字列</li>
  <li>内部 <code>#lang-*</code> タグによるコンテンツフィルタ</li>
  <li>Deno サイドカーによる翻訳マップ</li>
</ul>`,
      },
      'pt-br': {
        title: 'NEON_PROTOCOL // VISÃO_DO_SISTEMA',
        excerpt: 'Blog cyber-nomad — Ghost 6, rotas por locale e chrome terminal.',
        slug: 'neon-protocol-overview-pt',
        html: `<p>O tema neon-protocol roda no Ghost com rotas prefixadas: <code>/en-us/</code>, <code>/ja-jp/</code>, <code>/pt-br/</code> e <code>/es-la/</code>.</p>
<p>Cada artigo recebe uma tag de idioma interna e, opcionalmente, uma tag de grupo de tradução para o seletor de idioma.</p>
<h2 id="signal-chain">Cadeia de sinal</h2>
<ul>
  <li>Strings de UI via partial Handlebars <code>np-t</code></li>
  <li>Conteúdo filtrado por tags internas <code>#lang-*</code></li>
  <li>Mapa de tradução gerado pelo sidecar Deno</li>
</ul>`,
      },
      'es-la': {
        title: 'NEON_PROTOCOL // RESUMEN_DEL_SISTEMA',
        excerpt: 'Blog cyber-nómada — Ghost 6, rutas por locale y chrome terminal.',
        slug: 'neon-protocol-overview-es',
        html: `<p>El tema neon-protocol corre en Ghost con rutas prefijadas: <code>/en-us/</code>, <code>/ja-jp/</code>, <code>/pt-br/</code> y <code>/es-la/</code>.</p>
<p>Cada artículo lleva una etiqueta de idioma interna y, opcionalmente, una etiqueta de grupo de traducción para el selector de idioma.</p>
<h2 id="signal-chain">Cadena de señal</h2>
<ul>
  <li>Cadenas de UI vía partial Handlebars <code>np-t</code></li>
  <li>Contenido filtrado por etiquetas internas <code>#lang-*</code></li>
  <li>Mapa de traducción generado por el sidecar Deno</li>
</ul>`,
      },
    },
  },
  {
    id: 'locale-routing-guide',
    publicTag: 'Routing',
    locales: {
      'en-us': {
        title: 'LOCALE_ROUTING // PATH_MATRIX',
        excerpt: 'How locale segments map to collections, templates, and newsletters.',
        slug: 'locale-routing-guide',
        html: `<p>English (US) is the default locale. Posts without a foreign language tag appear under <code>/en-us/</code>.</p>
<p>Other locales require an explicit <code>#lang-ja-jp</code>, <code>#lang-pt-br</code>, or <code>#lang-es-la</code> tag.</p>
<blockquote><p>Switch languages from the nav picker — the current section path is preserved.</p></blockquote>`,
      },
      'ja-jp': {
        title: 'LOCALE_ROUTING // パスマトリクス',
        excerpt: 'ロケールセグメントとコレクション・テンプレート・ニュースレターの対応。',
        slug: 'locale-routing-guide-ja',
        html: `<p>英語（US）がデフォルトロケールです。外国語タグのない投稿は <code>/en-us/</code> に表示されます。</p>
<p>他のロケールには <code>#lang-ja-jp</code>、<code>#lang-pt-br</code>、<code>#lang-es-la</code> タグが必要です。</p>
<blockquote><p>ナビの言語ピッカーで切り替え — 現在のセクションパスを維持します。</p></blockquote>`,
      },
      'pt-br': {
        title: 'LOCALE_ROUTING // MATRIZ_DE_ROTAS',
        excerpt: 'Como os segmentos de locale mapeiam coleções, templates e newsletters.',
        slug: 'locale-routing-guide-pt',
        html: `<p>English (US) é o locale padrão. Posts sem tag de idioma estrangeiro aparecem em <code>/en-us/</code>.</p>
<p>Outros locales exigem tag <code>#lang-ja-jp</code>, <code>#lang-pt-br</code> ou <code>#lang-es-la</code>.</p>
<blockquote><p>Troque idiomas pelo seletor na nav — o caminho da seção atual é preservado.</p></blockquote>`,
      },
      'es-la': {
        title: 'LOCALE_ROUTING // MATRIZ_DE_RUTAS',
        excerpt: 'Cómo los segmentos de locale mapean colecciones, plantillas y newsletters.',
        slug: 'locale-routing-guide-es',
        html: `<p>English (US) es el locale predeterminado. Los posts sin etiqueta de idioma extranjero aparecen en <code>/en-us/</code>.</p>
<p>Otros locales requieren etiqueta <code>#lang-ja-jp</code>, <code>#lang-pt-br</code> o <code>#lang-es-la</code>.</p>
<blockquote><p>Cambia idioma desde el selector en la nav — se conserva la ruta de la sección actual.</p></blockquote>`,
      },
    },
  },
  {
    id: 'translation-tagging',
    publicTag: 'Editorial',
    locales: {
      'en-us': {
        title: 'TRANSLATION_TAGS // EDITOR_PROTOCOL',
        excerpt: 'Tag every post with one language tag and one shared translation group.',
        slug: 'translation-tagging',
        html: `<p>To link translations, assign the same internal tag on each locale version:</p>
<pre><code>#translation-neon-protocol-overview</code></pre>
<p>The content API scans published posts and pages and serves the translation map at <code>/contentapi/i18n/article-translations.json</code> for the theme widget.</p>
<p>Assign each version to the matching locale newsletter when publishing.</p>`,
      },
      'ja-jp': {
        title: 'TRANSLATION_TAGS // 編集プロトコル',
        excerpt: '各投稿に言語タグ1つと共有翻訳グループタグを付与。',
        slug: 'translation-tagging-ja',
        html: `<p>翻訳をリンクするには、各ロケール版に同じ内部タグを付けます:</p>
<pre><code>#translation-neon-protocol-overview</code></pre>
<p>コンテンツ API が公開投稿とページをスキャンし、テーマウィジェット用の翻訳マップを <code>/contentapi/i18n/article-translations.json</code> で提供します。</p>
<p>公開時に各版を該当ロケールのニュースレターに割り当ててください。</p>`,
      },
      'pt-br': {
        title: 'TRANSLATION_TAGS // PROTOCOLO_EDITORIAL',
        excerpt: 'Marque cada post com uma tag de idioma e um grupo de tradução compartilhado.',
        slug: 'translation-tagging-pt',
        html: `<p>Para vincular traduções, use a mesma tag interna em cada versão:</p>
<pre><code>#translation-neon-protocol-overview</code></pre>
<p>A content API varre posts e páginas publicados e serve o mapa de traduções em <code>/contentapi/i18n/article-translations.json</code> para o widget do tema.</p>
<p>Atribua cada versão ao newsletter do locale correspondente ao publicar.</p>`,
      },
      'es-la': {
        title: 'TRANSLATION_TAGS // PROTOCOLO_EDITORIAL',
        excerpt: 'Etiqueta cada post con un idioma y un grupo de traducción compartido.',
        slug: 'translation-tagging-es',
        html: `<p>Para enlazar traducciones, asigna la misma etiqueta interna en cada versión:</p>
<pre><code>#translation-neon-protocol-overview</code></pre>
<p>La content API escanea posts y páginas publicados y sirve el mapa de traducciones en <code>/contentapi/i18n/article-translations.json</code> para el widget del tema.</p>
<p>Asigna cada versión al newsletter del locale al publicar.</p>`,
      },
    },
  },
];

export function translationTagName(groupId) {
  return `#translation-${groupId}`;
}

export function translationTagSlug(groupId) {
  return `hash-translation-${groupId}`;
}
