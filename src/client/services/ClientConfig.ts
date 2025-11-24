export type ClientConfig = {
	production: boolean
	baseUrl: string
}

export const clientConfig = {
	production: import.meta.env.mode === "production",
}

window["__config"] = clientConfig
