/*

npx tsx src/codegen/indexgen.ts <dirPath> [--watch]

*/

import chokidar, { type FSWatcher } from "chokidar"
import * as fs from "fs/promises"
import camelCase from "lodash/camelCase"
import debounce from "lodash/debounce"
import * as path from "path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { formatFile } from "./formatFile"

/** Watch globs and run fn whenever something changes. */
function watchFiles(args: {
	label: string
	glob: string | string[]
	filter?: (path: string) => boolean
	run: () => Promise<void> | void
}): FSWatcher {
	const { label, glob, run, filter } = args

	let promise = Promise.resolve()
	const debounced = debounce(() => {
		promise = promise.then(run)
	}, 120)

	const watcher = chokidar.watch(glob, {
		persistent: true,
		ignoreInitial: true, // Ignore the initial add events when booting up.
	})

	const log = (eventPath: string) => {
		const rel = path.relative(process.cwd(), eventPath)
		process.stdout.write(`[${label}] ${rel}\n`)
	}

	watcher
		.on("add", (p) => {
			if (filter && !filter(p)) return
			log(p)
			debounced()
		})
		.on("change", (p) => {
			if (filter && !filter(p)) return
			log(p)
			debounced()
		})
		.on("unlink", (p) => {
			if (filter && !filter(p)) return
			log(p)
			debounced()
		})

	return watcher
}

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
	console.log(`> write ${path.relative(process.cwd(), outputPath)}`)
	await fs.writeFile(outputPath, contents)
	await formatFile(outputPath)
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
		return watchFiles({
			label: "indexgen",
			glob: path.join(dirPath, "*"),
			run: () => generateIndex(dirPath),
			filter: (p) => {
				const fileName = path.basename(p)
				if (fileName.startsWith(".")) return false
				if (fileName === outName) return false
				return true
			},
		})
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

if (require.main === module) {
	main().catch((error) => {
		console.error("Error:", error)
		process.exit(1)
	})
}
