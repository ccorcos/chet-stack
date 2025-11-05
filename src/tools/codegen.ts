import { spawn } from "node:child_process"
import { readdir } from "node:fs/promises"
import path from "node:path"

async function findGenTsFiles(rootDir: string): Promise<string[]> {
	const results: string[] = []

	async function walk(currentDir: string): Promise<void> {
		const entries = await readdir(currentDir, { withFileTypes: true })
		for (const entry of entries) {
			if (entry.name.startsWith(".DS_Store")) continue
			const fullPath = path.join(currentDir, entry.name)
			if (entry.isDirectory()) {
				await walk(fullPath)
			} else if (entry.isFile()) {
				if (entry.name.endsWith(".gen.ts")) {
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

export async function codegen(dirs: string[]): Promise<void> {
	const cwd = process.cwd()

	const filesSet = new Set<string>()
	for (const dir of dirs) {
		try {
			const found = await findGenTsFiles(dir)
			for (const f of found) filesSet.add(f)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			console.warn(`Skipping directory ${dir}: ${msg}`)
		}
	}

	const files = Array.from(filesSet).sort()

	if (files.length === 0) {
		console.log("No *.gen.ts files found.")
		return
	}

	console.log(`Found ${files.length} *.gen.ts file(s):`)
	for (const f of files) {
		console.log(" - " + path.relative(cwd, f))
	}

	let failures = 0
	for (const file of files) {
		const rel = path.relative(cwd, file)
		console.log(`\nRunning: npx tsx ${rel}`)
		try {
			await runTsx(file, cwd)
		} catch (err) {
			failures++
			console.error(`Generator failed for ${rel}`)
			if (err instanceof Error) console.error(err.message)
		}
	}

	if (failures > 0) {
		console.error(`\n${failures} generator(s) failed.`)
		process.exitCode = 1
	} else {
		console.log("\nAll generators completed successfully.")
	}
}

codegen(["./src/client"])
