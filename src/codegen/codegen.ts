/*

npx tsx src/codegen/codegen.ts <dirPath> [--watch]

*/

import chokidar from "chokidar"
import { ChildProcess, spawn } from "node:child_process"
import path from "node:path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

export async function codegen(args: { rootDir: string; watchMode: boolean }) {
	const { rootDir, watchMode } = args

	const watcher = chokidar.watch(rootDir, {
		ignored: (p, stats) => {
			// Ignore directories
			if (stats?.isDirectory()) return true
			// Only watch files that end with .gen.ts
			if (stats?.isFile() && !p.endsWith(".gen.ts")) return true
			return false
		},
		ignoreInitial: false,
		persistent: watchMode,
	})

	const procs = new Map<string, ChildProcess>()

	function start(genFile: string) {
		const rel = path.relative(rootDir, genFile)
		const args = watchMode ? ["tsx", genFile, "--watch"] : ["tsx", genFile]

		// Using tsx watch feels a bit unnecessary and causes some other race conditions
		// ? ["tsx", "watch", "--clear-screen=false", genFile, "--watch"]

		const child = spawn("npx", args, {
			cwd: rootDir,
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env,
			shell: false,
		})

		prefixLines(child.stdout, rel)
		prefixLines(child.stderr, rel)

		child.on("exit", () => procs.delete(genFile))
		procs.set(genFile, child)
	}

	function stop(genFile: string) {
		const child = procs.get(genFile)
		if (!child) return
		child.kill()
		procs.delete(genFile)
	}

	function restart(genFile: string) {
		stop(genFile)
		start(genFile)
	}

	watcher.on("add", start).on("change", restart).on("unlink", stop)
	if (watchMode) return watcher

	return new Promise<void>((resolve, reject) => {
		watcher.on("ready", () => {
			const promises = Array.from(procs.values()).map(
				(child) =>
					new Promise<void>((resolve, reject) => {
						child.on("exit", (code, signal) => {
							if (code === 0) resolve()
							else reject(new Error(`tsx error: ${code} (${signal})`))
						})
					})
			)
			Promise.all(promises)
				.catch(reject)
				.then(() => resolve())
				.finally(() => watcher.close())
		})
	})
}

function prefixLines(stream: NodeJS.ReadableStream | null, label: string) {
	if (!stream) return
	let buf = ""
	stream.on("data", (chunk) => {
		buf += chunk.toString()
		let idx: number
		while ((idx = buf.indexOf("\n")) >= 0) {
			const line = buf.slice(0, idx)
			buf = buf.slice(idx + 1)
			if (line.length > 0) process.stdout.write(`[${label}] ${line}\n`)
		}
	})
	stream.on("end", () => {
		if (buf.length > 0) process.stdout.write(`[${label}] ${buf}\n`)
	})
}

async function main() {
	const argv = yargs(hideBin(process.argv)).argv as any
	const helpMode = argv.help || argv.h
	const watchMode = argv.watch || argv.w
	const [rootDir] = argv["_"] as unknown[] as string[]

	if (helpMode || !rootDir) {
		console.log(`USAGE: tsx codegen.ts <dirPath> [--watch]`)
		process.exit(0)
	}

	await codegen({ rootDir, watchMode })
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main()
}
