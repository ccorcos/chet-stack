import { path } from "../../tools/path"

export type ServerConfig = {
	production: boolean
	port: number
	host: string
	baseUrl: string
	passwordSalt: Buffer
	signatureSecret: Buffer
	adminUserId: string
	dbPath: string
	queuePath: string
}

const production = process.env.NODE_ENV === "production"
const port = parseInt(process.env.PORT || "8080")
const host = production ? "example.com" : `localhost:${port}`
const protocol = production ? "https" : "http"
const baseUrl = `${protocol}://${host}`

const dbPath = process.env.DB_PATH || path("db/database2.sqlite")
console.log("DB_PATH", dbPath)
const queuePath = process.env.QUEUE_PATH || path("db/queue.json")

export const config: ServerConfig = {
	production,
	port,
	host,
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
