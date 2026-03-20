# @philiprehberger/path-pattern

[![npm](https://img.shields.io/npm/v/@philiprehberger/path-pattern)](https://www.npmjs.com/package/@philiprehberger/path-pattern)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

URL path pattern matching and parameter extraction

## Requirements

- Node.js >= 18

## Installation

```bash
npm install @philiprehberger/path-pattern
```

## Usage

```ts
import { match, compile, test, rank, toRegex } from '@philiprehberger/path-pattern';

// Match a path and extract parameters
const result = match('/users/:id/posts/:postId', '/users/42/posts/7');
// { params: { id: '42', postId: '7' }, path: '/users/42/posts/7', pattern: '/users/:id/posts/:postId' }

// Wildcard matching
match('/files/*path', '/files/docs/readme.md');
// { params: { path: 'docs/readme.md' }, ... }

// Compile a pattern with parameters
compile('/users/:id', { id: '42' });
// '/users/42'

// Test if a path matches
test('/users/:id', '/users/42');    // true
test('/users/:id', '/posts/42');    // false

// Rank patterns by specificity
rank(['/users/*', '/users/:id', '/users/admin']);
// ['/users/admin', '/users/:id', '/users/*']

// Convert a pattern to a RegExp
const re = toRegex('/users/:id');
'/users/42'.match(re);  // groups: { id: '42' }
```

## API

### `match(pattern, path)`

Matches a URL path against a pattern and extracts named parameters and wildcards.

- **pattern** `string` - Pattern with `:param` and `*wildcard` segments
- **path** `string` - The URL path to match
- **Returns** `MatchResult | null` - Match result with `params`, `path`, and `pattern`, or `null`

### `compile(pattern, params?, options?)`

Compiles a pattern by substituting parameter values into it.

- **pattern** `string` - The pattern to compile
- **params** `Record<string, string>` - Parameter values to substitute
- **options.encode** `boolean` - Whether to encode URI components (default: `true`)
- **Returns** `string` - The compiled path
- **Throws** `Error` if a required parameter is missing

### `test(pattern, path)`

Tests whether a path matches a pattern without extracting parameters.

- **pattern** `string` - The pattern to test against
- **path** `string` - The URL path to test
- **Returns** `boolean`

### `rank(patterns)`

Sorts an array of patterns by specificity, from most specific to least specific. Static segments rank highest, then named parameters, then wildcards.

- **patterns** `string[]` - Patterns to rank
- **Returns** `string[]` - New sorted array

### `toRegex(pattern)`

Converts a pattern into a `RegExp` with named capture groups.

- **pattern** `string` - The pattern to convert
- **Returns** `RegExp`

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
```

## License

MIT
