import gitignore from "ignore"
import fs from "node:fs/promises"
import { path } from "tools/path"

const rootDir = path(".")
const srcDir = path("src")

export async function getTopLevelPackages() {
	const entries = await fs.readdir(srcDir, { withFileTypes: true })
	return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

export async function* walkFiles(dir: string): AsyncGenerator<string> {
	const ignore = gitignore().add(await fs.readFile(path(".gitignore"), "utf-8"))

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
