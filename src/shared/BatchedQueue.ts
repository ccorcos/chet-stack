import { DeferredPromise } from "./DeferredPromise"

type Task<I, O> = {
	input: I
	output: DeferredPromise<O>
}

/** A useful tool for batching computation and working in parallel. */
export class BatchedQueue<I, O> {
	constructor(
		private args: {
			processBatch: (batch: I[]) => Promise<O[]>
			maxParallel: number
			maxBatchSize: number
			delayMs: number
		}
	) {}

	private tasks: Task<I, O>[] = []
	public enqueue(input: I): Promise<O> {
		const output = new DeferredPromise<O>()
		this.tasks.push({ input, output })

		setTimeout(this.flush, this.args.delayMs)

		return output.promise
	}

	activeBatches = 0

	private flush = async () => {
		if (this.tasks.length === 0) return
		if (this.activeBatches >= this.args.maxParallel) return

		this.activeBatches += 1

		const batch = this.tasks.splice(0, this.args.maxBatchSize)
		const inputs = batch.map((task) => task.input)

		try {
			const outputs = await this.args.processBatch(inputs)
			for (const [i, value] of outputs.entries()) {
				batch[i].output.resolve(value)
			}
		} catch (error) {
			for (const { output } of batch) {
				output.reject(error)
			}
		} finally {
			this.activeBatches -= 1
			this.flush()
		}
	}
}
