/*

npx tsx src/lint/lint.ts

*/

import { exec } from "node:child_process"
import { promisify } from "node:util"
import { path } from "tools/path"
import { findCircularImports } from "./findCircularImports"
import { findPackageDeps } from "./findPackageDeps"
import { fixAbsoluteImports } from "./fixAbsoluteImports"
import { fixNodeImports } from "./fixNodeImports"
import { fixRelativeImports } from "./fixRelativeImports"

const srcDir = path("src")

// Clean up imports.
await fixAbsoluteImports(srcDir)
await fixRelativeImports(srcDir)
await fixNodeImports(srcDir)
await promisify(exec)(`prettier --write '${srcDir}/**/*.{ts,tsx,js,jsx}'`)

const circularImports = await findCircularImports(srcDir)

// Check for package dependencies.
const disallowedDependencies = [
	{ from: "client", to: "server" },
	{ from: "shared", to: "server" },
	{ from: "lint", to: "server" },
	{ from: "lint", to: "tools" },
]
const disallowedImports = await findPackageDeps({ srcDir, disallowedDependencies, verbose: false })

if (!circularImports || !disallowedImports) process.exit(1)
