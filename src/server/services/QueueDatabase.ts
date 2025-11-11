import sqlite from "better-sqlite3"
import { isPlainObject } from "lodash-es"
import { randomId } from "shared/randomId"
import { Simplify } from "shared/typeHelpers"
import { SQLiteBaseOKV } from "tupledb/SQLiteBaseOKV"
import { tupleDb, tupleOkv, tupleTx } from "tupledb/TupleDb"
import { Tuple, TupleDb } from "tupledb/types"
import { TaskName, Tasks } from "../tasks"

type QueueTaskArgs = {
	[K in keyof Tasks]: Parameters<Tasks[K]>[1]
}

export type TaskError = {
	name: string
	message: string
	stack: string
}

type Task<T extends TaskName = TaskName> = {
	id: string
	name: T
	args: QueueTaskArgs[T]
	run_at: string // ISO date string.
	started_at?: string
	error?: TaskError
}

// TODO: tests
// TODO: schema
type TaskDatabaseSchema =
	| { key: ["task", { id: string }]; value: Task }
	| { key: ["waiting", { run_at: string }, { id: string }]; value: null }
	| { key: ["running", { started_at: string }, { id: string }]; value: null }
	| { key: ["failed", { started_at: string }, { id: string }]; value: Task }

function enqueueTask(db: TupleDb, task: Task) {
	const { id, run_at } = task
	db.set(["task", { id }], task)
	db.set(["waiting", { run_at }, { id }], null)
}

function dequeueTask(db: TupleDb, now: string) {
	const waiting = db.subspace(["waiting"])
	const running = db.subspace(["running"])
	const tasks = db.subspace(["task"])

	const result = waiting.list({ lte: [{ run_at: now }], limit: 1 })
	if (result.length === 0) return
	const tuple = result[0].key
	const taskId = namedTupleToObject(tuple).id

	const task = tasks.get([{ id: taskId }])
	if (!task) throw new Error(`Missing task data: ${taskId}`)

	waiting.delete(tuple)
	tasks.set([{ id: taskId }], { ...task, started_at: now })
	running.set([{ started_at: now }, { id: taskId }], null)
	return { ...task, started_at: now }
}

function finishTask(db: TupleDb, task: Task, error?: TaskError) {
	const tasks = db.subspace(["task"])
	const running = db.subspace(["running"])
	const failed = db.subspace(["failed"])

	const { started_at, id } = task
	if (!started_at) throw new Error(`Cannot finish a task that was never started: ${id}`)

	running.delete([{ started_at }, { id }])
	tasks.delete([{ id }])

	if (!error) return

	failed.set([{ started_at }, { id }], { ...task, error })
}

const debug = (...args: any[]) => console.log("queue:", ...args)

export class QueueDatabase {
	private db: TupleDb

	constructor(private dbPath: string) {
		this.db = tupleDb(tupleOkv(new SQLiteBaseOKV(sqlite(this.dbPath))))
		this.createEnqueueProxy()
	}

	private enqueueTask(task: Task) {
		debug(`> enqueue.${task.name}`)
		return enqueueTask(this.db, task)
	}

	dequeueTask(now: string) {
		const task = dequeueTask(this.db, now)
		if (task) debug(`< dequeue.${task.name}`)
		return task
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

	enqueue: EnqueueApi

	private createEnqueueProxy() {
		const self = this
		this.enqueue = new Proxy(
			{},
			{
				get(target, key: any, reciever) {
					return async (args, options?: { runAt: string }) => {
						let runAt: string
						if (options?.runAt) {
							runAt = options.runAt
						} else {
							runAt = new Date().toISOString()
						}

						const task: Task = {
							id: randomId(),
							name: key as TaskName,
							args: args as QueueTaskArgs[TaskName],
							run_at: runAt,
						}
						await self.enqueueTask(task)
						return task.id
					}
				},
			}
		) as any
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

type EnqueueApi = {
	[K in keyof QueueTaskArgs]: (
		args: QueueTaskArgs[K],
		options?: { runAt: string }
	) => Promise<string>
}

export type QueueDatabaseApi = Simplify<QueueDatabase>

function namedTupleToObject(key: Tuple) {
	const obj = key.filter(isPlainObject).reduce((obj, item) => Object.assign(obj, item), {})
	return obj as any
}
