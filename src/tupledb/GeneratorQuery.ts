import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { BaseOKV } from "./types"

type AnyFunction = (...args: any[]) => any

function* one<T>(value: T): Generator<any, Awaited<T>, any> {
	const result = yield value
	return result as Awaited<T>
}

function* all<T>(args: Array<Generator<any, T, any>>): Generator<any, Awaited<T>[], any> {
	const results = yield args
	return results
}

type YieldedFn<T extends (...args: any[]) => any> = (
	...args: Parameters<T>
) => Generator<any, Awaited<ReturnType<T>>, any>

type Yielded<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? YieldedFn<T[K]> : T[K]
}

function yieldedFns<T extends object>(obj: T): Yielded<T> {
	return new Proxy(obj, {
		get(target, prop) {
			const original = target[prop as keyof T]
			if (typeof original === "function") {
				return function* (...args: any[]) {
					const result = yield* one((original as AnyFunction).apply(target, args))
					return result
				}
			}
			return original
		},
	}) as Yielded<T>
}

const okv = new InMemoryBaseOKV<string, any>()
const tx = yieldedFns(okv)

function* scoreboard(tx: Yielded<BaseOKV<string, any>>, limit: number) {
	const scores = yield* tx.list({ limit })
	const results = yield* all(
		scores.map(function* ({ key, value: { userId, score } }) {
			const [{ value: user }] = yield* tx.list({ gte: userId, lte: userId })
			return { user, score }
		})
	)
	return results
}

function run<T>(gen: Generator<any, T, any>): T {
	let step = gen.next()
	while (!step.done) {
		if (step.value instanceof Promise) {
			// Once we hit a promise, upgrade to async mode
			return (async () => {
				let result = await step.value
				step = gen.next(result)
				while (!step.done) {
					result = await step.value
					step = gen.next(result)
				}
				return step.value
			})() as T
		} else {
			step = gen.next(step.value)
		}
	}
	return step.value
}
