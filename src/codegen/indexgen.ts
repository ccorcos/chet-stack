/*

npx tsx src/codegen/indexgen.ts <dirPath> [--watch]

*/

import chokidar from "chokidar"
import * as fs from "node:fs/promises"
import camelCase from "lodash-es/camelCase"
import * as path from "node:path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { formatTs } from "./formatFile"

const outName = "index.ts"
const validExt = new Set([".ts", ".tsx", ".js", ".jsx"])

export async function generateIndexFile(dirPath: string): Promise<string> {
	const entries = await fs.readdir(dirPath)

	// Sometime, we might want nested folders to appear as an object.
	const files = entries
		.map((name) => path.parse(name))
		.filter((parsed) => {
			if (!validExt.has(parsed.ext)) return false
			if (parsed.base === outName) return false
			// Exclude generator files like *.gen.ts from the index
			if (parsed.name.endsWith(".gen")) return false
			return true
		})
		.sort((a, b) => a.name.localeCompare(b.name))

	const header = `/* WARNING: this file is generated! */`
	const importLines = files
		.map((p) => `import * as ${cleanFileName(p.name)} from "./${p.name}"`)
		.join("\n")

	const exportBody = `export {\n\t${files.map((p) => cleanFileName(p.name)).join(",\n\t")}\n}`
	const contents = [header, importLines, exportBody].join("\n\n") + "\n"

	return contents
}

export async function generateIndex(dirPath: string): Promise<void> {
	const contents = await generateIndexFile(dirPath)
	const outputPath = path.join(dirPath, outName)
	await writeFileIfChanged(outputPath, await formatTs(contents))
}

async function writeFileIfChanged(filePath: string, contents: string): Promise<void> {
	const existingContents = await fs.readFile(filePath, "utf8")
	if (existingContents === contents) return
	console.log(`> write ${path.relative(process.cwd(), filePath)}`)
	await fs.writeFile(filePath, contents)
}

function cleanFileName(fileName: string): string {
	if (fileName.includes("-") || fileName.includes("_")) {
		return camelCase(fileName)
	} else {
		return fileName
	}
}

export async function indexgen(args: { dirPath: string; watchMode: boolean }) {
	const { dirPath, watchMode } = args
	await generateIndex(dirPath)

	if (watchMode) {
		const glob = path.join(dirPath, "*")
		const watcher = chokidar.watch(glob, {
			persistent: true,
			ignoreInitial: true, // Ignore the initial add events when booting up.
		})

		const regenerateIndex = async (p: string) => {
			const fileName = path.basename(p)
			if (fileName.startsWith(".")) return
			if (fileName.includes(".gen.")) return
			if (fileName === outName) return
			await generateIndex(dirPath)
		}

		watcher.on("add", regenerateIndex).on("change", regenerateIndex).on("unlink", regenerateIndex)

		return watcher
	}
}

async function main() {
	const argv = yargs(hideBin(process.argv)).argv as any
	const helpMode = argv.help || argv.h
	const watchMode = argv.watch || argv.w
	const [dirPath] = argv["_"] as unknown[] as string[]

	if (helpMode || !dirPath) {
		console.log(`USAGE: tsx indexgen.ts <dirPath> [--watch]`)
		process.exit(0)
	}

	await indexgen({ dirPath, watchMode })
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main()
}
