/*

npx tsx src/lint/checkImports.ts

*/

import { path } from "tools/path"
import { findCircularImports } from "./findCircularImports"
import { findPackageDeps } from "./findPackageDeps"

const srcDir = path("src")

// Check for circular imports.
const circularImports = await findCircularImports(srcDir)

// Check for package dependencies.
const disallowedDependencies = [
	{ from: "client", to: "server" },
	{ from: "shared", to: "server" },
	{ from: "lint", to: "server" },
]
const disallowedImports = await findPackageDeps({ srcDir, disallowedDependencies, verbose: false })

if (!circularImports || !disallowedImports) process.exit(1)
