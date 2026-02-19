import path from 'node:path'

export const INPUT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const
export const inputExtensions = new Set(INPUT_EXTENSIONS)
export type InputExtension = (typeof INPUT_EXTENSIONS)[number]

export const OUTPUT_EXTENSIONS = ['webp', 'avif'] as const
export const outputExtensions = new Set(OUTPUT_EXTENSIONS)
export type OutputExtension = (typeof OUTPUT_EXTENSIONS)[number]

export interface FileEntry {
	type: InputExtension
	path: string
	originalSize: number
	newSize?: number
	reduction?: number
	reductionPercent?: number
	formattedReduction?: string
}

export function getExtension(filePath: string): string | undefined {
	const ext = path.extname(filePath).slice(1).toLowerCase()
	return ext || undefined
}
