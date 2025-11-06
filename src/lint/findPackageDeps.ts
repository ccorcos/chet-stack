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

export async function findPackageDeps(verbose = false) {
	console.log("Discovering top-level packages in src/...")
	const packages = await getTopLevelPackages()
	console.log(`Found packages: ${packages.join(", ")}\n`)

	console.log("Analyzing imports in source files...")
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

	// Print detailed results only in verbose mode
	if (verbose) {
		console.log("\n=== Package Dependencies ===\n")

		for (const pkg of packages.sort()) {
			const deps = depMap.get(pkg)
			if (!deps || deps.size === 0) {
				console.log(`${pkg}: no external dependencies\n`)
				continue
			}

			console.log(`${pkg} depends on:`)
			for (const [toPkg, depInfo] of Array.from(deps.entries()).sort()) {
				// Check if dependency is type-only
				const allImports = Array.from(depInfo.files.values()).flat()
				const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)
				const hasTypeImports = allImports.some((imp) => imp.isTypeOnly)

				const depType = !hasRuntimeImports ? " (type-only)" : hasTypeImports ? " (mixed)" : ""
				console.log(`  → ${toPkg}${depType}`)

				// Show up to 5 example files
				const files = Array.from(depInfo.files.keys()).sort()
				const displayFiles = files.slice(0, 5)

				for (const file of displayFiles) {
					const importDetails = depInfo.files.get(file)!
					console.log(`      ${file}`)
					for (const detail of importDetails.sort((a, b) => a.path.localeCompare(b.path))) {
						const typeLabel = detail.isTypeOnly ? " (type)" : ""
						console.log(`        - ${detail.path}${typeLabel}`)
					}
				}

				if (files.length > 5) {
					console.log(`      ... and ${files.length - 5} more file(s)`)
				}
			}
			console.log()
		}
	}

	// Summary statistics
	console.log("=== Summary ===")
	const typeOnlyImports = imports.filter((imp) => imp.isTypeOnly)
	const runtimeImports = imports.filter((imp) => !imp.isTypeOnly)

	console.log(`Total cross-package imports: ${imports.length}`)
	console.log(`  Runtime imports: ${runtimeImports.length}`)
	console.log(`  Type-only imports: ${typeOnlyImports.length}`)
	console.log(`Packages with dependencies: ${depMap.size}`)

	// Count type-only dependencies
	let typeOnlyDepCount = 0
	let mixedDepCount = 0
	let runtimeDepCount = 0

	for (const [, deps] of depMap) {
		for (const [, depInfo] of deps) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)
			const hasTypeImports = allImports.some((imp) => imp.isTypeOnly)

			if (!hasRuntimeImports) {
				typeOnlyDepCount++
			} else if (hasTypeImports) {
				mixedDepCount++
			} else {
				runtimeDepCount++
			}
		}
	}

	console.log(`  Runtime dependencies: ${runtimeDepCount}`)
	console.log(`  Type-only dependencies: ${typeOnlyDepCount}`)
	console.log(`  Mixed dependencies: ${mixedDepCount}`)

	// Find packages with no dependencies
	const noDeps = packages.filter((pkg) => !depMap.has(pkg) || depMap.get(pkg)!.size === 0)
	if (noDeps.length > 0) {
		console.log(`Packages with no external dependencies: ${noDeps.join(", ")}`)
	}

	// Simple dependency list
	console.log("\n=== Package Dependency Graph ===")
	for (const pkg of packages.sort()) {
		const deps = depMap.get(pkg)
		if (!deps || deps.size === 0) {
			console.log(`${pkg}: none`)
			continue
		}

		const depList: string[] = []
		for (const [toPkg, depInfo] of Array.from(deps.entries()).sort()) {
			const allImports = Array.from(depInfo.files.values()).flat()
			const hasRuntimeImports = allImports.some((imp) => !imp.isTypeOnly)
			const depType = !hasRuntimeImports ? " (type-only)" : ""
			depList.push(`${toPkg}${depType}`)
		}

		console.log(`${pkg}: ${depList.join(", ")}`)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const verbose = process.argv.includes("--verbose")
	await findPackageDeps(verbose)
}
