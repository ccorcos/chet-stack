import { TaskHandler } from "queue/types"
import { Assert } from "shared/typeHelpers"
import { ServerEnvironment } from "./ServerEnvironment"
import * as queueTasks from "./tasks/index"

type TasksIndex = typeof queueTasks

// Assert proper types.
type A1 = Assert<
	TasksIndex,
	{ [K in keyof TasksIndex]: { [J in K]: TaskHandler<ServerEnvironment> } }
>

export type TasksType = { [K in keyof TasksIndex]: Extract<TasksIndex[K], { [T in K]: any }>[K] }

const tasks: TasksType = {} as any
for (const taskName in queueTasks) tasks[taskName] = queueTasks[taskName][taskName]
export { tasks }
