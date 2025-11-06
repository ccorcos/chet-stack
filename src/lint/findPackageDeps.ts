/*

npx tsx src/lint/findPackageDeps.ts [--verbose]

Analyzes dependencies between packages in src/ and reports which packages depend on each other through which files.
Assumes that fixAbsoluteImports has already run so imports are properly qualified.

Options:
  --verbose    Show detailed file-level import information

*/

import fs from "node:fs/promises"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { path } from "tools/path"
import { getTopLevelPackages, walkFiles } from "./helpers"

const rootDir = path(".")
const srcDir = path("src")

// Dependency rules: packages that should not have runtime dependencies on each other
// Type-only imports are allowed and will not trigger violations
const DISALLOWED_DEPENDENCIES = [
	{ from: "client", to: "server" },
	// Add more rules here as needed
]

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
	files: Map<string, ImportDetail[]> // fromFile -> Array of import details
}

async function analyzeImportsInFile(filePath: string, packages: string[]): Promise<ImportInfo[]> {
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
				fromFile: path.relative(rootDir, filePath),
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
			// Check if this is a mixed import with type specifiers
			// For now, we'll mark it as runtime since it has at least some runtime imports
			const hasTypeSpecifiers = /\btype\s+\w+/.test(importStatement)
			const hasOnlyTypeSpecifiers =
				importStatement.includes("{") &&
				!importStatement.match(/{\s*type\s+\w+(\s*,\s*type\s+\w+)*\s*}/)?.input.includes(",")

			imports.push({
				fromPackage,
				fromFile: path.relative(rootDir, filePath),
				toPackage,
				importPath,
				isTypeOnly: hasTypeSpecifiers && hasOnlyTypeSpecifiers,
			})
		}
	}

	return imports
}

interface DependencyViolation {
	from: string
	to: string
	isDirect: boolean
	path?: string[] // For transitive violations: [from, intermediate1, intermediate2, ..., to]
}

function computeRuntimeDependencies(
	depMap: Map<string, Map<string, PackageDep>>
): Map<string, Set<string>> {
	// Build a map of direct runtime dependencies only (excluding type-only)
	const runtimeDeps = new Map<string, Set<string>>()

	for (const [fromPkg, deps] of depMap) {
		const runtimeTargets = new Set<string>()

		for (const [toPkg, depInfo] of deps) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)

			if (hasRuntimeImports) {
				runtimeTargets.add(toPkg)
			}
		}

		if (runtimeTargets.size > 0) {
			runtimeDeps.set(fromPkg, runtimeTargets)
		}
	}

	return runtimeDeps
}

function findTransitivePath(
	from: string,
	to: string,
	runtimeDeps: Map<string, Set<string>>,
	visited = new Set<string>(),
	path: string[] = []
): string[] | null {
	if (from === to) {
		return [...path, to]
	}

	if (visited.has(from)) {
		return null
	}

	visited.add(from)
	const deps = runtimeDeps.get(from)

	if (!deps) {
		return null
	}

	for (const dep of deps) {
		const result = findTransitivePath(dep, to, runtimeDeps, visited, [...path, from])
		if (result) {
			return result
		}
	}

	return null
}

function validateDependencies(
	depMap: Map<string, Map<string, PackageDep>>,
	runtimeDeps: Map<string, Set<string>>
): DependencyViolation[] {
	const violations: DependencyViolation[] = []

	for (const rule of DISALLOWED_DEPENDENCIES) {
		// Check direct violations
		const deps = depMap.get(rule.from)
		if (deps?.has(rule.to)) {
			const depInfo = deps.get(rule.to)!
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)

			if (hasRuntimeImports) {
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
			// Check if there's a transitive path
			const path = findTransitivePath(rule.from, rule.to, runtimeDeps)
			if (path) {
				violations.push({
					from: rule.from,
					to: rule.to,
					isDirect: false,
					path,
				})
			}
		}
	}

	return violations
}

// ANSI color codes
const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

interface AnalysisResult {
	packages: string[]
	imports: ImportInfo[]
	depMap: Map<string, Map<string, PackageDep>>
	runtimeDeps: Map<string, Set<string>>
	violations: DependencyViolation[]
}

interface ViolationMaps {
	directViolationEdges: Set<string>
	transitiveViolationEdges: Set<string>
	packagesInViolations: Set<string>
	directViolationImports: Set<string>
	transitiveViolationImports: Set<string>
}

