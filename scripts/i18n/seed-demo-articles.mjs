import { LOCALES } from './locales.mjs';
import { DEMO_ARTICLE_GROUPS, translationTagName, translationTagSlug } from './demo-articles.mjs';

/**
 * @param {(path: string, options?: { method?: string, cookie?: string, body?: unknown }) => Promise<{ response: Response, data: unknown }>} request
 * @param {(data: unknown) => string} describeError
 * @param {(message: string) => never} fail
 * @param {(cookie: string, options: { name: string, slug: string, description: string }) => Promise<{ id: string, slug: string }>} ensureInternalTag
 * @param {string} cookie
 * @param {Record<string, string>} newsletterMap
 */
export async function seedDemoArticles(
  request,
  describeError,
  fail,
  ensureInternalTag,
  cookie,
  newsletterMap,
) {
  const publicTags = new Map();

  async function ensurePublicTag(name) {
    if (publicTags.has(name)) {
      return publicTags.get(name);
    }

    const filter = encodeURIComponent(`name:'${name.replace(/'/g, "\\'")}'`);
    const existing = await request(`/ghost/api/admin/tags/?filter=${filter}&limit=1`, { cookie });
    if (!existing.response.ok) {
      fail(
        `Failed to query tag "${name}" (${existing.response.status}): ${describeError(existing.data)}`,
      );
    }

    if (Array.isArray(existing.data?.tags) && existing.data.tags.length > 0) {
      publicTags.set(name, existing.data.tags[0]);
      return existing.data.tags[0];
    }

    const created = await request('/ghost/api/admin/tags/', {
      method: 'POST',
      cookie,
      body: { tags: [{ name }] },
    });
    if (!created.response.ok) {
      fail(
        `Failed to create tag "${name}" (${created.response.status}): ${describeError(created.data)}`,
      );
    }

    const tag = created.data?.tags?.[0];
    publicTags.set(name, tag);
    return tag;
  }

  async function findPostBySlug(slug) {
    const filter = encodeURIComponent(`slug:${slug}`);
    const { response, data } = await request(`/ghost/api/admin/posts/?filter=${filter}&limit=1`, {
      cookie,
    });
    if (!response.ok) {
      fail(`Failed to query post "${slug}" (${response.status}): ${describeError(data)}`);
    }
    return data?.posts?.[0] ?? null;
  }

  const langTags = new Map();
  for (const locale of LOCALES) {
    langTags.set(
      locale.code,
      await ensureInternalTag(cookie, {
        name: locale.tagName,
        slug: locale.tagSlug,
        description: `Internal tag for ${locale.label} content`,
      }),
    );
  }

  let created = 0;
  let updated = 0;

  for (const group of DEMO_ARTICLE_GROUPS) {
    const translationTag = await ensureInternalTag(cookie, {
      name: translationTagName(group.id),
      slug: translationTagSlug(group.id),
      description: `Translation group for ${group.id}`,
    });
    const publicTag = await ensurePublicTag(group.publicTag);
    const demoTag = await ensurePublicTag('I18n Demo');

    for (const locale of LOCALES) {
      const copy = group.locales[locale.code];
      if (!copy) {
        continue;
      }

      const langTag = langTags.get(locale.code);
      const tags = [
        { id: langTag.id },
        { id: translationTag.id },
        { id: publicTag.id },
        { id: demoTag.id },
      ];

      const payload = {
        title: copy.title,
        slug: copy.slug,
        custom_excerpt: copy.excerpt,
        html: copy.html,
        status: 'published',
        tags,
        ...(newsletterMap[locale.code]
          ? { newsletters: [{ id: newsletterMap[locale.code] }] }
          : {}),
      };

      const existing = await findPostBySlug(copy.slug);
      if (existing) {
        const { response, data } = await request(
          `/ghost/api/admin/posts/${existing.id}/?source=html`,
          {
            method: 'PUT',
            cookie,
            body: {
              posts: [{ id: existing.id, updated_at: existing.updated_at, ...payload }],
            },
          },
        );
        if (!response.ok) {
          fail(
            `Failed to update demo post ${copy.slug} (${response.status}): ${describeError(data)}`,
          );
        }
        updated += 1;
        console.log(`Updated demo article /${locale.code}/articles/${copy.slug}/`);
        continue;
      }

      const { response, data } = await request('/ghost/api/admin/posts/?source=html', {
        method: 'POST',
        cookie,
        body: { posts: [payload] },
      });
      if (!response.ok) {
        fail(
          `Failed to create demo post ${copy.slug} (${response.status}): ${describeError(data)}`,
        );
      }
      created += 1;
      console.log(`Created demo article /${locale.code}/articles/${copy.slug}/`);
    }
  }

  console.log(
    `Demo articles: ${created} created, ${updated} updated (${DEMO_ARTICLE_GROUPS.length} groups × ${LOCALES.length} locales)`,
  );
}
