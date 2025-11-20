import { serializeError } from "serialize-error"
import { SecondMs } from "shared/dateHelpers"
import { sleep } from "shared/sleep"
import { ServerEnvironment } from "./ServerEnvironment"
import { TaskError } from "./services/QueueDatabase"
import { tasks } from "./tasks"

/**
 * This only makes sense to run in the same process while the database is embedded.
 * One day the database can be another process and this queue server can be another process.
 */
export function QueueServer(environment: ServerEnvironment) {
	let running = true

	const stop = () => {
		running = false
	}

	;(async () => {
		const { queue } = environment
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
				const fn = tasks[task.name]
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