async function analyzePackageDependencies(): Promise<AnalysisResult> {
	const packages = await getTopLevelPackages()

	const allImports = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (file) => {
			return await analyzeImportsInFile(file, packages)
		})
	)

	// Flatten the array of arrays
	const imports = allImports.flat()

	// Build dependency map: fromPackage -> toPackage -> files
	const depMap = new Map<string, Map<string, PackageDep>>()

	for (const imp of imports) {
		if (!depMap.has(imp.fromPackage)) {
			depMap.set(imp.fromPackage, new Map())
		}

		const packageDeps = depMap.get(imp.fromPackage)!
		if (!packageDeps.has(imp.toPackage)) {
			packageDeps.set(imp.toPackage, {
				package: imp.toPackage,
				files: new Map(),
			})
		}

		const dep = packageDeps.get(imp.toPackage)!
		if (!dep.files.has(imp.fromFile)) {
			dep.files.set(imp.fromFile, [])
		}

		dep.files.get(imp.fromFile)!.push({
			path: imp.importPath,
			isTypeOnly: imp.isTypeOnly,
		})
	}

	// Validate dependencies
	const runtimeDeps = computeRuntimeDependencies(depMap)
	const violations = validateDependencies(depMap, runtimeDeps)

	return { packages, imports, depMap, runtimeDeps, violations }
}

function buildViolationMaps(
	violations: DependencyViolation[],
	depMap: Map<string, Map<string, PackageDep>>
): ViolationMaps {
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

			// Mark all runtime imports from this package to the target
			const depInfo = depMap.get(violation.from)?.get(violation.to)
			if (depInfo) {
				for (const [file, importDetails] of depInfo.files) {
					for (const detail of importDetails) {
						if (!detail.isTypeOnly) {
							const importKey = `${violation.from}→${violation.to}→${file}→${detail.path}`
							directViolationImports.add(importKey)
						}
					}
				}
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

				// Mark all runtime imports from this package to the next in path
				const depInfo = depMap.get(from)?.get(to)
				if (depInfo) {
					for (const [file, importDetails] of depInfo.files) {
						for (const detail of importDetails) {
							if (!detail.isTypeOnly) {
								const importKey = `${from}→${to}→${file}→${detail.path}`
								transitiveViolationImports.add(importKey)
							}
						}
					}
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

function displayPackageDependencies(
	packages: string[],
	depMap: Map<string, Map<string, PackageDep>>,
	violations: DependencyViolation[],
	violationMaps: ViolationMaps,
	verbose: boolean
) {
	const {
		directViolationEdges,
		transitiveViolationEdges,
		packagesInViolations,
		directViolationImports,
		transitiveViolationImports,
	} = violationMaps

	// Only show if verbose, or if there are violations (but filter to violations only)
	if (!verbose && violations.length === 0) return

	if (violations.length > 0) {
		console.log(
			`Legend: ${RED}red = direct violation${RESET}, ${YELLOW}yellow = transitive violation${RESET}\n`
		)
	} else {
		console.log()
	}

	for (const pkg of packages.sort()) {
		// Skip if not verbose and this package is not involved in violations
		if (!verbose && violations.length > 0 && !packagesInViolations.has(pkg)) {
			continue
		}

		const deps = depMap.get(pkg)
		if (!deps || deps.size === 0) {
			console.log(`${pkg}: no external dependencies\n`)
			continue
		}

		// Check if we have anything to display for this package
		let hasDisplayedHeader = false

		for (const [toPkg, depInfo] of Array.from(deps.entries()).sort()) {
			// Check if dependency is type-only
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)
			const hasTypeImports = allImports.some((imp) => imp.isTypeOnly)

			const depType = !hasRuntimeImports ? " (type-only)" : hasTypeImports ? " (mixed)" : ""

			// Color the package name if it's a violation
			const violationKey = `${pkg}→${toPkg}`
			let displayPkg = toPkg
			let isViolation = false
			if (directViolationEdges.has(violationKey)) {
				displayPkg = `${RED}${toPkg}${RESET}`
				isViolation = true
			} else if (transitiveViolationEdges.has(violationKey)) {
				displayPkg = `${YELLOW}${toPkg}${RESET}`
				isViolation = true
			}

			// Skip this dependency if not verbose and it's not a violation
			if (!verbose && !isViolation) {
				continue
			}

			// Print header only when we have something to display
			if (!hasDisplayedHeader) {
				console.log(`${pkg} depends on:`)
				hasDisplayedHeader = true
			}

			console.log(`  → ${displayPkg}${depType}`)

			// Show files: all files if verbose, up to 5 if not
			const files = Array.from(depInfo.files.keys()).sort()
			const displayFiles = verbose ? files : files.slice(0, 5)

			for (const file of displayFiles) {
				const importDetails = depInfo.files.get(file)!

				// Check if any import in this file is a violation
				let fileViolationType: "direct" | "transitive" | null = null

				for (const detail of importDetails) {
					if (!detail.isTypeOnly) {
						const importKey = `${pkg}→${toPkg}→${file}→${detail.path}`
						if (directViolationImports.has(importKey)) {
							fileViolationType = "direct"
							break
						} else if (transitiveViolationImports.has(importKey)) {
							fileViolationType = "transitive"
						}
					}
				}

				// Color the file path if it contains violations
				let fileDisplay = file
				if (fileViolationType === "direct") {
					fileDisplay = `${RED}${file}${RESET}`
				} else if (fileViolationType === "transitive") {
					fileDisplay = `${YELLOW}${file}${RESET}`
				}

				console.log(`      ${fileDisplay}`)

				for (const detail of importDetails.sort((a, b) => a.path.localeCompare(b.path))) {
					const typeLabel = detail.isTypeOnly ? " (type)" : ""

					// Check if this specific import is a violation
					const importKey = `${pkg}→${toPkg}→${file}→${detail.path}`
					let importPathDisplay = detail.path

					if (directViolationImports.has(importKey)) {
						importPathDisplay = `${RED}${detail.path}${RESET}`
					} else if (transitiveViolationImports.has(importKey)) {
						importPathDisplay = `${YELLOW}${detail.path}${RESET}`
					}

					console.log(`        - ${importPathDisplay}${typeLabel}`)
				}
			}

			// Only show "more files" message when not verbose
			if (!verbose && files.length > 5) {
				console.log(`      ... and ${files.length - 5} more file(s)`)
			}
		}

		// Only print newline if we displayed something
		if (hasDisplayedHeader) {
			console.log()
		}
	}
}

function displayPackageDependencySummary(
	packages: string[],
	depMap: Map<string, Map<string, PackageDep>>,
	violationMaps: ViolationMaps
) {
	const { directViolationEdges, transitiveViolationEdges } = violationMaps

	for (const pkg of packages.sort()) {
		const deps = depMap.get(pkg)
		if (!deps || deps.size === 0) {
			console.log(`${pkg}:`)
			continue
		}

		const depList: string[] = []
		for (const [toPkg, depInfo] of Array.from(deps.entries()).sort()) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)
			const depType = !hasRuntimeImports ? " (type-only)" : ""

			// Color violations in the graph
			const violationKey = `${pkg}→${toPkg}`
			let depString = `${toPkg}${depType}`
			if (directViolationEdges.has(violationKey)) {
				depString = `${RED}${depString}${RESET}`
			} else if (transitiveViolationEdges.has(violationKey)) {
				depString = `${YELLOW}${depString}${RESET}`
			}

			depList.push(depString)
		}

		console.log(`${pkg}: ${depList.join(", ")}`)
	}
}

