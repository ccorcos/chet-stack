/*

npx tsx src/tools/fixImports.ts

*/

import gitignore from "ignore"
import fs from "node:fs/promises"
import { collect } from "shared/collect"
import { path } from "tools/path"
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

async function fixImportsInFile(filePath: string, packages: string[]): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8")
	const regex = new RegExp(`from "(\\.\\./)+(${packages.join("|")})`, "g")
	const newContent = content.replace(regex, 'from "$2')

	if (content !== newContent) {
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
		if (await fixImportsInFile(file, packages)) {
			console.log(`Fixed: ${path.relative(rootDir, file)}`)
			return true
		}
		return false
	})
)

console.log(`\nDone! Fixed imports in ${results.filter(Boolean).length} file(s).`)
