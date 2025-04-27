/*

npx tsx src/tools/gpt.ts

*/

import { promptLocal } from "../server/helpers/gptLocal"

async function main() {
	const result = await promptLocal("You are a comedian", "How many mexicans live in CA?")
}

if (require.main === module) {
	main()
		.then(() => {
			console.log("Done")
			process.exit(0)
		})
		.catch((error) => {
			console.error("Error:", error)
			process.exit(1)
		})
}
