export type ClientConfig = {
	host: string
}

export const clientConfig: ClientConfig = { host: "localhost:8080" }

window["__config"] = "__CLIENT_CONFIG__"
