import { path } from "tools/path"
import { fixAbsoluteImports } from "./fixAbsoluteImports"
import { fixNodeImports } from "./fixNodeImports"
import { fixRelativeImports } from "./fixRelativeImports"

const srcDir = path("src")

await fixAbsoluteImports(srcDir)
await fixRelativeImports(srcDir)
await fixNodeImports(srcDir)

// "format": "prettier --write 'src/**/*.{ts,tsx,js,jsx}'"