export async function findPackageDeps(verbose = false) {
	// Perform analysis
	const { packages, imports, depMap, runtimeDeps, violations } = await analyzePackageDependencies()

	// Build violation maps for coloring
	const violationMaps = buildViolationMaps(violations, depMap)

	// Display results
	if (violations.length > 0) {
		console.log(`\n❌ Found ${violations.length} dependency violation(s)`)
		displayViolations(violations)

		console.log("\n=== Package Dependency Summary ===")
		displayPackageDependencySummary(packages, depMap, violationMaps)

		console.log("\n=== Package Dependencies ===")
		displayPackageDependencies(packages, depMap, violations, violationMaps, verbose)
	} else {
		console.log("✅ No dependency violations found")

		console.log("\n=== Package Dependency Summary ===")
		displayPackageDependencySummary(packages, depMap, violationMaps)

		console.log("\n=== Package Dependencies ===")
		displayPackageDependencies(packages, depMap, violations, violationMaps, verbose)
	}

	// Return violation count for exit code
	return violations.length
}
if (import.meta.url === `file://${process.argv[1]}`) {
	const verbose = process.argv.includes("--verbose")
	const violationCount = await findPackageDeps(verbose)

	if (violationCount > 0) process.exit(1)
	else console.log("✅ No dependency violations found")
}
