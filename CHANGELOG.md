# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-03-20

- Add CI workflow

## [0.1.0] - 2026-03-20

### Added

- `match(pattern, path)` for path matching with `:param` and `*wildcard` extraction
- `compile(pattern, params)` for building paths from patterns and parameter values
- `test(pattern, path)` for boolean pattern matching
- `rank(patterns)` for sorting patterns by specificity
- `toRegex(pattern)` for compiling patterns to RegExp with named capture groups
