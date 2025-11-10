/*

npx tsx src/lint/findPackageDeps.ts <srcDir> [from-to ...] [--verbose]
npx tsx src/lint/findPackageDeps.ts src client-server shared-server

Analyzes dependencies between <srcDir>/{package} packages and reports which packages import each other..
Assumes that fixAbsoluteImports and findRelativeImports has already run so imports are properly qualified.
Accepts disallowed dependencies from-to to report as violations.

*/

import fs from "node:fs/promises"
import * as path from "node:path"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { getTopLevelPackages, walkFiles } from "./helpers"

// ANSI color codes
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

interface ImportInfo {
	fromPackage: string
	fromFile: string
	toPackage: string
	importPath: string
	isTypeOnly: boolean
}

interface ImportDetail {
	path: string
	isTypeOnly: boolean
}

interface PackageDep {
	package: string
	files: Map<string, ImportDetail[]>
}

interface DependencyViolation {
	from: string
	to: string
	isDirect: boolean
	path?: string[]
}

interface ViolationMaps {
	directViolationEdges: Set<string>
	transitiveViolationEdges: Set<string>
	packagesInViolations: Set<string>
	directViolationImports: Set<string>
	transitiveViolationImports: Set<string>
}

interface AnalysisResult {
	packages: string[]
	imports: ImportInfo[]
	depMap: Map<string, Map<string, PackageDep>>
	runtimeDeps: Map<string, Set<string>>
	violations: DependencyViolation[]
}

async function analyzeImportsInFile(args: {
	filePath: string
	packages: string[]
	srcDir: string
}): Promise<ImportInfo[]> {
	const { filePath, packages, srcDir } = args
	const content = await fs.readFile(filePath, "utf-8")
	const relativePath = path.relative(srcDir, filePath)
	const fromPackage = relativePath.split(path.sep)[0]

	const imports: ImportInfo[] = []

	// Pattern 1: import type ... from "package"
	const typeImportRegex = new RegExp(
		`import\\s+type\\s+[^"']+from\\s+["']((${packages.join("|")})(?:/[^"']*)?)[^"']*["']`,
		"g"
	)

	let match
	while ((match = typeImportRegex.exec(content)) !== null) {
		const importPath = match[1]
		const toPackage = match[2]

		if (toPackage !== fromPackage) {
			imports.push({
				fromPackage,
				fromFile: relativePath,
				toPackage,
				importPath,
				isTypeOnly: true,
			})
		}
	}

	// Pattern 2: Regular imports (including mixed type/value imports)
	const regularImportRegex = new RegExp(
		`import\\s+(?!type\\s).*?from\\s+["']((${packages.join("|")})(?:/[^"']*)?)[^"']*["']`,
		"g"
	)

	while ((match = regularImportRegex.exec(content)) !== null) {
		const importPath = match[1]
		const toPackage = match[2]
		const importStatement = match[0]

		if (toPackage !== fromPackage) {
			const hasTypeSpecifiers = /\btype\s+\w+/.test(importStatement)
			const hasOnlyTypeSpecifiers =
				importStatement.includes("{") &&
				!importStatement.match(/{\s*type\s+\w+(\s*,\s*type\s+\w+)*\s*}/)?.input.includes(",")

			imports.push({
				fromPackage,
				fromFile: relativePath,
				toPackage,
				importPath,
				isTypeOnly: hasTypeSpecifiers && hasOnlyTypeSpecifiers,
			})
		}
	}

	return imports
}

function hasRuntimeImports(importDetails: ImportDetail[]): boolean {
	return importDetails.some((detail) => !detail.isTypeOnly)
}

function computeRuntimeDependencies(
	depMap: Map<string, Map<string, PackageDep>>
): Map<string, Set<string>> {
	const runtimeDeps = new Map<string, Set<string>>()

	for (const [fromPackage, dependencies] of depMap) {
		const runtimeTargets = new Set<string>()

		for (const [toPackage, depInfo] of dependencies) {
			const allImports = Array.from(depInfo.files.values()).flat()
			if (hasRuntimeImports(allImports)) {
				runtimeTargets.add(toPackage)
			}
		}

		if (runtimeTargets.size > 0) {
			runtimeDeps.set(fromPackage, runtimeTargets)
		}
	}

	return runtimeDeps
}

