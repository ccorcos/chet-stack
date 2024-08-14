import { parseCookies } from "./cookieHelpers"

export function getCurrentUserId() {
	const cookies = parseCookies(document.cookie)
	const userId = cookies.userId?.[0]
	return userId
}
