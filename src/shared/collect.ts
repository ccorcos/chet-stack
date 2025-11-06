// Helper to collect all results from an async generator
export async function collect<T>(
	generator: AsyncGenerator<T> | Promise<AsyncGenerator<T>>
): Promise<T[]> {
	const results: T[] = []
	for await (const item of await generator) {
		results.push(item)
	}
	return results
}
