export type ServerConfig = {
	production: boolean
	port: number
	domain: string
	salt: Buffer
	adminUserId: string
}
