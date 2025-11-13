import { sleep } from "shared/sleep"
import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { BaseOKV, ListArgs, WriteArgs } from "./types"

export function* one<T>(value: T): Generator<any, Awaited<T>, any> {
	const result = yield value
	return result as Awaited<T>
}

const isYieldAll = Symbol("is-yield-all")

export function* all<T>(args: Array<Generator<any, T, any>>): Generator<any, Awaited<T>[], any> {
	args[isYieldAll] = true
	const results = yield args
	return results
}

type YieldedFn<T extends (...args: any[]) => any> = (
	...args: Parameters<T>
) => Generator<any, Awaited<ReturnType<T>>, any>

type Yielded<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? YieldedFn<T[K]> : T[K]
}

export function yielded<T extends object>(obj: T): Yielded<T> {
	return new Proxy(obj, {
		get(target, prop) {
			const original = target[prop as keyof T]
			if (typeof original === "function") {
				return function* (...args: any[]) {
					const result = yield* one(original.apply(target, args))
					return result
				}
			}
			return original
		},
	}) as Yielded<T>
}

async function runAsync<T>(gen: Generator<any, T, any>, nextArg: any): Promise<T> {
	let step = gen.next(await nextArg)
	while (!step.done) {
		if (step.value?.[isYieldAll]) {
			const result = await Promise.all(step.value.map(run))
			step = gen.next(result)
		} else {
			const result = await step.value
			step = gen.next(result)
		}
	}
	return step.value
}

export function run<T>(gen: Generator<any, T, any>): T {
	let step = gen.next()
	while (!step.done) {
		// Check if this is a yield-all operation
		if (step.value?.[isYieldAll]) {
			const result = step.value.map(run)
			if (result.some((r) => r instanceof Promise)) {
				// Upgrade to async
				return runAsync(gen, Promise.all(result)) as T
			} else {
				step = gen.next(result)
			}
		} else if (step.value instanceof Promise) {
			// Upgrade to async mode
			return runAsync(gen, step.value) as T
		} else {
			step = gen.next(step.value)
		}
	}
	return step.value
}

function* scoreboard(tx: Yielded<BaseOKV<string, any>>, limit: number) {
	const scores = yield* tx.list({ gte: "score:", lte: "score:\xff", limit, reverse: true })
	const results = yield* all(
		scores.map(function* ({ key, value: { userId, score } }) {
			const [{ value: user }] = yield* tx.list({ gte: userId, lte: userId })
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

const tx = yielded(okv)
const result = run(scoreboard(tx, 10))
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

const asyncTx = yielded(asyncOkv)
const asyncResult = await run(scoreboard(asyncTx, 10))
console.log(asyncResult)
