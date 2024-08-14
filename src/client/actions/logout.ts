import { deleteCookie } from "../helpers/cookieHelpers"
import { ClientEnvironment } from "../services/ClientEnvironment"

export async function logout(environment: ClientEnvironment) {
	const { recordStorage, transactionQueue, api } = environment
	deleteCookie("userId")
	await Promise.all([recordStorage.reset(), transactionQueue.reset(), api.logout({})])
	window.location.href = "/"
}
