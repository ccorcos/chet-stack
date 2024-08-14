import { ValidationError } from "../../shared/errors"
import { randomId } from "../../shared/randomId"
import { MessageRecord } from "../../shared/schema"
import { write } from "../apis/write"
import { ServerEnvironment } from "../services/ServerEnvironment"

export async function sendFollowupMessage(
	environment: ServerEnvironment,
	args: { userId: string }
) {
	const { userId } = args
	const adminId = environment.config.adminUserId

	const user = await environment.db.getRecord({ table: "user", id: userId })
	if (!user) throw new ValidationError(`User does not exist: ${userId}`)

	const adminThreadId = randomId(adminId + userId)

	const message: MessageRecord = {
		id: randomId(),
		version: 0,
		author_id: adminId,
		thread_id: adminThreadId,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		text: `Hey ${user.username}, just checking in. How are things going?`,
	}

	await write(environment, {
		txId: randomId(),
		authorId: adminId,
		operations: [{ type: "set", table: "message", id: message.id, key: [], value: message }],
	})
}
