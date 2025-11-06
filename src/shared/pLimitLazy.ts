import { LoaderPromise } from "./LoaderPromise"

export async function* pLimitLazy<T, R>(
	concurrency: number,
	generator: AsyncGenerator<T>,
	processor: (item: T) => Promise<R>
): AsyncGenerator<R> {
	const tasks = new Map<number, LoaderPromise<R>>()

	let currentId = 0
	let nextId = 0
	for await (const item of generator) {
		// Dequeue next task
		const taskId = nextId
		const task = new LoaderPromise(processor(item))
		tasks.set(taskId, task)
		nextId += 1

		// Try to yield the current task
		const current = tasks.get(currentId)!
		if (current.resolved || current.rejected) {
			tasks.delete(currentId)
			currentId += 1
			yield current.promise
		}

		const pending = Array.from(tasks.values())
			.filter((task) => !task.resolved && !task.rejected)
			.map((task) => task.promise)

		if (pending.length >= concurrency) {
			await Promise.race(pending)
		}
	}

	// Yield all remaining tasks in order
	while (currentId < nextId) {
		const current = tasks.get(currentId)!
		await current.promise
		tasks.delete(currentId)
		currentId += 1
		yield current.promise
	}
}
