import { afterEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const CLI = path.resolve(import.meta.dirname, '..', 'src', 'index.ts')
const FIXTURES = path.resolve(import.meta.dirname, 'fixtures')

const tempDirs: string[] = []

function makeTempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'imageco-test-'))
	tempDirs.push(dir)
	return dir
}

afterEach(() => {
	for (const dir of tempDirs) {
		fs.rmSync(dir, { recursive: true, force: true })
	}
	tempDirs.length = 0
})

interface RunResult {
	stdout: string
	stderr: string
	exitCode: number
}

async function run(args: string[]): Promise<RunResult> {
	const proc = Bun.spawn(['bun', 'run', CLI, ...args], {
		stdout: 'pipe',
		stderr: 'pipe',
		env: { ...process.env, NO_COLOR: '1' },
	})
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	])
	const exitCode = await proc.exited
	return { stdout, stderr, exitCode }
}

describe('help', () => {
	test('prints usage and exits 0', async () => {
		const { stdout, exitCode } = await run(['help'])
		expect(exitCode).toBe(0)
		expect(stdout).toContain('imageco')
		expect(stdout).toContain('usage:')
		expect(stdout).toContain('options:')
	})
})

describe('validation errors', () => {
	test('rejects invalid format', async () => {
		const out = makeTempDir()
		const { stderr, exitCode } = await run(['-i', FIXTURES, '-o', out, '-f', 'bmp'])
		expect(exitCode).toBe(1)
		expect(stderr).toContain('Invalid format')
	})

	test('rejects quality out of range', async () => {
		const out = makeTempDir()
		const { stderr, exitCode } = await run(['-i', FIXTURES, '-o', out, '-q', '200'])
		expect(exitCode).toBe(1)
		expect(stderr).toContain('Invalid quality')
	})

	test('rejects quality below range', async () => {
		const out = makeTempDir()
		const { stderr, exitCode } = await run(['-i', FIXTURES, '-o', out, '-q', '0'])
		expect(exitCode).toBe(1)
		expect(stderr).toContain('Invalid quality')
	})

	test('rejects nonexistent input directory', async () => {
		const out = makeTempDir()
		const { stderr, exitCode } = await run(['-i', '/tmp/nonexistent-imageco-dir', '-o', out])
		expect(exitCode).toBe(1)
		expect(stderr).toContain('does not exist')
	})

	test('rejects nonexistent positional file', async () => {
		const { stderr, exitCode } = await run(['/tmp/nonexistent-imageco-file.png'])
		expect(exitCode).toBe(1)
		expect(stderr).toContain('does not exist')
	})
})

describe('directory mode', () => {
	test('converts fixtures to avif (default format)', async () => {
		const out = makeTempDir()
		const { stdout, exitCode } = await run(['-i', FIXTURES, '-o', out])
		expect(exitCode).toBe(0)
		expect(stdout).toContain('files converted')

		expect(fs.existsSync(path.join(out, 'sample.avif'))).toBe(true)
		expect(fs.existsSync(path.join(out, 'nested', 'deep.avif'))).toBe(true)
	})

	test('converts fixtures to webp', async () => {
		const out = makeTempDir()
		const { stdout, exitCode } = await run(['-i', FIXTURES, '-o', out, '-f', 'webp'])
		expect(exitCode).toBe(0)
		expect(stdout).toContain('files converted')

		expect(fs.existsSync(path.join(out, 'sample.webp'))).toBe(true)
	})

	test('preserves nested directory structure', async () => {
		const out = makeTempDir()
		const { exitCode } = await run(['-i', FIXTURES, '-o', out])
		expect(exitCode).toBe(0)

		expect(fs.existsSync(path.join(out, 'nested', 'deep.avif'))).toBe(true)
	})

	test('copies non-image files as-is', async () => {
		const out = makeTempDir()
		const { exitCode } = await run(['-i', FIXTURES, '-o', out])
		expect(exitCode).toBe(0)

		const copied = path.join(out, 'readme.txt')
		expect(fs.existsSync(copied)).toBe(true)
		expect(fs.readFileSync(copied, 'utf-8')).toContain('text file')
	})
})

describe('file mode', () => {
	test('converts a positional file to output dir', async () => {
		const out = makeTempDir()
		const { stdout, exitCode } = await run([
			path.join(FIXTURES, 'sample.png'),
			'-o',
			out,
			'-f',
			'webp',
		])
		expect(exitCode).toBe(0)
		expect(stdout).toContain('files converted')

		expect(fs.existsSync(path.join(out, 'sample.webp'))).toBe(true)
	})
})

describe('quality', () => {
	test('lower quality produces smaller or equal file size', async () => {
		const outLow = makeTempDir()
		const outHigh = makeTempDir()

		await run(['-i', FIXTURES, '-o', outLow, '-f', 'webp', '-q', '10'])
		await run(['-i', FIXTURES, '-o', outHigh, '-f', 'webp', '-q', '100'])

		const lowSize = fs.statSync(path.join(outLow, 'sample.webp')).size
		const highSize = fs.statSync(path.join(outHigh, 'sample.webp')).size

		expect(lowSize).toBeLessThanOrEqual(highSize)
	})
})
