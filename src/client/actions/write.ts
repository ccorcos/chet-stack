import { compact, isEqual, uniqWith } from "lodash"
import { randomId } from "../../shared/randomId"
import { setRecordMap } from "../../shared/recordMapHelpers"
import { RecordMap, RecordPointer } from "../../shared/schema"
import {
	Transaction,
	applyOperation,
	invertOperation,
	squashOperations,
} from "../../shared/transaction"
import { ClientEnvironment } from "../services/ClientEnvironment"

const batchIntervalMs = 1200

export async function write(environment: ClientEnvironment, transaction: Transaction) {
	const { transactionQueue, undoRedo } = environment

	const undoTransaction = invertTransaction(environment, transaction)
	if (undoTransaction) {
		const newBatch = Date.now() - undoRedo.checkpoint > batchIntervalMs

		undoRedo.redoStack = []
		const lastTransaction = undoRedo.undoStack[undoRedo.undoStack.length - 1]
		if (!lastTransaction || newBatch) {
			undoRedo.checkpoint = Date.now()
			undoRedo.undoStack.push(undoTransaction)
		} else {
			lastTransaction.operations = squashOperations([
				...undoTransaction.operations,
				...lastTransaction.operations,
			])
		}
	}

	optimisticWrite(environment, transaction)
	return transactionQueue.enqueue(transaction)
}

export async function undo(environment: ClientEnvironment) {
	const { undoRedo, transactionQueue } = environment

	if (undoRedo.undoStack.length === 0) return

	undoRedo.checkpoint = 0
	const undoTransaction = undoRedo.undoStack.pop()!
	const redoTransaction = invertTransaction(environment, undoTransaction)
	if (!redoTransaction) throw new Error("Undo transactions should always be invertible.")
	undoRedo.redoStack.push(redoTransaction)

	optimisticWrite(environment, undoTransaction)
	return transactionQueue.enqueue(undoTransaction)
}

export async function redo(environment: ClientEnvironment) {
	const { undoRedo, transactionQueue } = environment

	if (undoRedo.redoStack.length === 0) return

	undoRedo.checkpoint = 0
	const redoTransaction = undoRedo.redoStack.pop()!
	const undoTransaction = invertTransaction(environment, redoTransaction)
	if (!undoTransaction) throw new Error("Undo transactions should always be invertible.")
	undoRedo.undoStack.push(undoTransaction)

	optimisticWrite(environment, redoTransaction)
	return transactionQueue.enqueue(redoTransaction)
}

function optimisticWrite(environment: ClientEnvironment, transaction: Transaction) {
	const { recordCache, recordStorage } = environment

	// Get cached records for this write.
	const pointers = uniqWith(
		transaction.operations.map(({ table, id }) => ({ table, id }) as RecordPointer),
		isEqual
	)

	const recordMap: RecordMap = {}
	for (const pointer of pointers) {
		const record = recordCache.getRecord(pointer)
		setRecordMap(recordMap, pointer, record)
	}

	// Optimist update.
	for (const operation of transaction.operations) {
		if (operation.serverOnly) continue
		applyOperation(recordMap, operation)
	}
	recordCache.writeRecordMap(recordMap)
	recordStorage.writeRecordMap(recordMap)
}

function invertTransaction(environment: ClientEnvironment, transaction: Transaction) {
	const { recordCache } = environment

	// Get cached records for this write.
	const pointers = uniqWith(
		transaction.operations.map(({ table, id }) => ({ table, id }) as RecordPointer),
		isEqual
	)

	const recordMap: RecordMap = {}
	for (const pointer of pointers) {
		const record = recordCache.getRecord(pointer)
		setRecordMap(recordMap, pointer, record)
	}

	const undoOperations = compact(
		transaction.operations
			.filter((op) => !op.serverOnly)
			.map((op) => invertOperation(recordMap, op))
	)
	if (undoOperations.length) {
		const undoTransaction: Transaction = {
			txId: randomId(),
			authorId: transaction.authorId,
			operations: undoOperations,
		}
		return undoTransaction
	}
}
