import { flatten, isEqual, uniqWith } from "lodash"
import { DeferredPromise } from "../../shared/DeferredPromise"
import { ReactiveMap } from "../../shared/ReactiveMap"
import { SecondMs } from "../../shared/dateHelpers"
import {
	BrokenError,
	PermissionError,
	TransactionConflictError,
	ValidationError,
} from "../../shared/errors"
import { randomId } from "../../shared/randomId"
import { RecordPointer, RecordTable } from "../../shared/schema"
import { sleep } from "../../shared/sleep"
import { Transaction } from "../../shared/transaction"
import { ClientApi, formatResponseError } from "./api"

type Thunk = { deferred: DeferredPromise<void>; transaction: Transaction }

function pointerToKey<T extends RecordTable>(pointer: RecordPointer<T>) {
	return [pointer.table, pointer.id].join(":")
}

export class TransactionQueue {
	constructor(
		private args: {
			environment: { api: ClientApi }
			onRollback: (transaction: Transaction) => Promise<void>
		}
	) {
		this.loadFromOffline()
	}

	private thunks: Thunk[] = []

	private pendingWrites = new ReactiveMap<string, number>()

	private incPendingWrites(pointers: RecordPointer[]) {
		const writes = pointers.map(pointerToKey).map((key) => {
			const n = this.pendingWrites.get(key) || 0
			return { key, value: n + 1 }
		})
		this.pendingWrites.write(writes)
	}

	private decPendingWrites(pointers: RecordPointer[]) {
		const writes = pointers.map(pointerToKey).map((key) => {
			const n = this.pendingWrites.get(key) || 0
			if (n === 0) console.error("This should never be zero!")

			if (n > 1) return { key, value: n - 1 }
			else return { key, value: undefined }
		})
		this.pendingWrites.write(writes)
	}

	isPendingWrite<T extends RecordTable>(pointer: RecordPointer<T>) {
		const n = this.pendingWrites.get(pointerToKey(pointer)) || 0
		return n > 0
	}
	subscribeIsPendingWrite<T extends RecordTable>(
		pointer: RecordPointer<T>,
		fn: (pending: boolean) => void
	): () => void {
		let prev = this.isPendingWrite(pointer)
		return this.pendingWrites.subscribe(pointerToKey(pointer), () => {
			const next = this.isPendingWrite(pointer)
			if (prev !== next) {
				prev = next
				fn(next)
			}
		})
	}

	reset() {
		localStorage.removeItem("transactions")
	}

	private saveForOffline() {
		localStorage.setItem(
			"transactions",
			JSON.stringify(this.thunks.map((thunk) => thunk.transaction))
		)
	}

	private loadFromOffline() {
		const result = localStorage.getItem("transactions")
		if (!result) return
		const transactions = JSON.parse(result) as Transaction[]
		for (const transaction of transactions) {
			this.enqueue(transaction)
		}
	}

	/** Use write(environment, transaction) instead of this function for optimistic updates. */
	enqueue(transaction: Transaction) {
		// Track which records have a pending write.
		const pointers = uniqWith(
			transaction.operations.map(({ table, id }) => ({ table, id }) as RecordPointer),
			isEqual
		)
		this.incPendingWrites(pointers)

		// This promise will get resolved once it is submitted.
		const deferred = new DeferredPromise<void>()
		this.thunks.push({ deferred, transaction })
		this.saveForOffline()
		this.dequeue()

		return deferred.promise.finally(() => {
			this.decPendingWrites(pointers)
		})
	}

	private running = false

	async dequeue() {
		if (this.running) return
		this.running = true

		// Note: You can also use Websocket status to detect online too.
		LOOP: while (this.thunks.length && navigator.onLine) {
			// Try writing a batch.
			const batch = this.getBatch()
			const { authorId } = batch[0].transaction
			const operations = flatten(batch.map(({ transaction }) => transaction.operations))
			const transaction: Transaction = { authorId, txId: randomId(), operations }

			const batchResult = await writeTransaction(this.args.environment, transaction)

			if (batchResult.type === "offline") break LOOP // Try again later...

			if (batchResult.type === "ok") {
				for (const thunk of batch) thunk.deferred.resolve()
				this.thunks.splice(0, batch.length)
				this.saveForOffline()
				continue LOOP
			}

			// If there's an error writing the batch, write each transaction one by one since
			// some of them might be fine on their own.

			for (const thunk of batch) {
				const result = await writeTransaction(this.args.environment, thunk.transaction)
				if (result.type === "offline") break LOOP // Try again later...

				this.thunks.shift()
				this.saveForOffline()

				if (result.type === "ok") thunk.deferred.resolve()
				if (result.type === "error") thunk.deferred.reject(result.error)

				if (result.type === "rollback") {
					await this.args.onRollback(thunk.transaction)
					thunk.deferred.reject(result.error)
				}
			}
		}

		this.running = false
	}

	private getBatch() {
		const maxContentLength = 100_000

		const thunk = this.thunks[0]
		const thunkSize = JSON.stringify(thunk.transaction).length

		let batchSize = thunkSize
		const batch: Thunk[] = [thunk]

		for (let i = 1; i < this.thunks.length; i++) {
			const thunk = this.thunks[i]
			const thunkSize = JSON.stringify(thunk.transaction).length
			if (batchSize + thunkSize > maxContentLength) break

			batchSize += thunkSize
			batch.push(thunk)
		}

		return batch
	}
}

type WriteResponse =
	| { type: "ok" }
	| { type: "offline" }
	| { type: "rollback"; error: Error }
	| { type: "error"; error: Error }

async function writeTransaction(
	environment: { api: ClientApi },
	transaction: Transaction
): Promise<WriteResponse> {
	let tries = 0

	// Submit and retry.
	while (true) {
		tries += 1

		const response = await environment.api.write(transaction)
		if (response.status === 200) {
			return { type: "ok" }
		}

		if (response.status === ValidationError.statusCode) {
			const error = new ValidationError(formatResponseError(response))
			return { type: "rollback", error }
		}

		if (response.status === PermissionError.statusCode) {
			const error = new PermissionError(formatResponseError(response))
			return { type: "rollback", error }
		}

		if (response.status === TransactionConflictError.statusCode) {
			// retry immediately
			continue
		}

		if (response.status === BrokenError.statusCode) {
			// Wait before retrying with exponential backoff.
			await sleep(Math.min(2 ** tries, 12) * 10 * SecondMs)
			continue
		}

		if (response.status === 0) {
			// Offline
			return { type: "offline" }
		}

		// Unknown error
		const error = new Error(response.status + ": " + response.body)
		return { type: "error", error }
	}
}
