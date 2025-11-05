import chokidar from "chokidar"
import { ChildProcess, spawn } from "node:child_process"
import { readdir } from "node:fs/promises"
import path from "node:path"

async function findFiles(rootDir: string, ext: string): Promise<string[]> {
	const results: string[] = []

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name)
			if (entry.isDirectory()) {
				await walk(fullPath)
			} else if (entry.isFile()) {
				if (entry.name.endsWith(ext)) {
					results.push(fullPath)
				}
			}
		}
	}

	await walk(rootDir)
	results.sort()
	return results
}

function runTsx(filePath: string, cwd: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("npx", ["tsx", filePath], {
			cwd,
			stdio: "inherit",
			env: process.env,
			shell: false,
		})
		child.on("error", reject)
		child.on("exit", (code, signal) => {
			if (code === 0) return resolve()
			reject(
				new Error(`tsx exited with code ${code ?? "null"}${signal ? ` (signal ${signal})` : ""}`)
			)
		})
	})
}

export async function codegen(dir: string): Promise<void> {
	const cwd = process.cwd()

	const genFiles = await findFiles(dir, ".gen.ts")
	genFiles.sort()

	for (const file of genFiles) {
		const rel = path.relative(cwd, file)
		console.log(`> npx tsx ${rel}`)
		await runTsx(file, cwd)
	}
}

// ---- Watch Orchestrator ----

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

class CodegenRunner {
	procs = new Map<string, ChildProcess>()

	spawn(file: string, cwd: string) {
		const rel = path.relative(cwd, file)
		const child = spawn("npx", ["tsx", "watch", file, "--", "--watch"], {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env,
			detached: true,
			shell: false,
		})

		prefixLines(child.stdout, rel)
		prefixLines(child.stderr, rel)

		child.on("exit", () => {
			this.procs.delete(file)
		})
		this.procs.set(file, child)
	}

	kill(file: string) {
		const child = this.procs.get(file)
		if (!child) return
		child.kill()
		this.procs.delete(file)
	}
}

const cwd = process.cwd()

function setupWatcher(rootDir: string) {
	const glob = path.resolve(rootDir, "**/*.gen.ts")

	const runner = new CodegenRunner()

	const watcher = chokidar.watch(glob, {
		ignoreInitial: false, // This initial add when they are found begin the process.
	})

	watcher
		.on("add", (file) => {
			runner.spawn(file, cwd)
		})
		.on("change", (file) => {
			runner.kill(file)
			runner.spawn(file, cwd)
		})
		.on("unlink", (file) => {
			runner.kill(file)
		})
	// .on("ready")
}

if (require.main === module) {
	async function main() {
		const args = process.argv.slice(2)
		const watchMode = args.includes("--watch")
		const dirs = args.filter((a) => !a.startsWith("-"))
		const roots = dirs.length > 0 ? dirs : ["./src/client"]
		const cwd = process.cwd()

		if (watchMode) {
			console.log(`Watching for *.gen.ts in: ${roots.join(", ")}`)
			setupWatcher(roots)
			// keep process alive
			return
		}

		await codegen(roots)
	}

	main().catch((err) => {
		console.error(err)
		process.exit(1)
	})
}