function findTransitivePath(args: {
	from: string
	to: string
	runtimeDeps: Map<string, Set<string>>
	visited?: Set<string>
	path?: string[]
}): string[] | null {
	const { from, to, runtimeDeps, visited = new Set<string>(), path = [] } = args

	if (from === to) return [...path, to]
	if (visited.has(from)) return null

	visited.add(from)
	const dependencies = runtimeDeps.get(from)
	if (!dependencies) return null

	for (const dependency of dependencies) {
		const result = findTransitivePath({
			from: dependency,
			to,
			runtimeDeps,
			visited,
			path: [...path, from],
		})
		if (result) return result
	}

	return null
}

function validateDependencies(args: {
	depMap: Map<string, Map<string, PackageDep>>
	runtimeDeps: Map<string, Set<string>>
	disallowedDependencies: Array<{ from: string; to: string }>
}): DependencyViolation[] {
	const { depMap, runtimeDeps, disallowedDependencies } = args
	const violations: DependencyViolation[] = []

	for (const rule of disallowedDependencies) {
		// Check direct violations
		const dependencies = depMap.get(rule.from)
		if (dependencies?.has(rule.to)) {
			const depInfo = dependencies.get(rule.to)!
			const allImports = Array.from(depInfo.files.values()).flat()

			if (hasRuntimeImports(allImports)) {
				violations.push({
					from: rule.from,
					to: rule.to,
					isDirect: true,
				})
			}
		}

		// Check transitive violations (only if no direct violation)
		const directRuntimeDeps = runtimeDeps.get(rule.from)
		if (directRuntimeDeps && !directRuntimeDeps.has(rule.to)) {
			const violationPath = findTransitivePath({ from: rule.from, to: rule.to, runtimeDeps })
			if (violationPath) {
				violations.push({
					from: rule.from,
					to: rule.to,
					isDirect: false,
					path: violationPath,
				})
			}
		}
	}

	return violations
}

async function analyzePackageDependencies(args: {
	srcDir: string
	disallowedDependencies: Array<{ from: string; to: string }>
}): Promise<AnalysisResult> {
	const { srcDir, disallowedDependencies } = args
	const packages = await getTopLevelPackages()

	const allImports = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (file) => {
			return await analyzeImportsInFile({ filePath: file, packages, srcDir })
		})
	)

	const imports = allImports.flat()
	const depMap = new Map<string, Map<string, PackageDep>>()

	// Build dependency map: fromPackage -> toPackage -> files
	for (const importInfo of imports) {
		if (!depMap.has(importInfo.fromPackage)) {
			depMap.set(importInfo.fromPackage, new Map())
		}

		const packageDeps = depMap.get(importInfo.fromPackage)!
		if (!packageDeps.has(importInfo.toPackage)) {
			packageDeps.set(importInfo.toPackage, {
				package: importInfo.toPackage,
				files: new Map(),
			})
		}

		const depInfo = packageDeps.get(importInfo.toPackage)!
		if (!depInfo.files.has(importInfo.fromFile)) {
			depInfo.files.set(importInfo.fromFile, [])
		}

		depInfo.files.get(importInfo.fromFile)!.push({
			path: importInfo.importPath,
			isTypeOnly: importInfo.isTypeOnly,
		})
	}

	const runtimeDeps = computeRuntimeDependencies(depMap)
	const violations = validateDependencies({ depMap, runtimeDeps, disallowedDependencies })

	return { packages, imports, depMap, runtimeDeps, violations }
}

function markViolationImports(args: {
	fromPackage: string
	toPackage: string
	depInfo: PackageDep
	violationSet: Set<string>
}) {
	const { fromPackage, toPackage, depInfo, violationSet } = args

	for (const [file, importDetails] of depInfo.files) {
		for (const detail of importDetails) {
			if (!detail.isTypeOnly) {
				const importKey = `${fromPackage}→${toPackage}→${file}→${detail.path}`
				violationSet.add(importKey)
			}
		}
	}
}

