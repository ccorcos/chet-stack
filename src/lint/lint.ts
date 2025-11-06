import { path } from "tools/path"
import { findPackageDeps } from "./findPackageDeps"
import { fixAbsoluteImports } from "./fixAbsoluteImports"
import { fixNodeImports } from "./fixNodeImports"
import { fixRelativeImports } from "./fixRelativeImports"

const srcDir = path("src")

await fixAbsoluteImports(srcDir)
await fixRelativeImports(srcDir)
await fixNodeImports(srcDir)

const disallowedDependencies = [{ from: "client", to: "server" }]
const violationCount = await findPackageDeps({ srcDir, disallowedDependencies, verbose: false })

// "format": "prettier --write 'src/**/*.{ts,tsx,js,jsx}'"
