import { DayMs, SecondMs } from "../../shared/dateHelpers"
import { BrokenError } from "../../shared/errors"
import { randomId } from "../../shared/randomId"
import { MessageRecord, ThreadRecord } from "../../shared/schema"
import { write } from "../apis/write"
import { ServerEnvironment } from "../services/ServerEnvironment"

export async function sendWelcomeMessage(environment: ServerEnvironment, args: { userId: string }) {
	const { userId } = args
	const adminId = environment.config.adminUserId

	const user = await environment.db.getRecord({ table: "user", id: userId })
	if (!user) throw new BrokenError(`User does not exist: ${userId}`)

	const adminThreadId = randomId(adminId + userId)

	const thread: ThreadRecord = {
		id: adminThreadId,
		version: 0,
		created_by: adminId,
		member_ids: [adminId, userId],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		replied_at: new Date().toISOString(),
		subject: "Welcome!",
	}

	const message: MessageRecord = {
		id: randomId(),
		version: 0,
		author_id: adminId,
		thread_id: thread.id,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		text: `Hello ${user.username}! Welcome to paradise.`,
	}

	await write(environment, {
		txId: randomId(),
		authorId: adminId,
		operations: [
			{ type: "set", table: "thread", id: thread.id, key: [], value: thread },
			{ type: "set", table: "message", id: message.id, key: [], value: message },
		],
	})

	const delayMs = environment.config.production ? 2 * DayMs : 30 * SecondMs
	const twoDaysFromNow = new Date(Date.now() + delayMs).toISOString()
	await environment.queue.enqueue.sendFollowupMessage({ userId }, { runAt: twoDaysFromNow })
}
