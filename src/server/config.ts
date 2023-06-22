import { ServerConfig } from "./ServerConfig"

export const config: ServerConfig = {
	production: false,
	port: 8080,
	domain: "localhost:8080",
	// node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))'
	salt: Buffer.from("8hrqUP5KLtWI8BmSOe9dSHti2Iz2QA2cCo0Pe3YFGhE=", "base64"),
	adminUserId: "00000000-0000-0000-0000-000000000000",
}
