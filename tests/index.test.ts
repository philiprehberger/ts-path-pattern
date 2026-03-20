import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { match, compile, test as testPath, rank, toRegex } from '../dist/index.js';

describe('match', () => {
  it('should match a static path', () => {
    const result = match('/users', '/users');
    assert.deepStrictEqual(result, {
      params: {},
      path: '/users',
      pattern: '/users',
    });
  });

  it('should extract named parameters', () => {
    const result = match('/users/:id', '/users/42');
    assert.deepStrictEqual(result, {
      params: { id: '42' },
      path: '/users/42',
      pattern: '/users/:id',
    });
  });

  it('should extract multiple parameters', () => {
    const result = match('/users/:userId/posts/:postId', '/users/5/posts/99');
    assert.deepStrictEqual(result, {
      params: { userId: '5', postId: '99' },
      path: '/users/5/posts/99',
      pattern: '/users/:userId/posts/:postId',
    });
  });

  it('should match wildcard patterns', () => {
    const result = match('/files/*path', '/files/docs/readme.md');
    assert.deepStrictEqual(result, {
      params: { path: 'docs/readme.md' },
      path: '/files/docs/readme.md',
      pattern: '/files/*path',
    });
  });

  it('should match unnamed wildcard', () => {
    const result = match('/static/*', '/static/css/main.css');
    assert.deepStrictEqual(result, {
      params: { '*': 'css/main.css' },
      path: '/static/css/main.css',
      pattern: '/static/*',
    });
  });

  it('should return null for non-matching paths', () => {
    const result = match('/users/:id', '/posts/42');
    assert.strictEqual(result, null);
  });

  it('should return null when path has extra segments', () => {
    const result = match('/users/:id', '/users/42/posts');
    assert.strictEqual(result, null);
  });

  it('should return null when path has fewer segments', () => {
    const result = match('/users/:id/posts', '/users/42');
    assert.strictEqual(result, null);
  });

  it('should decode URI components in parameters', () => {
    const result = match('/search/:query', '/search/hello%20world');
    assert.deepStrictEqual(result?.params, { query: 'hello world' });
  });

  it('should normalize trailing slashes', () => {
    const result = match('/users/:id/', '/users/42/');
    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.params.id, '42');
  });
});

describe('compile', () => {
  it('should compile a pattern with parameters', () => {
    const result = compile('/users/:id', { id: '42' });
    assert.strictEqual(result, '/users/42');
  });

  it('should compile multiple parameters', () => {
    const result = compile('/users/:id/posts/:postId', { id: '5', postId: '99' });
    assert.strictEqual(result, '/users/5/posts/99');
  });

  it('should compile wildcard parameters', () => {
    const result = compile('/files/*path', { path: 'docs/readme.md' });
    assert.strictEqual(result, '/files/docs/readme.md');
  });

  it('should encode URI components by default', () => {
    const result = compile('/search/:query', { query: 'hello world' });
    assert.strictEqual(result, '/search/hello%20world');
  });

  it('should skip encoding when disabled', () => {
    const result = compile('/search/:query', { query: 'hello world' }, { encode: false });
    assert.strictEqual(result, '/search/hello world');
  });

  it('should throw for missing parameters', () => {
    assert.throws(() => compile('/users/:id', {}), {
      message: 'Missing required parameter: "id"',
    });
  });

  it('should compile static patterns unchanged', () => {
    const result = compile('/about', {});
    assert.strictEqual(result, '/about');
  });
});

describe('test', () => {
  it('should return true for matching paths', () => {
    assert.strictEqual(testPath('/users/:id', '/users/42'), true);
  });

  it('should return false for non-matching paths', () => {
    assert.strictEqual(testPath('/users/:id', '/posts/42'), false);
  });

  it('should handle wildcard patterns', () => {
    assert.strictEqual(testPath('/files/*', '/files/a/b/c'), true);
  });

  it('should handle static patterns', () => {
    assert.strictEqual(testPath('/about', '/about'), true);
    assert.strictEqual(testPath('/about', '/contact'), false);
  });
});

describe('rank', () => {
  it('should sort patterns by specificity', () => {
    const patterns = ['/users/*', '/users/:id', '/users/admin'];
    const ranked = rank(patterns);
    assert.strictEqual(ranked[0], '/users/admin');
    assert.strictEqual(ranked[1], '/users/:id');
    assert.strictEqual(ranked[2], '/users/*');
  });

  it('should rank longer static patterns higher', () => {
    const patterns = ['/a', '/a/b', '/a/b/c'];
    const ranked = rank(patterns);
    assert.strictEqual(ranked[0], '/a/b/c');
    assert.strictEqual(ranked[1], '/a/b');
    assert.strictEqual(ranked[2], '/a');
  });

  it('should not mutate the original array', () => {
    const patterns = ['/b', '/a'];
    const ranked = rank(patterns);
    assert.notStrictEqual(ranked, patterns);
    assert.strictEqual(patterns[0], '/b');
  });
});

describe('toRegex', () => {
  it('should create a regex for static patterns', () => {
    const re = toRegex('/users');
    assert.strictEqual(re.test('/users'), true);
    assert.strictEqual(re.test('/posts'), false);
  });

  it('should create a regex with named capture groups for params', () => {
    const re = toRegex('/users/:id');
    const result = '/users/42'.match(re);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.groups?.id, '42');
  });

  it('should create a regex for wildcard patterns', () => {
    const re = toRegex('/files/*path');
    const result = '/files/docs/readme.md'.match(re);
    assert.notStrictEqual(result, null);
    assert.strictEqual(result?.groups?.path, 'docs/readme.md');
  });

  it('should use "wildcard" as group name for unnamed wildcards', () => {
    const re = toRegex('/static/*');
    const result = '/static/css/main.css'.match(re);
    assert.strictEqual(result?.groups?.wildcard, 'css/main.css');
  });

  it('should not match partial paths', () => {
    const re = toRegex('/users/:id');
    assert.strictEqual(re.test('/users/42/extra'), false);
  });

  it('should handle multiple parameters', () => {
    const re = toRegex('/users/:userId/posts/:postId');
    const result = '/users/5/posts/99'.match(re);
    assert.strictEqual(result?.groups?.userId, '5');
    assert.strictEqual(result?.groups?.postId, '99');
  });
});
