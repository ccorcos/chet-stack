import { fixAbsoluteImports } from "./fixAbsoluteImports"
import { fixNodeImports } from "./fixNodeImports"
import { fixRelativeImports } from "./fixRelativeImports"

await fixAbsoluteImports()
await fixRelativeImports()
await fixNodeImports()

// "format": "prettier --write 'src/**/*.{ts,tsx,js,jsx}'"
