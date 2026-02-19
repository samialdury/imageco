import { describe, expect, test } from 'bun:test'
import {
	getExtension,
	INPUT_EXTENSIONS,
	inputExtensions,
	OUTPUT_EXTENSIONS,
	outputExtensions,
} from '../src/utils.js'

describe('getExtension', () => {
	test('returns lowercase extension for regular files', () => {
		expect(getExtension('photo.png')).toBe('png')
		expect(getExtension('/path/to/file.jpg')).toBe('jpg')
	})

	test('is case-insensitive', () => {
		expect(getExtension('photo.PNG')).toBe('png')
		expect(getExtension('file.JPEG')).toBe('jpeg')
		expect(getExtension('image.WebP')).toBe('webp')
	})

	test('returns undefined for files with no extension', () => {
		expect(getExtension('Makefile')).toBeUndefined()
		expect(getExtension('/path/to/LICENSE')).toBeUndefined()
	})

	test('returns undefined for dotfiles', () => {
		expect(getExtension('.gitignore')).toBeUndefined()
		expect(getExtension('/path/.env')).toBeUndefined()
	})

	test('handles dots in directory names', () => {
		expect(getExtension('/my.project/photo.png')).toBe('png')
		expect(getExtension('/v1.2.3/file.webp')).toBe('webp')
	})

	test('handles multiple dots in filename', () => {
		expect(getExtension('archive.tar.gz')).toBe('gz')
		expect(getExtension('photo.backup.jpg')).toBe('jpg')
	})
})

describe('extension sets', () => {
	test('INPUT_EXTENSIONS contains expected formats', () => {
		expect(INPUT_EXTENSIONS).toContain('png')
		expect(INPUT_EXTENSIONS).toContain('jpg')
		expect(INPUT_EXTENSIONS).toContain('jpeg')
		expect(INPUT_EXTENSIONS).toContain('webp')
	})

	test('inputExtensions set matches INPUT_EXTENSIONS array', () => {
		expect(inputExtensions.size).toBe(INPUT_EXTENSIONS.length)
		for (const ext of INPUT_EXTENSIONS) {
			expect(inputExtensions.has(ext)).toBe(true)
		}
	})

	test('OUTPUT_EXTENSIONS contains expected formats', () => {
		expect(OUTPUT_EXTENSIONS).toContain('webp')
		expect(OUTPUT_EXTENSIONS).toContain('avif')
	})

	test('outputExtensions set matches OUTPUT_EXTENSIONS array', () => {
		expect(outputExtensions.size).toBe(OUTPUT_EXTENSIONS.length)
		for (const ext of OUTPUT_EXTENSIONS) {
			expect(outputExtensions.has(ext)).toBe(true)
		}
	})

	test('inputExtensions does not contain output-only formats', () => {
		expect(inputExtensions.has('avif' as any)).toBe(false)
	})
})
