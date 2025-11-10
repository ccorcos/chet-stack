/*

npx tsx src/lint/lint.ts

*/

import { spawn } from "node:child_process"
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

// Prettier
await new Promise<void>((resolve, reject) => {
	const child = spawn("npx", ["prettier", srcDir, "--write", "--list-different"], {
		stdio: "inherit",
		shell: true,
	})

	child.on("error", reject)
	child.on("exit", (code) => {
		if (code === 0) resolve()
		else reject(new Error(`Prettier exited with code ${code}`))
	})
})

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
