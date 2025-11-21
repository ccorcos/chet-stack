import { randomId } from "shared/randomId"
import { Task, TaskHandlers } from "./types"

export type EnqueueApi<T extends TaskHandlers<any>> = {
	[K in keyof T]: (args: Parameters<T[K]>[1], options?: { runAt: string }) => Promise<string>
}

/** A convenient way to call task apis. */
export function enqueueApi(queue: { enqueueTask: (task: Task) => void }): EnqueueApi<any> {
	return new Proxy(
		{},
		{
			get(target, name: string, reciever) {
				return async (args, options?: { runAt: string }) => {
					let runAt: string
					if (options?.runAt) {
						runAt = options.runAt
					} else {
						runAt = new Date().toISOString()
					}

					const task: Task = {
						id: randomId(),
						name,
						args,
						runAt,
					}
					await queue.enqueueTask(task)
					return task.id
				}
			},
		}
	)
}
