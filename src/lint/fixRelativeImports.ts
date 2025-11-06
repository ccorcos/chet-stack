/*

npx tsx src/tools/fixRelativeImports.ts

When a file in src/{package} imports from the same package, it should use a relative import rather than an absolute import.

*/

import fs from "node:fs/promises"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { path } from "tools/path"
import { walkFiles } from "./helpers"

function getPackageForFile(args: { filePath: string; srcDir: string }): string | null {
	const relativePath = path.relative(args.srcDir, args.filePath)
	const parts = relativePath.split(path.sep)
	return parts.length > 0 ? parts[0] : null
}

function getRelativePath(args: {
	srcDir: string
	fromFile: string
	toPackagePath: string
}): string {
	const fromDir = path.dirname(args.fromFile)
	const toFile = path.join(args.srcDir, args.toPackagePath)
	let relativePath = path.relative(fromDir, toFile)

	// Ensure the path starts with ./ or ../
	if (!relativePath.startsWith(".")) {
		relativePath = "./" + relativePath
	}

	// Remove file extension
	relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, "")

	return relativePath
}

async function fixImportsInFile(args: { filePath: string; srcDir: string }): Promise<boolean> {
	const { filePath, srcDir } = args
	const pkg = getPackageForFile({ filePath, srcDir })
	if (!pkg) return false

	const content = await fs.readFile(filePath, "utf-8")

	// Match imports from the same package: from "packageName/..." or from "packageName"
	const regex = new RegExp(`from "(${pkg})(/[^"]+)?"`, "g")

	let modified = false
	const newContent = content.replace(regex, (match, packageName, restOfPath) => {
		modified = true
		const importPath = packageName + (restOfPath || "")
		const relativePath = getRelativePath({
			fromFile: filePath,
			srcDir,
			toPackagePath: importPath,
		})
		return `from "${relativePath}"`
	})

	if (modified) {
		await fs.writeFile(filePath, newContent, "utf-8")
		return true
	}
	return false
}

export async function fixRelativeImports(srcDir: string) {
	const results = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (filePath) => {
			if (await fixImportsInFile({ filePath, srcDir })) {
				console.log(`Fixed: ${path.relative(srcDir, filePath)}`)
				return true
			}
			return false
		})
	)

	const total = results.length
	const fixed = results.filter(Boolean)
	console.log(`\nDone! Fixed imports in ${fixed.length} of ${total} file(s).`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await fixRelativeImports(path("src"))
}
