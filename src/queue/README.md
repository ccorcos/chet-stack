# Queue

It's common to offload computationally intensive tasks to a queue for workers to churn through in the background. There are many ways you might want to alter this queue to fit your specific needs, and you'll likely use something like Kafka in a larger system.

## QueueDatabase

A simple database for enqueuing and dequeuing tasks. You likely don't need to interact with this directly. One nice feature is `runAt` which allows you to schedule tasks to be run in the future.

```ts
import { QueueDatabase } from "queue/QueueDatabase"
const queueDb = new QueueDatabase("queue.db")

// Enqueue a task to run immediately
const now = new Date().toISOString()
queueDb.enqueueTask({
	id: "task-123",
	name: "followup",
	args: { message: "Hello" },
	runAt: now,
})

// Dequeue the next task that's ready to run
const task = queueDb.dequeueTask(now)

// Finish a task successfully
queueDb.finishTask(task)

// Finish a task with an error
const error = new Error()
queueDb.finishTask(task, error)

// Retry all failed tasks
queueDb.retry(now)
```

When it comes to using this queue, you'll want to define a set of tasks, for example:

```ts
export async function followup(environment: ServerEnvironment, args: { message: string }) {
	console.log("Running followup task: " + args.message)
}
```

Then we can created a typed interface for all of our possible tasks.

```ts
const tasks = {followup, ...}
const TasksType = typeof tasks
```

And then we can use the `enqueueApi` to give is a clean typed interface.

```ts
import { enqueueApi, EnqueueApi } from "queue/enqueue"

const enqueue: EnqueueApi<TasksType> = enqueueApi(queueDb)

const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString()
enqueue.followup({ message: "Thanks for signing up!" }, { runAt: inOneHour })
```

## QueueServer

The QueueServer will poll the QueueDatabase for tasks and execute them.

```ts
QueueServer(queueDb, environment, tasks)
```
