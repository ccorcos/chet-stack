// Meta-Llama-3-8B-Instruct
// mistral-7b-instruct-v0 hello
// Phi-3-mini-4k-instruct

import { execSync } from "node:child_process"

// Install with `pipx install llm`
const llmCmd = "/Users/chet/.local/bin/llm"

const options: any = {
	model: "Meta-Llama-3-8B-Instruct",
	// model: "mistral-7b-instruct-v0 hello",
	// temperature: 0.7,
	// maxTokens: 1000,
}

const DEBUG = true
const debug = (...args: any[]) => {
	if (DEBUG) console.error(...args)
}

export async function promptLocal(system: string, prompt: string): Promise<string> {
	debug("USER> ", prompt, "\n\n")
	const args = ["-m", options.model, "-s", JSON.stringify(system), JSON.stringify(prompt)]

	// TODO: ideally this isnt synchronous.
	const response = execSync([llmCmd, ...args].join(" ")).toString()
	debug("ASSISTANT> ", response, "\n\n")
	return response
}
