/*

npx tsx src/lint/findCircularImports.ts [--verbose] [--orphans] [--leaves] [--warnings]

Analyzes circular dependencies and other import issues in the codebase using madge.
Circular dependencies can cause runtime errors, initialization order issues, and hard-to-debug problems.

Options:
  --verbose    Show detailed dependency information
  --orphans    Show modules that no other module depends on
  --leaves     Show modules that have no dependencies
  --warnings   Show import warnings (unresolved dependencies, etc.)

*/

import madge from "madge"
import { path } from "tools/path"

const srcDir = path("src")

// ANSI color codes
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const GREEN = "\x1b[32m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

interface AnalysisOptions {
	verbose: boolean
	showOrphans: boolean
	showLeaves: boolean
	showWarnings: boolean
}

async function analyzeCircularDependencies(options: AnalysisOptions) {
	console.log(`${BOLD}Analyzing dependencies in ${srcDir}...${RESET}\n`)

	// Configure madge with TypeScript support
	const res = await madge(srcDir, {
		fileExtensions: ["ts", "tsx", "js", "jsx"],
		tsConfig: path("tsconfig.json"),
		// Exclude test files and build artifacts
		excludeRegExp: [/\.test\.ts$/, /\.test\.tsx$/, /\/build\//, /\/node_modules\//],
		detectiveOptions: {
			ts: {
				// Skip type-only imports as they don't cause runtime circular dependency issues
				skipTypeImports: true,
			},
			tsx: {
				// Also skip type-only imports in TSX files
				skipTypeImports: true,
			},
		},
	})

	let hasIssues = false

	// 1. Check for circular dependencies
	const circular = res.circular()
	if (circular.length > 0) {
		hasIssues = true
		console.log(`${RED}${BOLD}❌ Found ${circular.length} circular dependency chain(s):${RESET}\n`)

		circular.forEach((chain, index) => {
			console.log(`${RED}${index + 1}. Circular chain (${chain.length} modules):${RESET}`)
			chain.forEach((module, i) => {
				const arrow = i < chain.length - 1 ? " → " : " ⟲ (back to start)"
				console.log(`   ${module}${arrow}`)
			})
			console.log()
		})

		// Suggest how to fix
		console.log(`${YELLOW}💡 Tips to fix circular dependencies:${RESET}`)
		console.log("   1. Extract shared code into a separate module")
		console.log("   2. Use dependency injection instead of direct imports")
		console.log("   3. Move types to a separate types-only file")
		console.log("   4. Consider restructuring your module hierarchy\n")
	} else {
		console.log(`${GREEN}✅ No circular dependencies found${RESET}\n`)
	}

	// 2. Check for orphaned modules
	if (options.showOrphans) {
		const orphans = res.orphans()
		if (orphans.length > 0) {
			hasIssues = true
			console.log(`${YELLOW}${BOLD}⚠️  Found ${orphans.length} orphaned module(s):${RESET}`)
			console.log(`${YELLOW}(modules that no other module depends on)${RESET}\n`)

			orphans.forEach((module) => {
				console.log(`   ${YELLOW}${module}${RESET}`)
			})
			console.log()

			console.log(`${YELLOW}💡 Orphaned modules might be:${RESET}`)
			console.log("   1. Entry points (server.ts, client entrypoints) - this is OK")
			console.log("   2. Dead code that can be removed")
			console.log("   3. Standalone scripts/tools - this is OK\n")
		} else {
			console.log(`${GREEN}✅ No orphaned modules found${RESET}\n`)
		}
	}

	// 3. Check for leaf modules
	if (options.showLeaves) {
		const leaves = res.leaves()
		if (leaves.length > 0) {
			console.log(`${CYAN}${BOLD}ℹ️  Found ${leaves.length} leaf module(s):${RESET}`)
			console.log(`${CYAN}(modules that have no dependencies)${RESET}\n`)

			const displayLeaves = options.verbose ? leaves : leaves.slice(0, 10)
			displayLeaves.forEach((module) => {
				console.log(`   ${CYAN}${module}${RESET}`)
			})

			if (!options.verbose && leaves.length > 10) {
				console.log(`   ${CYAN}... and ${leaves.length - 10} more${RESET}`)
			}
			console.log()
		} else {
			console.log(`${CYAN}ℹ️  No leaf modules found${RESET}\n`)
		}
	}

	// 4. Check for warnings (unresolved dependencies, etc.)
	if (options.showWarnings) {
		const warnings = res.warnings()
		const warningKeys = Object.keys(warnings)

		if (warningKeys.length > 0) {
			hasIssues = true
			console.log(
				`${YELLOW}${BOLD}⚠️  Found warnings in ${warningKeys.length} module(s):${RESET}\n`
			)

			warningKeys.forEach((module) => {
				const moduleWarnings = warnings[module]
				if (moduleWarnings.length > 0) {
					console.log(`   ${YELLOW}${module}:${RESET}`)
					moduleWarnings.forEach((warning: string) => {
						console.log(`      - ${warning}`)
					})
					console.log()
				}
			})

			console.log(`${YELLOW}💡 Common causes of warnings:${RESET}`)
			console.log("   1. Missing dependencies in package.json")
			console.log("   2. Incorrect import paths")
			console.log("   3. Dynamic imports that can't be statically analyzed\n")
		} else {
			console.log(`${GREEN}✅ No import warnings found${RESET}\n`)
		}
	}

	// 5. Show dependency statistics if verbose
	if (options.verbose) {
		const obj = res.obj()
		const modules = Object.keys(obj)
		const totalDeps = modules.reduce((sum, mod) => sum + obj[mod].length, 0)
		const avgDeps = (totalDeps / modules.length).toFixed(2)

		console.log(`${BOLD}📊 Dependency Statistics:${RESET}`)
		console.log(`   Total modules: ${modules.length}`)
		console.log(`   Total dependencies: ${totalDeps}`)
		console.log(`   Average dependencies per module: ${avgDeps}\n`)

		// Find modules with most dependencies
		const sorted = modules
			.map((mod) => ({ module: mod, deps: obj[mod].length }))
			.sort((a, b) => b.deps - a.deps)
			.slice(0, 5)

		console.log(`${BOLD}🔝 Top 5 modules by dependency count:${RESET}`)
		sorted.forEach(({ module, deps }, index) => {
			console.log(`   ${index + 1}. ${module} (${deps} dependencies)`)
		})
		console.log()
	}

	return hasIssues
}

// Parse command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
	const options: AnalysisOptions = {
		verbose: process.argv.includes("--verbose"),
		showOrphans: process.argv.includes("--orphans"),
		showLeaves: process.argv.includes("--leaves"),
		showWarnings: process.argv.includes("--warnings"),
	}

	try {
		const hasIssues = await analyzeCircularDependencies(options)

		if (hasIssues) {
			console.log(`${RED}${BOLD}❌ Analysis completed with issues${RESET}`)
			process.exit(1)
		} else {
			console.log(`${GREEN}${BOLD}✅ Analysis completed successfully${RESET}`)
			process.exit(0)
		}
	} catch (error) {
		console.error(`${RED}${BOLD}Error during analysis:${RESET}`, error)
		process.exit(1)
	}
}

export { analyzeCircularDependencies }
