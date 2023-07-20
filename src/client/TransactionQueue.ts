import { isEqual, uniqWith } from "lodash"
import { DeferredPromise } from "../shared/DeferredPromise"
import { SecondMs } from "../shared/dateHelpers"
import {
	BrokenError,
	PermissionError,
	TransactionConflictError,
	ValidationError,
} from "../shared/errors"
import { setRecordMap } from "../shared/recordMapHelpers"
import { RecordMap, RecordPointer } from "../shared/schema"
import { sleep } from "../shared/sleep"
import { Transaction, applyOperation } from "../shared/transaction"
import { RecordCache } from "./RecordCache"
import { ClientApi } from "./api"

type Thunk = { deferred: DeferredPromise<void>; transaction: Transaction }

export class TransactionQueue {
	constructor(
		private args: {
			environment: { recordCache: RecordCache; api: ClientApi }
			onUpdateRecordMap: (recordMap: RecordMap, force?: boolean) => void
		}
	) {}

	private thunks: Thunk[] = []

	enqueue(transaction: Transaction) {
		// Apply operations to the local cache.
		const pointers = uniqWith(
			transaction.operations.map(({ table, id }) => ({ table, id } as RecordPointer)),
			isEqual
		)

		const recordMap: RecordMap = {}
		for (const pointer of pointers) {
			const record = this.args.environment.recordCache.get(pointer)
			setRecordMap(recordMap, pointer, record)
		}

		// Apply the mutations.
		for (const operation of transaction.operations) {
			applyOperation(recordMap, operation)
		}

		// Optimistically update the local cache.
		this.args.onUpdateRecordMap(recordMap)

		// This promise will get resolved once it is submitted.
		const deferred = new DeferredPromise<void>()
		this.thunks.push({ deferred, transaction })
		this.dequeue()

		return deferred.promise
	}

	private running = false

	private async dequeue() {
		if (this.running) return
		while (this.thunks.length) {
			const thunk = this.thunks.shift()
			if (!thunk) break
			await this.write(thunk)
		}
		this.running = false
	}

	private async write(thunk: Thunk) {
		const { deferred, transaction } = thunk
		// Submit and retry.
		while (true) {
			const response = await this.args.environment.api.write(transaction)
			if (response.status === 200) {
				return deferred.resolve()
			}

			if (response.status === ValidationError.statusCode) {
				await this.rollback(transaction)
				return deferred.reject(new ValidationError(response.body))
			}

			if (response.status === PermissionError.statusCode) {
				await this.rollback(transaction)
				return deferred.reject(new PermissionError(response.body))
			}

			if (response.status === TransactionConflictError.statusCode) {
				// retry immediately
				continue
			}

			if (response.status === BrokenError.statusCode) {
				// Wait before retrying.
				await sleep(10 * SecondMs)
				continue
			}

			// Unknown error
			return deferred.reject(new Error(response.status + ": " + response.body))
		}
	}

	private async rollback(transaction: Transaction) {
		// Get all the pointers, fetch the latest and force update the cache.
		const pointers = uniqWith(
			transaction.operations.map(({ table, id }) => ({ table, id } as RecordPointer)),
			isEqual
		)

		const response = await this.args.environment.api.getRecords({ pointers })
		if (response.status !== 200) throw new Error("Fix me.")

		// Force update the cache.
		const recordMap: RecordMap = response.body.recordMap
		this.args.onUpdateRecordMap(recordMap, true)
	}
}
