/*

npx tsx src/lint/fixAbsoluteImports.ts <srcDir>
npx tsx src/lint/fixAbsoluteImports.ts src

When file in <srcDir>/{package} imports from another package, it should use an absolute import rather than a relative import.

*/

import fs from "node:fs/promises"
import { dirname, relative, resolve } from "node:path"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { getTopLevelPackages, walkFiles } from "./helpers"

async function fixImportsInFile(
	filePath: string,
	packages: string[],
	srcDir: string
): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8")
	const fileDir = dirname(filePath)
	const currentPackage = relative(srcDir, filePath).split("/")[0]

	// Match any relative import that goes up directories
	const regex = /from ["'](\.\..+?)(?=["'])/g
	let newContent = content

	for (const match of content.matchAll(regex)) {
		const [fullMatch, relativePath] = match

		// Resolve the import to see which package it targets
		const resolved = resolve(fileDir, relativePath)
		const relativeToSrc = relative(srcDir, resolved)
		const targetPackage = relativeToSrc.split("/")[0]

		// Only replace if it's a cross-package import to a known package
		if (packages.includes(targetPackage) && targetPackage !== currentPackage) {
			// Replace ../../package with just package (or ../../package/subpath with package/subpath)
			newContent = newContent.replace(fullMatch, `from "${relativeToSrc}`)
		}
	}

	if (content !== newContent) {
		await fs.writeFile(filePath, newContent, "utf-8")
		return true
	}
	return false
}

export async function fixAbsoluteImports(srcDir: string) {
	const packages = await getTopLevelPackages()

	const results = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (file) => {
			if (await fixImportsInFile(file, packages, srcDir)) {
				console.log(`Fixed: ${relative(srcDir, file)}`)
				return true
			}
			return false
		})
	)

	const total = results.length
	const fixed = results.filter(Boolean)

	console.log(`✅ Fixed absolute imports in ${fixed.length} of ${total} file(s).`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const srcArg = process.argv[2]
	if (!srcArg) throw new Error("srcDir argument is required.")
	const srcDir = resolve(process.cwd(), srcArg)

	await fixAbsoluteImports(srcDir)
}
