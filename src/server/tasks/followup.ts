/*

This Task is a template.

*/

import { ServerEnvironment } from "../ServerEnvironment"

export async function followup(environment: ServerEnvironment, args: { message: string }) {
	console.log("Running followup task: " + args.message)
}
