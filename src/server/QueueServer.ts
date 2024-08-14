import { serializeError } from "serialize-error"
import { SecondMs } from "../shared/dateHelpers"
import { sleep } from "../shared/sleep"
import { TaskError } from "./services/QueueDatabase"
import { ServerEnvironment } from "./services/ServerEnvironment"
import { tasks } from "./tasks"

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