function buildViolationMaps(args: {
	violations: DependencyViolation[]
	depMap: Map<string, Map<string, PackageDep>>
}): ViolationMaps {
	const { violations, depMap } = args
	const directViolationEdges = new Set<string>()
	const transitiveViolationEdges = new Set<string>()
	const packagesInViolations = new Set<string>()
	const directViolationImports = new Set<string>()
	const transitiveViolationImports = new Set<string>()

	for (const violation of violations) {
		if (violation.isDirect) {
			const key = `${violation.from}→${violation.to}`
			directViolationEdges.add(key)
			packagesInViolations.add(violation.from)
			packagesInViolations.add(violation.to)

			const depInfo = depMap.get(violation.from)?.get(violation.to)
			if (depInfo) {
				markViolationImports({
					fromPackage: violation.from,
					toPackage: violation.to,
					depInfo,
					violationSet: directViolationImports,
				})
			}
		} else if (violation.path) {
			// For transitive violations, mark all edges in the path
			for (let i = 0; i < violation.path.length - 1; i++) {
				const from = violation.path[i]
				const to = violation.path[i + 1]
				const key = `${from}→${to}`
				transitiveViolationEdges.add(key)
				packagesInViolations.add(from)
				packagesInViolations.add(to)

				const depInfo = depMap.get(from)?.get(to)
				if (depInfo) {
					markViolationImports({
						fromPackage: from,
						toPackage: to,
						depInfo,
						violationSet: transitiveViolationImports,
					})
				}
			}
		}
	}

	return {
		directViolationEdges,
		transitiveViolationEdges,
		packagesInViolations,
		directViolationImports,
		transitiveViolationImports,
	}
}

function displayViolations(violations: DependencyViolation[]) {
	if (violations.length === 0) return

	for (const violation of violations) {
		if (violation.isDirect) {
			console.log(`- ${RED}${violation.from} → ${violation.to}${RESET}`)
		} else {
			console.log(`- ${YELLOW}${violation.path!.join(" → ")}${RESET}`)
		}
	}
}

function getViolationColor(args: {
	packageName: string
	toPackage: string
	directViolationEdges: Set<string>
	transitiveViolationEdges: Set<string>
}): { color: string; isViolation: boolean } {
	const { packageName, toPackage, directViolationEdges, transitiveViolationEdges } = args
	const violationKey = `${packageName}→${toPackage}`

	if (directViolationEdges.has(violationKey)) {
		return { color: RED, isViolation: true }
	}
	if (transitiveViolationEdges.has(violationKey)) {
		return { color: YELLOW, isViolation: true }
	}
	return { color: "", isViolation: false }
}

function getDependencyTypeLabel(importDetails: ImportDetail[]): string {
	const hasRuntime = hasRuntimeImports(importDetails)
	const hasType = importDetails.some((detail) => detail.isTypeOnly)

	if (!hasRuntime) return " (type-only)"
	if (hasType) return " (mixed)"
	return ""
}

function displayPackageDependencySummary(args: {
	packages: string[]
	depMap: Map<string, Map<string, PackageDep>>
	violationMaps: ViolationMaps
}) {
	const { packages, depMap, violationMaps } = args
	const { directViolationEdges, transitiveViolationEdges } = violationMaps

	for (const packageName of packages.sort()) {
		const dependencies = depMap.get(packageName)
		if (!dependencies || dependencies.size === 0) {
			console.log(`${packageName}:`)
			continue
		}

		const depList: string[] = []
		for (const [toPackage, depInfo] of Array.from(dependencies.entries()).sort()) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const depType = getDependencyTypeLabel(allImports)

			const { color, isViolation } = getViolationColor({
				packageName,
				toPackage,
				directViolationEdges,
				transitiveViolationEdges,
			})

			const depString = isViolation
				? `${color}${toPackage}${depType}${RESET}`
				: `${toPackage}${depType}`
			depList.push(depString)
		}

		console.log(`${packageName}: ${depList.join(", ")}`)
	}
}

