/*

npx tsx src/tools/gpt.ts

*/

import { promptLocal } from "../server/helpers/gptLocal"

async function main() {
	const result = await promptLocal("You are a comedian", "How many mexicans live in CA?")
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main()
}
