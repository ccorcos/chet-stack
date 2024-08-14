import { Assert } from "tuple-database/database/typeHelpers"
import { ServerEnvironment } from "./services/ServerEnvironment"
import * as queueTasks from "./tasks/autoindex"

type TaskHandler = (environment: ServerEnvironment, args: any) => Promise<any>

type Q = typeof queueTasks
export type TaskName = keyof Q

// Assert proper types.
type A1 = Assert<Q, { [K in keyof Q]: { [J in K]: TaskHandler } }>

export type Tasks = { [K in keyof Q]: Extract<Q[K], { [T in K]: any }>[K] }

const tasks: Tasks = {} as any
for (const taskName in queueTasks) tasks[taskName] = queueTasks[taskName][taskName]
export { tasks }
