// Meta-Llama-3-8B-Instruct
// mistral-7b-instruct-v0 hello
// Phi-3-mini-4k-instruct

import { exec, execSync } from "child_process"
import * as fs from "fs/promises"
import { tmpdir } from "os"
import * as path from "path"
import { randomId } from "../../shared/randomId"
import { GptMessage } from "./gpt"

// Install with `pipx install llm`
const llmCmd = "/Users/chet/.local/bin/llm"

const options: any = {
	model: "Meta-Llama-3-8B-Instruct",
	// model: "mistral-7b-instruct-v0 hello",
	// temperature: 0.7,
	// maxTokens: 1000,
}

const executeCmd = (command: string, args: string[]) => {
	return new Promise<string>((resolve, reject) => {
		const process = exec([command, ...args].join(" "))
		let stdout = ""
		let stderr = ""

		console.log("spawn", command, ...args)
		process.stdout!.on("data", (data) => {
			console.log("data", data.toString())
			stdout += data.toString()
		})

		process.stderr!.on("data", (data) => {
			console.log("error", data.toString())
			stderr += data.toString()
		})

		process.on("close", (code) => {
			console.log("close")
			if (code === 0) {
				resolve(stdout)
			} else {
				reject(new Error(`Command failed with code ${code}: ${stderr}`))
			}
		})

		process.on("error", (err) => {
			console.log("onerror")
			reject(err)
		})
	})
}

const DEBUG = true
const debug = (...args: any[]) => {
	if (DEBUG) console.error(...args)
}

async function withTmpFile<O>(fn: (tmpFile: string) => Promise<O>): Promise<O> {
	const filePath = path.join(tmpdir(), `llm-chat-${Date.now()}-${randomId()}.json`)
	try {
		const result = await fn(filePath)
		return result
	} finally {
		await fs.unlink(filePath)
	}
}

// Doesnt work.
export async function recurPromptLocal(system: string, prompts: string[]): Promise<GptMessage[]> {
	return withTmpFile(async (tmpFile) => {
		const messages: GptMessage[] = []
		for (let i = 0; i < prompts.length; i++) {
			const prompt = prompts[i]
			debug("USER> ", prompt, "\n\n")
			messages.push({
				role: "user",
				content: prompt,
			})
			await fs.writeFile(tmpFile, JSON.stringify({ messages, system }, null, 2))
			const args = ["chat", "--model", options.model, "--file", tmpFile]
			if ("temperature" in options) args.push("--temperature", options.temperature.toString())
			if ("maxTokens" in options) args.push("--max-tokens", options.maxTokens.toString())
			const response = await executeCmd(llmCmd, args)
			const result = response.trim()
			debug("ASSISTANT> ", result, "\n\n")
			messages.push({
				role: "assistant",
				content: result,
			})
		}
		return messages as GptMessage[]
	})
}

export async function promptLocal(system: string, prompt: string): Promise<string> {
	debug("USER> ", prompt, "\n\n")
	const args = ["-m", options.model, "-s", JSON.stringify(system), JSON.stringify(prompt)]
	const response = execSync([llmCmd, ...args].join(" ")).toString()
	debug("ASSISTANT> ", response, "\n\n")
	return response
}
