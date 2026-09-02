import { assertEquals } from 'jsr:@std/assert@1';
import { buildTranslationMap } from './build-map.ts';

Deno.test('buildTranslationMap groups posts by translation tag and locale', () => {
  const map = buildTranslationMap(
    [
      {
        id: '1',
        title: 'Hello World',
        slug: 'hello-world',
        url: '/en-us/articles/hello-world/',
        tags: [{ slug: 'hash-lang-en-us' }, { slug: 'hash-translation-hello-world' }],
      },
      {
        id: '2',
        title: 'Olá Mundo',
        slug: 'ola-mundo',
        url: '/pt-br/articles/ola-mundo/',
        tags: [{ slug: 'hash-lang-pt-br' }, { slug: 'hash-translation-hello-world' }],
      },
      {
        id: '3',
        title: 'Untagged',
        slug: 'untagged',
        url: '/en-us/articles/untagged/',
        tags: [{ slug: 'hash-lang-en-us' }],
      },
    ],
    'http://localhost:2368',
  );

  assertEquals(Object.keys(map.groups), ['hello-world']);
  assertEquals(map.groups['hello-world']['en-us'], {
    url: '/en-us/articles/hello-world/',
    title: 'Hello World',
  });
  assertEquals(map.groups['hello-world']['pt-br'], {
    url: '/pt-br/articles/ola-mundo/',
    title: 'Olá Mundo',
  });
  assertEquals(map.by_url['http://localhost:2368/en-us/articles/hello-world/'], 'hello-world');
  assertEquals(map.by_url['http://localhost:2368/pt-br/articles/ola-mundo/'], 'hello-world');
});

Deno.test('buildTranslationMap normalizes absolute post URLs from Ghost Admin API', () => {
  const map = buildTranslationMap(
    [
      {
        id: '1',
        title: 'Hello World',
        slug: 'hello-world',
        url: 'http://localhost:2368/en-us/articles/hello-world/',
        tags: [{ slug: 'hash-lang-en-us' }, { slug: 'hash-translation-hello-world' }],
      },
      {
        id: '2',
        title: 'Olá Mundo',
        slug: 'ola-mundo',
        url: 'http://localhost:2368/pt-br/articles/ola-mundo/',
        tags: [{ slug: 'hash-lang-pt-br' }, { slug: 'hash-translation-hello-world' }],
      },
    ],
    'http://localhost:2368',
  );

  assertEquals(map.groups['hello-world']['en-us'].url, '/en-us/articles/hello-world/');
  assertEquals(map.by_url['http://localhost:2368/en-us/articles/hello-world/'], 'hello-world');
});
