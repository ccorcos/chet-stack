/*

npx tsx src/tools/fixAbsoluteImports.ts <srcDir>
npx tsx src/tools/fixAbsoluteImports.ts src

When file in <srcDir>/{package} imports from another package, it should use an absolute import rather than a relative import.

*/

import fs from "node:fs/promises"
import { relative, resolve } from "node:path"
import { collect } from "shared/collect"
import { pLimitLazy } from "shared/pLimitLazy"
import { getTopLevelPackages, walkFiles } from "./helpers"

async function fixImportsInFile(filePath: string, packages: string[]): Promise<boolean> {
	const content = await fs.readFile(filePath, "utf-8")
	const regex = new RegExp(`from "(\\.\\./)+(${packages.join("|")})`, "g")
	const newContent = content.replace(regex, 'from "$2')

	if (content !== newContent) {
		await fs.writeFile(filePath, newContent, "utf-8")
		return true
	}
	return false
}

export async function fixAbsoluteImports(srcDir: string) {
	const packages = await getTopLevelPackages()

	const results = await collect(
		pLimitLazy(10, walkFiles(srcDir), async (file) => {
			if (await fixImportsInFile(file, packages)) {
				console.log(`Fixed: ${relative(srcDir, file)}`)
				return true
			}
			return false
		})
	)

	const total = results.length
	const fixed = results.filter(Boolean)
	console.log(`\nDone! Fixed imports in ${fixed.length} of ${total} file(s).`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const srcArg = process.argv[2]
	if (!srcArg) throw new Error("srcDir argument is required.")
	const srcDir = resolve(process.cwd(), srcArg)

	await fixAbsoluteImports(srcDir)
}
