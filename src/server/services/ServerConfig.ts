import { path } from "../helpers/path"

export type ServerConfig = {
	production: boolean
	port: number
	domain: string
	baseUrl: string
	passwordSalt: Buffer
	signatureSecret: Buffer
	adminUserId: string
	dbPath: string
	queuePath: string
}

const production = process.env.NODE_ENV === "production"
const port = parseInt(process.env.PORT || "8080")
const domain = production ? "example.com" : `localhost:${port}`
const protocol = production ? "https" : "http"
const baseUrl = `${protocol}://${domain}`

const dbPath = process.env.DB_PATH || path("db/data.json")
const queuePath = process.env.QUEUE_PATH || path("db/queue.json")

export const config: ServerConfig = {
	production,
	port,
	domain,
	baseUrl,
	// Used for securely storing password hases.
	// > node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
	passwordSalt: Buffer.from("8hrqUP5KLtWI8BmSOe9dSHti2Iz2QA2cCo0Pe3YFGhE=", "base64"),
	// Used for securely signing file urls.
	// > node -e 'console.log(require("crypto").randomBytes(128).toString("base64"))'
	signatureSecret: Buffer.from(
		"4BwkW2TpsYjWt5i6pg8jDt6AA6iz+UAFjSmIeCboLXfln81sud1aLu3jA3vCVdUyTsXFoHijg1RgZ2NNHMMpdO+Fvmsill+2dh8QFgvzhqqm8txmsmC9rkg9FnbIrYG9g7Nom17g/afg/bk7JHGBpEDgWsLZQ3537w81b7dP2HI=",
		"base64"
	),
	adminUserId: "00000000-0000-0000-0000-000000000000",
	dbPath,
	queuePath,
}
