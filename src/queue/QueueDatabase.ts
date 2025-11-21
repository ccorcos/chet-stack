import sqlite from "better-sqlite3"
import { SQLiteOkv } from "tupledb/SQLiteOkv"
import { tupleDb, tupleOkv, tupleTx } from "tupledb/TupleDb"
import { TupleDb } from "tupledb/types"
import { Task, TaskError } from "./types"

function enqueueTask(db: TupleDb, task: Task) {
	const { id, runAt } = task
	db.set(["task/id", id], task)
	db.set(["task/waiting", runAt, id], null)
}

function dequeueTask(db: TupleDb, now: string) {
	const waiting = db.subspace(["task/waiting"])
	const running = db.subspace(["task/running"])
	const tasks = db.subspace(["task/id"])

	// Remove from waiting.
	const result = waiting.list({ lte: [now], limit: 1 })
	if (result.length === 0) return
	const [_runAt, taskId] = result[0].key
	waiting.delete([_runAt, taskId])

	const task = tasks.get([taskId])
	if (!task) throw new Error(`Missing task data: ${taskId}`)
	running.set([now, taskId], null)
	const startingTask: Task = { ...task, startedAt: now }
	tasks.set([taskId], startingTask)

	return startingTask
}

function finishTask(db: TupleDb, task: Task, error?: TaskError) {
	const tasks = db.subspace(["task/id"])
	const running = db.subspace(["task/running"])
	const failed = db.subspace(["task/failed"])

	const { startedAt, id } = task
	if (!startedAt) throw new Error(`Cannot finish a task that was never started: ${id}`)

	// Remove from running.
	running.delete([startedAt, id])

	if (error) {
		// Keep the task around for retrying and debugging.
		failed.set([startedAt, id], null)
	} else {
		tasks.delete([id])
	}
}

function retry(db: TupleDb, n: number, now: string) {
	const tasks = db.subspace(["task/id"])
	const failed = db.subspace(["task/failed"])
	const failures = failed.list({ limit: n })
	for (const failure of failures) {
		const [_startedAt, taskId] = failure.key
		failed.delete(failure.key)
		const task = tasks.get([taskId])
		if (!task) throw new Error(`Missing task data: ${taskId}`)
		const renewedTask: Task = { ...task, runAt: now, startedAt: undefined, error: undefined }
		enqueueTask(db, renewedTask)
	}
	return failures.length
}

const debug = (...args: any[]) => console.log("queue:", ...args)

export class QueueDatabase {
	private db: TupleDb

	constructor(private dbPath: string) {
		this.db = tupleDb(tupleOkv(new SQLiteOkv(sqlite(this.dbPath))))
	}

	enqueueTask(task: Task) {
		debug(`> enqueue.${task.name}`)
		return enqueueTask(this.db, task)
	}

	dequeueTask(now: string): Task | undefined {
		const task = dequeueTask(this.db, now)
		if (task) debug(`< dequeue.${task.name}`)
		return task as Task | undefined
	}

	finishTask(task: Task, error?: TaskError) {
		if (error) {
			console.error(error)
			debug(`. error.${task.name}`)
		} else {
			debug(`. finish.${task.name}`)
		}

		return finishTask(this.db, task, error)
	}

	retry(now: string) {
		while (true) {
			const result = retry(this.db, 100, now)
			if (result < 100) break
		}
	}

	reset() {
		while (true) {
			const tuples = this.db.list({ limit: 100 })
			if (tuples.length === 0) break
			const tx = tupleTx(this.db)
			for (const tuple of tuples) tx.delete(tuple.key)
			tx.commit()
		}
	}
}
