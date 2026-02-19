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

CLI entry point in `src/index.ts` with shared types and constants extracted to `src/utils.ts`. The flow is:
1. Parse CLI args with `node:util.parseArgs` (input dir, output dir, quality, format)
2. Validate options (format must be webp/avif, quality 1-100, input dir must exist)
3. Recursively walk input directory, collecting all files
4. For each file: if extension is supported (png/jpg/jpeg/webp), convert with sharp to target format; otherwise copy as-is to output dir preserving directory structure
5. Print results table and summary

## Key Details

- Uses `debug` package with namespace `imageco:*` for debug logging
- TypeScript with `@total-typescript/tsconfig` base config (no-dom/app), output to `build/`
- Package manager: pnpm
- Node >= 20 required
- ESM (`"type": "module"`)
