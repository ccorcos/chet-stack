# Codegen

Code generation is useful when the platform or language doesn't support a feature you need.

## How to use it

Create a file that ends with `.gen.ts` and then run `npx tsx src/codegen/codegen.ts <dirPath> [--watch]` where dirPath is just the source code directory and `--watch` will re-run then the `.gen.ts` files change.

A simple example might be generating CSS variables to keep JavaScript and CSS in sync.

```ts
// css.gen.ts
import { writeFile } from "node:fs/promises"
import { colors } from "./styles"

const cssVars = Object.entries(colors)
	.map(([key, value]) => `  --color-${key}: ${value};`)
	.join("\n")

const css = `:root {\n${cssVars}\n}\n`

await writeFile("colors.css", css, "utf-8")
```

## Indexgen

Another use code generation is generating `index.ts` files which index all the files in a directory. This reduces the amount of plumbing developers have to do importing new files around where they are needed.

For example, its useful to have `apis/index.ts` import every api and export it as a named export so you can register them with http handlers and also access their types.

Create a file `apis/index.gen.ts` with the following:

```ts
import { indexgen } from "codegen/indexgen"
import path from "node:path"
import { fileURLToPath } from "node:url"

await indexgen({
	dirPath: path.dirname(fileURLToPath(import.meta.url)),
	watchMode: process.argv.includes("--watch"),
})
```

And here's an example output `index.ts` it will create:

```ts
/* WARNING: this file is generated! */

import * as login from "./login"
import * as logout from "./logout"
import * as signup from "./signup"

export { login, logout, signup }
```