function displayPackageDependencies(args: {
	packages: string[]
	depMap: Map<string, Map<string, PackageDep>>
	violations: DependencyViolation[]
	violationMaps: ViolationMaps
	verbose: boolean
}) {
	const { packages, depMap, violations, violationMaps, verbose } = args
	const {
		directViolationEdges,
		transitiveViolationEdges,
		packagesInViolations,
		directViolationImports,
		transitiveViolationImports,
	} = violationMaps

	if (!verbose && violations.length === 0) return

	if (violations.length > 0) {
		console.log(
			`Legend: ${RED}red = direct violation${RESET}, ${YELLOW}yellow = transitive violation${RESET}\n`
		)
	} else {
		console.log()
	}

	for (const packageName of packages.sort()) {
		if (!verbose && violations.length > 0 && !packagesInViolations.has(packageName)) {
			continue
		}

		const dependencies = depMap.get(packageName)
		if (!dependencies || dependencies.size === 0) {
			console.log(`${packageName}: no external dependencies\n`)
			continue
		}

		let hasDisplayedHeader = false

		for (const [toPackage, depInfo] of Array.from(dependencies.entries()).sort()) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const depType = getDependencyTypeLabel(allImports)

			const { color, isViolation } = getViolationColor({
				packageName,
				toPackage,
				directViolationEdges,
				transitiveViolationEdges,
			})

			if (!verbose && !isViolation) continue

			if (!hasDisplayedHeader) {
				console.log(`${packageName} depends on:`)
				hasDisplayedHeader = true
			}

			const displayPackage = isViolation ? `${color}${toPackage}${RESET}` : toPackage
			console.log(`  → ${displayPackage}${depType}`)

			const files = Array.from(depInfo.files.keys()).sort()
			const displayFiles = verbose ? files : files.slice(0, 5)

			for (const file of displayFiles) {
				const importDetails = depInfo.files.get(file)!

				// Determine file violation type
				let fileColor = ""
				for (const detail of importDetails) {
					if (!detail.isTypeOnly) {
						const importKey = `${packageName}→${toPackage}→${file}→${detail.path}`
						if (directViolationImports.has(importKey)) {
							fileColor = RED
							break
						} else if (transitiveViolationImports.has(importKey)) {
							fileColor = YELLOW
						}
					}
				}

				const fileDisplay = fileColor ? `${fileColor}${file}${RESET}` : file
				console.log(`      ${fileDisplay}`)

				for (const detail of importDetails.sort((a, b) => a.path.localeCompare(b.path))) {
					const typeLabel = detail.isTypeOnly ? " (type)" : ""
					const importKey = `${packageName}→${toPackage}→${file}→${detail.path}`

					let importDisplay = detail.path
					if (directViolationImports.has(importKey)) {
						importDisplay = `${RED}${detail.path}${RESET}`
					} else if (transitiveViolationImports.has(importKey)) {
						importDisplay = `${YELLOW}${detail.path}${RESET}`
					}

					console.log(`        - ${importDisplay}${typeLabel}`)
				}
			}

			if (!verbose && files.length > 5) {
				console.log(`      ... and ${files.length - 5} more file(s)`)
			}
		}

		if (hasDisplayedHeader) {
			console.log()
		}
	}
}

export async function findPackageDeps(args: {
	srcDir: string
	disallowedDependencies: Array<{ from: string; to: string }>
	verbose?: boolean
}) {
	const { srcDir, disallowedDependencies, verbose = false } = args

	const { packages, depMap, violations } = await analyzePackageDependencies({
		srcDir,
		disallowedDependencies,
	})

	const violationMaps = buildViolationMaps({ violations, depMap })

	if (violations.length > 0) {
		console.log(`❌ Found ${violations.length} dependency violation(s)`)
		displayViolations(violations)

		console.log("\n=== Package Dependency Summary ===")
		displayPackageDependencySummary({ packages, depMap, violationMaps })

		console.log("\n=== Package Dependencies ===")
		displayPackageDependencies({ packages, depMap, violations, violationMaps, verbose })
	} else {
		console.log("✅ No dependency violations found")

		console.log("\n=== Package Dependency Summary ===")
		displayPackageDependencySummary({ packages, depMap, violationMaps })

		if (verbose) {
			console.log("\n=== Package Dependencies ===")
			displayPackageDependencies({ packages, depMap, violations, violationMaps, verbose })
		}
	}

	return violations.length
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2)
	const verbose = args.includes("--verbose")
	const nonFlagArgs = args.filter((arg) => !arg.startsWith("--"))

	const [srcArg, ...rest] = nonFlagArgs
	if (!srcArg) throw new Error("srcDir argument is required.")
	const srcDir = path.resolve(process.cwd(), srcArg)

	const disallowedDependencies = rest.map((rule) => {
		const [from, to] = rule.split("-")
		if (!from || !to) {
			console.error(`Error: Invalid dependency rule format: "${rule}"`)
			console.error('Expected format: "from-to" (e.g., "client-server")')
			process.exit(1)
		}
		return { from, to }
	})

	const violationCount = await findPackageDeps({ srcDir, disallowedDependencies, verbose })

	if (violationCount > 0) process.exit(1)
}
