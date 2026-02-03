# AGENTS.md - Lasso Repository Guide

## Project Overview
Lasso is a TUI (Terminal User Interface) for managing Cloudflare Wrangler configs in monorepos. Built with Bun, TypeScript, and @opentui/core.

## Build/Test/Lint Commands

```bash
# Development
bun run dev              # Run in development mode

# Building
bun run build            # Build for npm distribution (dist/)
bun run build:binary     # Build standalone binary for current platform
bun run build:release    # Build release binaries for all platforms (uses scripts/build.sh)

# Type Checking
bun run typecheck        # Run TypeScript compiler (tsc --noEmit)

# Testing
bun test                 # Run all tests
bun test <path>          # Run single test file: bun test tests/parser.test.ts
bun test --grep "name"   # Run tests matching pattern

# Publishing
bun run prepublishOnly   # Build before publishing to npm
```

## Code Style Guidelines

### Imports
- Use ES modules (`"type": "module"` in package.json)
- Always use `.ts` extension in imports: `import { foo } from './bar.ts'`
- Use `node:` prefix for Node.js built-ins: `import { readFileSync } from 'node:fs'`
- Group imports: external libraries first, then internal modules
- Named exports preferred over default exports

### TypeScript
- Strict mode enabled with additional checks:
  - `noUncheckedIndexedAccess: true`
  - `noImplicitOverride: true`
  - `noFallthroughCasesInSwitch: true`
- Target: ES2022, Module: ESNext
- Use `type` keyword for type imports: `import type { Foo } from './types.ts'`
- Define types in `src/types/` directory
- Use Zod for runtime schema validation (see src/types/wrangler.ts)
- Prefer interfaces for object shapes, type aliases for unions

### Naming Conventions
- **Files**: kebab-case.ts (e.g., `parse-config.ts`)
- **Classes**: PascalCase (e.g., `LassoApp`, `ProcessController`)
- **Functions/Methods**: camelCase (e.g., `parseConfig`, `startDevServer`)
- **Types/Interfaces**: PascalCase (e.g., `DiscoveredConfig`, `AppState`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (e.g., `COLORS`)
- **Private members**: Use `private` keyword or `#` prefix

### Error Handling
- Use try-catch blocks with specific error types
- Check for `SyntaxError` for JSON parsing, ZodError for validation
- Return error objects rather than throwing when appropriate (see `parseConfig` pattern)
- Always provide descriptive error messages

### Formatting
- 2-space indentation
- No trailing semicolons after imports
- Double quotes for strings
- Max line length: ~100 characters (be reasonable)

### Architecture Patterns
- Organize by feature in `src/` subdirectories: `cli/`, `discovery/`, `runner/`, `ui/`, `types/`
- Each subdirectory exports public API via `index.ts` barrel files
- Use class-based architecture for major components (LassoApp, ProcessController)
- UI panels as classes with lifecycle methods (setFocused, handleKeyPress, etc.)
- State management via reducer pattern (see `appReducer` in src/types/app.ts)

### Testing
- Use Bun's built-in test runner (`bun:test`)
- Test files: `tests/*.test.ts`
- Test fixtures: `tests/fixtures/`
- Group tests with `describe()`, use `test()` for individual cases
- Use `import.meta.dir` for test file paths

## CI/CD
- GitHub Actions workflow in `.github/workflows/release.yml`
- Runs typecheck before building
- Builds cross-platform binaries on tag push (v*)
- Publishes to npm automatically

## Dependencies
- Runtime: @opentui/core, chokidar, fast-glob, strip-json-comments, zod
- Dev: @types/bun, @types/node, typescript
- Requires Bun runtime and Node.js >=18
