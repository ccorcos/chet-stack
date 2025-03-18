import { Anthropic } from "@anthropic-ai/sdk"
import { MessageParam as ClaudeMessage } from "@anthropic-ai/sdk/resources/index.mjs"
import "dotenv/config"
import { OpenAI } from "openai"

// Initialize the client
const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Message = { role: string; content: string }
type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

const model: "openai" | "claude" = "openai"
const OpenAiModel: OpenAI.Chat.ChatModel = "gpt-4.5-preview" //"gpt-4o-mini";
const ClaudeModel: Anthropic.Model = "claude-3-7-sonnet-latest"

const DEBUG = true
const debug = (...args: any[]) => {
	if (DEBUG) console.error(...args)
}

const log = (...args: any[]) => {
	console.warn(...args)
}

export async function recurPromptClaude(system: string, prompts: string[]): Promise<Message[]> {
	const messages: ClaudeMessage[] = []

	for (let i = 0; i < prompts.length; i++) {
		const prompt = prompts[i]

		debug("USER> ", prompt, "\n\n")
		messages.push({
			role: "user",
			content: prompt,
		})

		const response = await retry(
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

	return messages as Message[]
}

export async function recurPromptOpenAI(system: string, prompts: string[]): Promise<Message[]> {
	const messages: OpenAIMessage[] = []

	messages.push({
		role: "system",
		content: system,
	})

	for (let i = 0; i < prompts.length; i++) {
		const prompt = prompts[i]

		debug("USER> ", prompt, "\n\n")
		messages.push({
			role: "user",
			content: prompt,
		})

		const response = await retry(async () =>
			openai.chat.completions.create({
				model: OpenAiModel,
				messages: messages,
				top_p: 0.1,
			})
		)

		const result = response.choices[0].message.content!

		debug("ASSISTANT> ", result, "\n\n")
		messages.push({
			role: "assistant",
			content: result,
		})
	}

	// Ignore the system prompt to be consistent with Claude.
	return messages.slice(1) as Message[]
}

function formatMessages(messages: Message[]) {
	return messages.map(({ role, content }) => `${role}> ${content}`).join("\n\n\n")
}

async function retry<T>(fn: () => Promise<T>, tries = 0) {
	try {
		// console.error("running")
		return await fn()
	} catch (error) {
		if (tries >= 10) throw error

		if (error.status === 429) {
			// message: 'Rate limit reached for gpt-4o-mini in organization org-zt8czUs8Thn5aBD4n2Jf1kve on tokens per min (TPM): \
			// Limit 200000, Used 163084, Requested 62318. Please try again in 7.62s."
			const match = error.message.match(/try again in (\d+\.\d+)s/)
			const waitTimeMs = match
				? parseFloat(match[1]) * 1000 + 300 // 300ms more than recommended in the error.
				: 60_000 + 10 + 2 ** tries * 10 // Or 1min + 10ms + 2^n * 10ms backoff.

			console.error(error)
			console.error(`RATE LIMIT, sleeping for ${waitTimeMs}ms`)
			await sleep(waitTimeMs)
			return retry(fn, tries + 1)
		}

		throw error
	}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
