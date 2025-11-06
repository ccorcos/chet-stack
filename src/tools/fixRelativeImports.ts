/*

npx tsx src/tools/fixRelativeImports.ts

When a file in src/{package} imports from the same package, it should use a relative import rather than an absolute import.

*/

import gitignore from "ignore"
import fs from "node:fs/promises"
import { collect } from "shared/collect"
import { path } from "./path"
import { pLimitLazy } from "./pLimitLazy"

const rootDir = path(".")
const srcDir = path("src")

const ignore = gitignore().add(await fs.readFile(path(".gitignore"), "utf-8"))

async function* getTopLevelPackages() {
	const entries = await fs.readdir(srcDir, { withFileTypes: true })
	for (const entry of entries) {
		if (entry.isDirectory()) yield entry.name
	}
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
	const entries = await fs.readdir(dir, { withFileTypes: true })

	for (const entry of entries) {
		const filePath = path.join(dir, entry.name)
		const relativePath = path.relative(rootDir, filePath)

		if (ignore.ignores(relativePath)) continue

		if (entry.isDirectory()) {
			yield* walkFiles(filePath)
		} else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
			yield filePath
		}
	}
}

function getPackageForFile(filePath: string): string | null {
	const relativePath = path.relative(srcDir, filePath)
	const parts = relativePath.split(path.sep)
	return parts.length > 0 ? parts[0] : null
}

function getRelativePath(fromFile: string, toPackagePath: string): string {
	const fromDir = path.dirname(fromFile)
	const toFile = path.join(srcDir, toPackagePath)
	let relativePath = path.relative(fromDir, toFile)

	// Ensure the path starts with ./ or ../
	if (!relativePath.startsWith(".")) {
		relativePath = "./" + relativePath
	}

	// Remove file extension
	relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, "")

	return relativePath
}

async function fixImportsInFile(filePath: string): Promise<boolean> {
	const pkg = getPackageForFile(filePath)
	if (!pkg) return false

	const content = await fs.readFile(filePath, "utf-8")

	// Match imports from the same package: from "packageName/..." or from "packageName"
	const regex = new RegExp(`from "(${pkg})(/[^"]+)?"`, "g")

	let modified = false
	const newContent = content.replace(regex, (match, packageName, restOfPath) => {
		modified = true
		const importPath = packageName + (restOfPath || "")
		const relativePath = getRelativePath(filePath, importPath)
		return `from "${relativePath}"`
	})

	if (modified) {
		await fs.writeFile(filePath, newContent, "utf-8")
		return true
	}
	return false
}

console.log("Discovering top-level packages in src/...")
const packages: string[] = []
for await (const pkg of getTopLevelPackages()) packages.push(pkg)
console.log(`Found packages: ${packages.join(", ")}\n`)

console.log("Finding and fixing imports in source files...")
const results = await collect(
	pLimitLazy(10, walkFiles(srcDir), async (file) => {
		if (await fixImportsInFile(file)) {
			console.log(`Fixed: ${path.relative(rootDir, file)}`)
			return true
		}
		return false
	})
)

const total = results.length
const fixed = results.filter(Boolean)
console.log(`\nDone! Fixed imports in ${fixed.length} of ${total} file(s).`)
