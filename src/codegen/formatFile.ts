import { execFile } from "child_process"

export async function formatFile(filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = execFile("npx", ["prettier", "--write", filePath], (error) => {
			if (error) reject(error)
			else resolve()
		})
	})
}
