/**
 * Result of a successful path match.
 */
export interface MatchResult {
  /** Extracted named parameters from `:param` segments. */
  params: Record<string, string>;
  /** The matched path. */
  path: string;
  /** The pattern that was matched against. */
  pattern: string;
}

/**
 * Options for pattern compilation.
 */
export interface CompileOptions {
  /** Whether to encode URI components. Defaults to `true`. */
  encode?: boolean;
}

/**
 * A parsed segment of a pattern.
 */
interface ParsedSegment {
  type: 'static' | 'param' | 'wildcard';
  name: string;
  value: string;
}

/**
 * Parses a pattern string into segments.
 */
function parsePattern(pattern: string): ParsedSegment[] {
  const normalized = normalizeSlashes(pattern);
  const parts = normalized.split('/').filter(Boolean);
  const segments: ParsedSegment[] = [];

  for (const part of parts) {
    if (part.startsWith(':')) {
      segments.push({ type: 'param', name: part.slice(1), value: part });
    } else if (part === '*') {
      segments.push({ type: 'wildcard', name: '*', value: part });
    } else if (part.startsWith('*')) {
      segments.push({ type: 'wildcard', name: part.slice(1) || '*', value: part });
    } else {
      segments.push({ type: 'static', name: '', value: part });
    }
  }

  return segments;
}

/**
 * Normalizes slashes in a path, removing trailing slashes and collapsing duplicates.
 */
function normalizeSlashes(path: string): string {
  return '/' + path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

/**
 * Matches a URL path against a pattern, extracting named parameters and wildcards.
 *
 * Patterns support:
 * - `:param` - Named parameters that match a single path segment
 * - `*` or `*name` - Wildcard that matches one or more remaining segments
 *
 * @param pattern - The pattern to match against (e.g., `/users/:id/posts`)
 * @param path - The actual URL path to match (e.g., `/users/42/posts`)
 * @returns A `MatchResult` if the path matches, or `null` if it does not
 *
 * @example
 * ```ts
 * match('/users/:id', '/users/42');
 * // { params: { id: '42' }, path: '/users/42', pattern: '/users/:id' }
 *
 * match('/files/*path', '/files/docs/readme.md');
 * // { params: { path: 'docs/readme.md' }, path: '/files/docs/readme.md', pattern: '/files/*path' }
 * ```
 */
export function match(pattern: string, path: string): MatchResult | null {
  const segments = parsePattern(pattern);
  const normalizedPath = normalizeSlashes(path);
  const pathParts = normalizedPath.split('/').filter(Boolean);

  const params: Record<string, string> = {};
  let pathIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.type === 'wildcard') {
      if (pathIndex >= pathParts.length) {
        return null;
      }
      const remaining = pathParts.slice(pathIndex).join('/');
      params[segment.name] = remaining;
      pathIndex = pathParts.length;
    } else if (segment.type === 'param') {
      if (pathIndex >= pathParts.length) {
        return null;
      }
      params[segment.name] = decodeURIComponent(pathParts[pathIndex]);
      pathIndex++;
    } else {
      if (pathIndex >= pathParts.length || pathParts[pathIndex] !== segment.value) {
        return null;
      }
      pathIndex++;
    }
  }

  if (pathIndex !== pathParts.length) {
    return null;
  }

  return {
    params,
    path: normalizedPath,
    pattern: normalizeSlashes(pattern),
  };
}

/**
 * Compiles a pattern with the given parameters into a concrete path.
 *
 * @param pattern - The pattern to compile (e.g., `/users/:id`)
 * @param params - An object of parameter values to substitute
 * @param options - Compilation options
 * @returns The compiled path string
 * @throws {Error} If a required parameter is missing
 *
 * @example
 * ```ts
 * compile('/users/:id/posts/:postId', { id: '42', postId: '7' });
 * // '/users/42/posts/7'
 * ```
 */
export function compile(
  pattern: string,
  params: Record<string, string> = {},
  options: CompileOptions = {},
): string {
  const { encode = true } = options;
  const segments = parsePattern(pattern);
  const parts: string[] = [];

  for (const segment of segments) {
    if (segment.type === 'param') {
      const value = params[segment.name];
      if (value === undefined) {
        throw new Error(`Missing required parameter: "${segment.name}"`);
      }
      parts.push(encode ? encodeURIComponent(value) : value);
    } else if (segment.type === 'wildcard') {
      const value = params[segment.name];
      if (value === undefined) {
        throw new Error(`Missing required parameter: "${segment.name}"`);
      }
      parts.push(value);
    } else {
      parts.push(segment.value);
    }
  }

  return '/' + parts.join('/');
}

/**
 * Tests whether a path matches a pattern without extracting parameters.
 *
 * @param pattern - The pattern to test against
 * @param path - The URL path to test
 * @returns `true` if the path matches the pattern, `false` otherwise
 *
 * @example
 * ```ts
 * test('/users/:id', '/users/42');    // true
 * test('/users/:id', '/posts/42');    // false
 * ```
 */
export function test(pattern: string, path: string): boolean {
  return match(pattern, path) !== null;
}

/**
 * Ranks an array of patterns by specificity, from most specific to least specific.
 *
 * Ranking rules (higher score = more specific):
 * - Static segments score highest
 * - Named parameters score medium
 * - Wildcards score lowest
 *
 * @param patterns - An array of pattern strings to rank
 * @returns A new array of patterns sorted by specificity (most specific first)
 *
 * @example
 * ```ts
 * rank(['/users/*', '/users/:id', '/users/admin']);
 * // ['/users/admin', '/users/:id', '/users/*']
 * ```
 */
export function rank(patterns: string[]): string[] {
  return [...patterns].sort((a, b) => {
    const scoreA = computeScore(a);
    const scoreB = computeScore(b);
    return scoreB - scoreA;
  });
}

/**
 * Computes a specificity score for a pattern.
 * Higher scores indicate more specific patterns.
 */
function computeScore(pattern: string): number {
  const segments = parsePattern(pattern);
  let score = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const positionWeight = (segments.length - i) * 10;

    if (segment.type === 'static') {
      score += 3 * positionWeight;
    } else if (segment.type === 'param') {
      score += 2 * positionWeight;
    } else if (segment.type === 'wildcard') {
      score += 1;
    }
  }

  // Longer patterns with more static segments are more specific
  score += segments.filter((s) => s.type === 'static').length * 100;

  return score;
}

/**
 * Compiles a pattern into a regular expression for advanced matching.
 *
 * @param pattern - The pattern to convert to a RegExp
 * @returns A `RegExp` that matches paths conforming to the pattern, with named capture groups
 *
 * @example
 * ```ts
 * const re = toRegex('/users/:id');
 * re.test('/users/42');  // true
 * '/users/42'.match(re); // groups: { id: '42' }
 * ```
 */
export function toRegex(pattern: string): RegExp {
  const segments = parsePattern(pattern);
  let regexStr = '^';

  for (const segment of segments) {
    if (segment.type === 'static') {
      regexStr += `\\/${escapeRegex(segment.value)}`;
    } else if (segment.type === 'param') {
      regexStr += `\\/(?<${segment.name}>[^\\/]+)`;
    } else if (segment.type === 'wildcard') {
      const name = segment.name === '*' ? 'wildcard' : segment.name;
      regexStr += `\\/(?<${name}>.+)`;
    }
  }

  regexStr += '$';
  return new RegExp(regexStr);
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
