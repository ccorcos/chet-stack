/*

npx tsx src/lint/findCircularImports.ts <srcDir>
npx tsx src/lint/findCircularImports.ts src

Analyzes circular dependencies in the codebase using madge to prevent runtime errors.

*/

import madge from "madge"
import { access } from "node:fs/promises"
import { dirname, resolve } from "node:path"

// ANSI color codes
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const RESET = "\x1b[0m"

/**
 * Find tsconfig.json by searching up the directory tree from the source directory
 */
async function findTsConfig(srcDir: string): Promise<string | undefined> {
	let currentDir = resolve(srcDir)

	// Search up the directory tree
	while (true) {
		const tsConfigPath = resolve(currentDir, "tsconfig.json")
		try {
			await access(tsConfigPath)
			return tsConfigPath
		} catch {
			// File doesn't exist, continue searching
		}

		const parentDir = dirname(currentDir)
		// Reached root without finding tsconfig.json
		if (parentDir === currentDir) {
			return undefined
		}
		currentDir = parentDir
	}
}

export async function findCircularImports(srcDir: string) {
	const tsConfigPath = await findTsConfig(srcDir)

	// Configure madge with TypeScript support
	const res = await madge(srcDir, {
		fileExtensions: ["ts", "tsx", "js", "jsx"],
		tsConfig: tsConfigPath,
		detectiveOptions: {
			ts: { skipTypeImports: true },
			tsx: { skipTypeImports: true },
		},
	})

	const circular = res.circular()
	if (circular.length > 0) {
		console.log(`${RED}❌ Found ${circular.length} circular dependency chain(s):${RESET}\n`)

		circular.forEach((chain, index) => {
			console.log(`${RED}${index + 1}. Circular chain (${chain.length} modules):${RESET}`)
			chain.forEach((module, i) => {
				const arrow = i < chain.length - 1 ? " → " : " ⟲ (back to start)"
				console.log(`   ${module}${arrow}`)
			})
			console.log()
		})
		return circular.length
	}

	console.log(`${GREEN}✅ No circular dependencies found${RESET}`)
	return 0
}

// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2)
	const srcArg = args[0]
	if (!srcArg) throw new Error("srcDir argument is required.")
	const srcDir = resolve(process.cwd(), srcArg)

	const errors = await findCircularImports(srcDir)
	if (errors) process.exit(1)
}
