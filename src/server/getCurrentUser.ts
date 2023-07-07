import * as express from "express"
import { DatabaseApi } from "./database"

export async function getCurrentUserId(environment: { db: DatabaseApi }, req: express.Request) {
	const authTokenId = req.cookies.authToken as string | undefined
	if (!authTokenId) return

	const authToken = await environment.db.getRecord({ table: "auth_token", id: authTokenId })
	if (!authToken) return
	if (authToken.deleted) return
	if (new Date().toISOString() > authToken.expires_at) return

	return authToken.user_id
}
