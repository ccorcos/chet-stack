import { execFile } from "child_process"
import prettier from "prettier"

export async function formatFile(filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = execFile("npx", ["prettier", "--write", filePath], (error) => {
			if (error) reject(error)
			else resolve()
		})
	})
}

export async function formatTs(contents: string): Promise<string> {
	const config = await prettier.resolveConfig(".")
	return prettier.format(contents, { ...config, parser: "typescript" })
}
