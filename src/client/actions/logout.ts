import { deleteCookie } from "../helpers/cookieHelpers"
import { ClientEnvironment } from "../services/ClientEnvironment"

export async function logout(environment: ClientEnvironment) {
	deleteCookie("userId")
	window.location.href = "/"
}
