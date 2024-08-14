import {
	AsyncTupleDatabase,
	AsyncTupleDatabaseClient,
	AsyncTupleDatabaseClientApi,
	namedTupleToObject,
	transactionalReadWriteAsync,
	transactionalWrite,
} from "tuple-database"
import { FileTupleStorage } from "tuple-database/storage/FileTupleStorage"
import { randomId } from "../../shared/randomId"
import { Simplify } from "../../shared/typeHelpers"
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

type TaskDatabaseSchema =
	| { key: ["task", { id: string }]; value: Task }
	| { key: ["waiting", { run_at: string }, { id: string }]; value: null }
	| { key: ["running", { started_at: string }, { id: string }]; value: null }
	| { key: ["failed", { started_at: string }, { id: string }]; value: Task }

const enqueueTask = transactionalWrite<TaskDatabaseSchema>()((tx, task: Task) => {
	const { id, run_at } = task
	tx.set(["task", { id }], task)
	tx.set(["waiting", { run_at }, { id }], null)
})

const dequeueTask = transactionalReadWriteAsync<TaskDatabaseSchema>()(async (tx, now: string) => {
	const waiting = tx.subspace(["waiting"])
	const running = tx.subspace(["running"])
	const tasks = tx.subspace(["task"])

	const result = await waiting.scan({ lte: [{ run_at: now }], limit: 1 })
	if (result.length === 0) return
	const tuple = result[0].key
	const taskId = namedTupleToObject(tuple).id

	const task = await tasks.get([{ id: taskId }])
	if (!task) throw new Error(`Missing task data: ${taskId}`)

	waiting.remove(tuple)
	tasks.set([{ id: taskId }], { ...task, started_at: now })
	running.set([{ started_at: now }, { id: taskId }], null)
	return { ...task, started_at: now }
})

const finishTask = transactionalWrite<TaskDatabaseSchema>()((tx, task: Task, error?: TaskError) => {
	const tasks = tx.subspace(["task"])
	const running = tx.subspace(["running"])
	const failed = tx.subspace(["failed"])

	const { started_at, id } = task
	if (!started_at) throw new Error(`Cannot finish a task that was never started: ${id}`)

	running.remove([{ started_at }, { id }])
	tasks.remove([{ id }])

	if (!error) return

	failed.set([{ started_at }, { id }], { ...task, error })
})

const debug = (...args: any[]) => console.log("queue:", ...args)

export class QueueDatabase {
	private db: AsyncTupleDatabaseClientApi<TaskDatabaseSchema>

	constructor(private dbPath: string) {
		this.db = new AsyncTupleDatabaseClient(
			new AsyncTupleDatabase(new FileTupleStorage(this.dbPath))
		)
		this.createEnqueueProxy()
	}

	private async enqueueTask(task: Task) {
		debug(`> enqueue.${task.name}`)
		return await enqueueTask(this.db, task)
	}

	async dequeueTask(now: string) {
		const task = await dequeueTask(this.db, now)
		if (task) debug(`< dequeue.${task.name}`)
		return task
	}

	async finishTask(task: Task, error?: TaskError) {
		if (error) {
			console.error(error)
			debug(`. error.${task.name}`)
		} else {
			debug(`. finish.${task.name}`)
		}

		return await finishTask(this.db, task, error)
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

	async reset() {
		while (true) {
			const tuples = await this.db.scan({ limit: 100 })
			if (tuples.length === 0) break
			const tx = this.db.transact()
			for (const tuple of tuples) tx.remove(tuple.key)
			await tx.commit()
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
