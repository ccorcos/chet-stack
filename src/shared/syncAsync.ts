export function* y<T>(value: T): Generator<any, Awaited<T>, any> {
	const result = yield value
	return result as Awaited<T>
}

const isYieldAll = Symbol("is-yield-all")

function* all<T>(args: Array<Generator<any, T, any>>): Generator<any, Awaited<T>[], any> {
	args[isYieldAll] = true
	const results = yield args
	return results
}

y.all = all

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

function run<T>(gen: Generator<any, T, any>): T {
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

y.run = run
