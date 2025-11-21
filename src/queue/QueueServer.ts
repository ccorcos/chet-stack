import { serializeError } from "serialize-error"
import { SecondMs } from "shared/dateHelpers"
import { sleep } from "shared/sleep"
import { Task, TaskError, TaskHandlers } from "./types"

/**
 * Processes tasks from the queue.
 */
export function QueueServer<T>(
	queue: {
		dequeueTask: (now: string) => Task | undefined
		finishTask: (task: Task, error?: TaskError) => void
	},
	environment: T,
	handlers: TaskHandlers<T>
) {
	let running = true

	const stop = () => {
		running = false
	}

	;(async () => {
		const intervalMs = SecondMs

		while (running) {
			const date = new Date().toISOString()
			const task = await queue.dequeueTask(date)
			if (!task) {
				await sleep(intervalMs)
				continue
			}

			// TODO: timeout after 30 seconds.
			let taskError: TaskError | undefined
			try {
				const fn = handlers[task.name]
				await fn(environment, task.args)
			} catch (error) {
				taskError = serializeError(error) as TaskError
			} finally {
				await queue.finishTask(task, taskError)
			}
		}
	})()

	return stop
}
