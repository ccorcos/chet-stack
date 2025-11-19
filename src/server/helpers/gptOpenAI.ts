import "dotenv/config"
import { OpenAI } from "openai"
import { GptMessage, retryFetchGpt } from "./gpt"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

const OpenAiModel = "gpt-4.5-preview" as const //"gpt-4o-mini";

const DEBUG = true
const debug = (...args: any[]) => {
	if (DEBUG) console.error(...args)
}

export async function recurPromptOpenAI(system: string, prompts: string[]): Promise<GptMessage[]> {
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

		const response = await retryFetchGpt(async () =>
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
	return messages.slice(1) as GptMessage[]
}
