# imageco

Batch convert and compress images (png, jpg, webp) to webp or avif using [sharp](https://sharp.pixelplumbing.com/).

Supports converting specific files or entire directories, preserving directory structure. Non-image files are copied as-is in directory mode.

## Installation

```sh
npm install -g imageco
```

Or run directly with npx:

```sh
npx imageco photo.png -f webp
```

Requires Node.js >= 20.

## Usage

### Convert specific files

```sh
imageco photo.png screenshot.jpg -q 80 -f avif
```

Output files are written next to the originals by default. Use `-o` to specify an output directory:

```sh
imageco photo.png -o ./out -f webp
```

### Convert an entire directory

```sh
imageco -i ./photos -o ./compressed -q 60
```

Directory structure is preserved. Non-image files (e.g. `.txt`, `.json`) are copied as-is.

### Defaults

Running `imageco` with no arguments converts `./input` to `./output` at quality 50 in avif format.

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--input` | `-i` | `./input` | Input directory (directory mode) |
| `--output` | `-o` | `./output` (dir mode) or same directory (file mode) | Output directory |
| `--quality` | `-q` | `50` | Output quality (1-100) |
| `--format` | `-f` | `avif` | Output format (`webp` or `avif`) |

Run `imageco help` for the full help text.

## Supported formats

**Input:** png, jpg, jpeg, webp

**Output:** webp, avif

## License

[MIT](LICENSE)
