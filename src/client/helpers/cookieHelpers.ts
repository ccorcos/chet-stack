import { groupBy, mapValues } from "lodash"

export function parseCookies(cookie: string) {
	const entries = cookie.split(";").map((line) => line.split("=").map((p) => p.trim()))
	const grouped = groupBy(entries, (entry) => entry[0])
	const cookies = mapValues(grouped, (entries) => entries.map((entry) => entry[1]))
	return cookies
}

export function deleteCookie(cookieName: string): void {
	const domain: string = window.location.hostname
	const path: string = "/"
	document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=${path}`
}
