import { sleep } from "shared/sleep"
import { y } from "shared/syncAsync"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { BaseOKV, ListArgs, WriteArgs } from "./types"

// Works for both sync and async databases.
function* scoreboard(tx: BaseOKV<string, any> | AsyncBaseOKV<string, any>, limit: number) {
	const scores = yield* y(tx.list({ gte: "score:", lte: "score:\xff", limit, reverse: true }))
	const results = yield* y.all(
		scores.map(function* ({ value: { userId, score } }) {
			const [{ value: user }] = yield* y(tx.list({ gte: userId, lte: userId }))
			return { user, score }
		})
	)
	return results
}

const okv = new InMemoryBaseOKV<string, any>()
for (let i = 0; i < 20; i++) {
	const pad = (x: number) => x.toString().padStart(4, "0")
	okv.write({
		set: [{ key: `score:${pad(i)}`, value: { userId: `user:${pad(i)}`, score: i * 10 } }],
	})
	okv.write({
		set: [{ key: `user:${pad(i)}`, value: { userId: `user:${pad(i)}`, age: i } }],
	})
}

const result = y.run(scoreboard(okv, 10))
console.log(result)

export type AsyncBaseOKV<K, V> = {
	compare: (a: K, b: K) => number
	list(args?: ListArgs<K>): Promise<{ key: K; value: V }[]>
	write: (tx: WriteArgs<K, V>) => Promise<void>
}
const asyncOkv: AsyncBaseOKV<string, any> = {
	compare: (a, b) => a.localeCompare(b),
	list: async (args) => {
		await sleep(1000)
		return okv.list(args)
	},
	write: async (tx) => {
		return okv.write(tx)
	},
}

const asyncResult = await y.run(scoreboard(asyncOkv, 10))
console.log(asyncResult)
