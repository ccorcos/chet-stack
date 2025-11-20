import { execFile } from "node:child_process"
import prettier from "prettier"
import { path } from "tools/path"

export async function formatFile(filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = execFile("npx", ["prettier", "--write", filePath], (error) => {
			if (error) reject(error)
			else resolve()
		})
	})
}

export async function formatTs(contents: string): Promise<string> {
	const config = await prettier.resolveConfig(path(".prettierrc"))
	return prettier.format(contents, { ...config, parser: "typescript" })
}
