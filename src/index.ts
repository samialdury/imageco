import path from 'node:path'
import fs from 'node:fs'
import { parseArgs, styleText, type ParseArgsOptionDescriptor } from 'node:util'
import debug from 'debug'
import sharp from 'sharp'
import { filesize } from 'filesize'
import {
	inputExtensions,
	type InputExtension,
	OUTPUT_EXTENSIONS,
	outputExtensions,
	type OutputExtension,
	type FileEntry,
	getExtension,
} from './utils.js'

const d = debug('imageco:main')

const cwd = process.cwd()

const ogArgs = process.argv.slice(2)

interface CLIOptions {
	[longOption: string]: ParseArgsOptionDescriptor & { help: string }
}

const options = {
	input: {
		type: 'string',
		short: 'i',
		help: 'Input directory',
	},
	output: {
		type: 'string',
		short: 'o',
		help: 'Output directory',
	},
	quality: {
		type: 'string',
		short: 'q',
		default: '50',
		help: 'Quality of the output image (1-100)',
	},
	format: {
		type: 'string',
		short: 'f',
		default: 'avif',
		help: `Output format (${OUTPUT_EXTENSIONS.join(', ')})`,
	},
} satisfies CLIOptions

function help() {
	let out = `imageco [FILES...] [...OPTS?]\n`

	out += `\nConvert specific files or entire directories of images.\n`

	out += `\nusage:
  imageco photo.png screenshot.jpg -q 80 -f avif   Convert specific files
  imageco photo.png -o ./out -f webp                Convert to output directory
  imageco -i ./photos -o ./compressed -q 60         Convert entire directory
  imageco                                           Convert ./input to ./output`

	out += `\n\nargs:
help:
\tShow help.`

	out += `\n\noptions:`

	const defaults: Record<string, string> = {
		input: './input',
		output: './output (dir mode) or same directory (file mode)',
		quality: '50',
		format: 'avif',
	}

	for (const [k, o] of Object.entries(options)) {
		out += `
--${k} (-${o.short}):
\t${o.help}.
\tDefault: ${defaults[k]}\n`
	}

	return out
}

if (ogArgs[0] === 'help') {
	console.log(help())
	process.exit(0)
}

const args = parseArgs({
	options,
	args: ogArgs,
	allowPositionals: true,
})

const fileMode = args.positionals.length > 0

function resolveOutput(): string | undefined {
	if (args.values.output !== undefined) {
		return path.resolve(args.values.output)
	}
	if (fileMode) {
		return undefined
	}
	return path.resolve(cwd, 'output')
}

const opts = {
	input: fileMode ? undefined : path.resolve(args.values.input ?? path.join(cwd, 'input')),
	output: resolveOutput(),
	quality: parseInt(args.values.quality!, 10),
	format: args.values.format!.toLowerCase() as OutputExtension,
}

d('args: %O', args.values)
d('opts: %O', opts)

function validate() {
	const validationErrors: string[] = []

	if (!outputExtensions.has(opts.format)) {
		validationErrors.push(
			`Invalid format "${opts.format}". Must be one of [${OUTPUT_EXTENSIONS.join(', ')}].`,
		)
	}

	if (opts.quality < 1 || opts.quality > 100) {
		validationErrors.push(
			`Invalid quality "${opts.quality}". Must be between 1-100.`,
		)
	}

	if (fileMode) {
		for (const filePath of args.positionals) {
			if (!fs.existsSync(path.resolve(filePath))) {
				validationErrors.push(`File "${filePath}" does not exist.`)
			}
		}
	} else {
		if (!fs.existsSync(opts.input!)) {
			validationErrors.push(
				`${opts.input} does not exist.\nYou can set the input directory with the \`--input\` option.\nFor more info, run \`imageco help\`.`,
			)
		}
	}

	return validationErrors
}

const errs = validate()
if (errs.length) {
	console.error(styleText('red', errs.join('\n')))
	process.exit(1)
}

// @ts-expect-error
async function* walk(dir: string) {
	for await (const d of await fs.promises.opendir(dir)) {
		const entry = path.join(dir, d.name)
		if (d.isDirectory()) yield* walk(entry)
		else if (d.isFile()) yield entry
	}
}


async function collectFileEntry(filePath: string): Promise<FileEntry | undefined> {
	const ext = getExtension(filePath)
	if (!ext) return undefined

	const stat = await fs.promises.stat(filePath)
	return {
		type: ext as InputExtension,
		path: filePath,
		originalSize: stat.size,
	}
}

async function collectFiles(): Promise<FileEntry[]> {
	const entries: FileEntry[] = []

	if (fileMode) {
		for (const filePath of args.positionals) {
			const entry = await collectFileEntry(path.resolve(filePath))
			if (entry) entries.push(entry)
		}
	} else {
		for await (const p of walk(opts.input!)) {
			const entry = await collectFileEntry(p)
			if (entry) entries.push(entry)
		}
	}

	return entries
}

const files = await collectFiles()

d('collected files: %O', files)

function resolveOutputPath(filePath: string): string {
	if (fileMode) {
		return opts.output ? path.join(opts.output, path.basename(filePath)) : filePath
	}
	return filePath.replace(opts.input!, opts.output!)
}

let converted = 0
let skipped = 0
for (const f of files) {
	const b = debug('imageco:convert')
	let outputPath = resolveOutputPath(f.path)
	const outputDir = path.dirname(outputPath)

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}

	if (!inputExtensions.has(f.type)) {
		if (fileMode) {
			console.log(
				styleText('yellow', `Skipping unsupported file: ${f.path}`),
			)
		} else {
			b('unsupported file %s, copying as is', f.path)
			await fs.promises.copyFile(f.path, outputPath)
		}
		skipped++
		continue
	}

	outputPath = outputPath.replace('.' + f.type, '.' + opts.format)

	b('converting and compressing %s', f.path)
	const info = await new Promise<sharp.OutputInfo>((res, rej) => {
		const builder = sharp(f.path)
		if (opts.format === 'avif') {
			builder.avif({ quality: opts.quality })
		} else if (opts.format === 'webp') {
			builder.webp({ quality: opts.quality })
		}
		builder.toFile(outputPath, (err, info) => {
			if (err) rej(err)
			else res(info)
		})
	})
	b('%s converted and compressed', f.path)

	const decrease = f.originalSize - info.size
	f.newSize = info.size
	f.reduction = decrease
	f.reductionPercent = Math.round((decrease / f.originalSize) * 100)
	f.formattedReduction = filesize(decrease)
	converted++
}

console.table(
	files.map((f) => ({
		path: f.path,
		originalSize: f.originalSize,
		newSize: f.newSize,
		reduction: f.reduction,
		reductionPercent: f.reductionPercent,
	})),
)

console.log(
	styleText(
		'green',
		`All done! ${converted} files converted, ${skipped} files skipped.`,
	),
)
