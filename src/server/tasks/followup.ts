/*

This Task is a template.

*/

import { ServerEnvironment } from "../services/ServerEnvironment"

// This task can be enqueued and run in the background by enqueuing on the QueueDatabase.
//
// environment.queue.enqueue({
// 	id: randomId(),
// 	name: "followup",
// 	args: {message: "Hey!"},
// 	run_at: new Date().toISOString()
// })
export async function followup(environment: ServerEnvironment, args: { message: string }) {
	console.log("Running followup task: " + args.message)
}
