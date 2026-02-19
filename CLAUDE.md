# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`imageco` is a CLI tool that batch-converts/compresses directories of images (jpg/png/webp) to webp or avif format using sharp. Published to npm as a single-file binary (`build/index.js`).

## Commands

- **Build:** `pnpm run build` (runs `tsc`, outputs to `build/`)
- **Run (compiled):** `pnpm run main -- [args]`
- **Run (dev):** `pnpm run dev -- [args]`
- **Debug:** `pnpm run dev:debug -- [args]` (enables `DEBUG=imageco:*`)
- **Format:** `pnpm run format` (prettier)
- **Test:** `pnpm test` (runs `bun test` -- unit + integration tests in `tests/`)
- **Release:** `pnpm run release:patch` / `release:minor` / `release:major` (builds, formats, versions, publishes to npm, creates GitHub release)

## Architecture

CLI entry point in `src/index.ts` with shared types and constants extracted to `src/utils.ts`. Two modes:

- **File mode**: positional args (`imageco photo.png screenshot.jpg`) — converts specific files
- **Directory mode**: `--input`/`--output` flags — recursively walks input dir

The flow is:
1. Parse CLI args with `node:util.parseArgs` (positional files or input dir, output dir, quality, format)
2. Validate options (format must be webp/avif, quality 1-100, input dir/files must exist)
3. Collect files — either from positional args (file mode) or by recursively walking input directory (directory mode)
4. For each file: if extension is supported (png/jpg/jpeg/webp), convert with sharp to target format; otherwise copy as-is (dir mode) or skip (file mode)
5. Print results table and summary

## Key Details

- Uses `debug` package with namespace `imageco:*` for debug logging
- TypeScript with `@total-typescript/tsconfig` base config (no-dom/app), output to `build/`
- Package manager: pnpm
- Node >= 20 required
- ESM (`"type": "module"`)
- Tests use bun's built-in test runner (`bun:test`) — unit tests in `tests/utils.test.ts`, integration tests in `tests/cli.test.ts`
