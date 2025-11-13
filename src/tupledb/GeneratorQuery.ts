import { InMemoryBaseOKV } from "./InMemoryBaseOKV"
import { ListArgs, WriteArgs } from "./types"

export type SyncBaseOKV<K, V> = {
	list(args?: ListArgs<K>): { key: K; value: V }[]
	write: (tx: WriteArgs<K, V>) => void
}

export type AsyncBaseOKV<K, V> = {
	list(args?: ListArgs<K>): Promise<{ key: K; value: V }[]>
	write: (tx: WriteArgs<K, V>) => Promise<void>
}

type QueryOp<K, V> = {
	[F in keyof SyncBaseOKV<K, V>]: { fn: F; args: Parameters<SyncBaseOKV<K, V>[F]> }
}[keyof SyncBaseOKV<K, V>]

type AnyFunction = (...args: any[]) => any
type FnObject = { [key: string]: AnyFunction }
type GenObject<T extends FnObject> = {
	[K in keyof T]: (
		...args: Parameters<T[K]>
	) => Generator<
		{ fn: K; args: Parameters<T[K]> },
		ReturnType<Awaited<T[K]>>,
		ReturnType<Awaited<T[K]>>
	>
}

function gen<T extends FnObject>(obj: T) {
	// TODO: use a proxy instead.
	const result: any = {}
	for (const key in obj) {
		const gen = function* (args) {
			const result = yield* obj[key](...args)
			return result
		}
		result[key] = gen
	}
	return result as GenObject<T>
}

const okv: SyncBaseOKV<string, any> = new InMemoryBaseOKV<string, any>()
const tx = gen(okv)

/** The Promise.all analog for generators. */
function* all<T>(args: Array<Generator<any, T, any>>): Generator<any, T[], any> {
	const results: T[] = []
	for (const arg of args) {
		const result = yield* arg
		results.push(result)
	}
	return results
}

function* scoreboard(tx: GenObject<SyncBaseOKV<string, any>>, limit: number) {
	const scores = yield* tx.list({ limit })
	const results = yield* all(
		scores.map(function* ({ key, value: { userId, score } }) {
			const [{ value: user }] = yield* tx.list({ gte: userId, lte: userId })
			return { user, score }
		})
	)
	return results
}

function runSync<T>(db: SyncBaseOKV<string, any>, gen: Generator<any, T, any>): T {
	let step = gen.next()
	while (!step.done) {
		const op = step.value
		const out = db[op.fn](...op.args)
		step = gen.next(out)
	}
	return step.value
}

async function runAsync<T>(db: AsyncBaseOKV<string, any>, gen: Generator<any, T, any>): Promise<T> {
	let step = gen.next()
	while (!step.done) {
		const op = step.value
		const out = await db[op.fn](...op.args)
		step = gen.next(out)
	}
	return step.value
}
