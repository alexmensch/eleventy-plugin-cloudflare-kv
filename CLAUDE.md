# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Eleventy plugin that builds collections from content stored in Cloudflare KV (Key-Value storage). It fetches content at build time, parses YAML frontmatter with gray-matter, and organizes content into Eleventy collections based on KV key structure.

- Node.js >= 20.0.0
- Eleventy >= 3.0.0
- Pure ESM module (no build step)

## Commands

```bash
pnpm test                      # Run Mocha tests
pnpm run test:coverage         # Run tests with c8 coverage
pnpm run test:coverage:report  # Generate HTML coverage report
pnpm run lint                  # ESLint check
pnpm run lint:fix              # ESLint fix
pnpm run format                # Prettier format
pnpm run format:check          # Prettier check
```

## Architecture

The entire plugin is contained in `/index.js` (~200 lines). Key functions:

- **`fetchFromKV(kvBaseUrl, apiToken)`** - Fetches list of all keys from Cloudflare KV namespace
- **`fetchKVValue(kvBaseUrl, apiToken, key)`** - Fetches individual KV value by key
- **`fetchKVCollections(config, quiet)`** - Main orchestrator: validates env vars, fetches keys/values in parallel with Promise.all(), parses frontmatter, organizes into collections
- **`kvCollectionsPlugin(eleventyConfig, userConfig)`** - Plugin export, registers "eleventy.before" event listener

**Collection organization:** KV key structure determines collections:
- `posts/hello-world` → collection: "posts", item key: "hello-world"
- `standalone` → collection: "none", item key: "standalone"

## Testing

Tests are in `/test/index.test.cjs` using Mocha/Chai/Sinon. Coverage thresholds: 90% lines/functions/branches/statements.

Run a single test file: `npx mocha test/index.test.cjs`

Key testing patterns:
- Stub global `fetch` for API testing
- Mock `process.env` for environment variables
- Stub console methods to verify logging behavior

## Code Style

- ESLint 9+ flat config with strict rules
- Double quotes, 2-space indentation, no trailing commas
- Prettier for formatting (80 char width)
- Arrow functions preferred in callbacks
- Console output uses emoji status indicators (✅ 🔄 📁 ❌)
