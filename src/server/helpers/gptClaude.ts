import { Anthropic } from "@anthropic-ai/sdk"
import { MessageParam as ClaudeMessage } from "@anthropic-ai/sdk/resources/index.mjs"
import "dotenv/config"
import { GptMessage, retryFetchGpt } from "./gpt"

// Initialize the client
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const ClaudeModel: Anthropic.Model = "claude-3-7-sonnet-latest"

const DEBUG = true
const debug = (...args: any[]) => {
	if (DEBUG) console.error(...args)
}

export async function recurPromptClaude(system: string, prompts: string[]): Promise<GptMessage[]> {
	const messages: ClaudeMessage[] = []

	for (let i = 0; i < prompts.length; i++) {
		const prompt = prompts[i]

		debug("USER> ", prompt, "\n\n")
		messages.push({
			role: "user",
			content: prompt,
		})

		const response = await retryFetchGpt(
			async () =>
				await anthropic.messages.create({
					model: ClaudeModel,
					max_tokens: 5000,
					system: system,
					messages: messages,
				})
		)

		// @ts-ignore
		const result = response.content[0].text

		debug("ASSISTANT> ", result, "\n\n")
		messages.push({
			role: "assistant",
			content: result,
		})
	}

	return messages as GptMessage[]
}
